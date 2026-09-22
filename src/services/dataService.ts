import {
  Order,
  OrderStatus,
  PaymentStatus,
  DispatchStatus,
  School,
  Agent,
  Product,
  PaymentTransaction,
  DispatchRecord,
  DeliveryRecord,
  OrderDocument,
  NotificationItem,
  ActivityLog,
  AuditLog,
  OrderStatusHistoryItem,
  UserProfile,
  UserRole,
  SystemSettings,
  IssuedCredential,
  CommissionPayment,
  Material,
  Catalogue,
  Vendor,
  PurchaseOrder,
  StockMovement,
  MovementReason
} from '../types';
import {
  INITIAL_ORDERS,
  INITIAL_SCHOOLS,
  INITIAL_AGENTS,
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
  INITIAL_USERS
} from '../data/seedData';
import {
  INITIAL_MATERIALS,
  INITIAL_CATALOGUES,
  INITIAL_VENDORS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_STOCK_MOVEMENTS
} from '../data/inventorySeedData';
import { matchOrderToCatalogue, flattenBOM } from '../utils/bomCalculator';
import { db, auth, createAuthAccountForUser } from '../firebase/config';
import { sendPasswordResetEmail } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
  deleteField
} from 'firebase/firestore';

// In-memory runtime storage with localStorage backup for resilient and instantaneous user experience
const STORAGE_KEYS = {
  ORDERS: 'govschool_orders_v3',
  SCHOOLS: 'govschool_schools_v3',
  AGENTS: 'govschool_agents_v3',
  PRODUCTS: 'govschool_products_v3',
  PAYMENTS: 'govschool_payments_v3',
  DISPATCHES: 'govschool_dispatches_v3',
  DELIVERIES: 'govschool_deliveries_v3',
  DOCUMENTS: 'govschool_documents_v3',
  NOTIFICATIONS: 'govschool_notifications_v3',
  AUDIT_LOGS: 'govschool_audit_v3',
  TIMELINES: 'govschool_timelines_v3',
  SETTINGS: 'govschool_settings_v3',
  USERS: 'govschool_users_v3',
  DELETED_USERS: 'govschool_deleted_users_v3',
  PENDING_OTPS: 'govschool_pending_otps_v3',
  MATERIALS: 'govschool_materials_v3',
  CATALOGUES: 'govschool_catalogues_v3',
  VENDORS: 'govschool_vendors_v3',
  PURCHASE_ORDERS: 'govschool_purchase_orders_v3',
  STOCK_MOVEMENTS: 'govschool_stock_movements_v3'
};

// Immediately purge stale mock cache and oversized data URLs from previous sessions
function stripBloatedUrls(key: string, val: any): any {
  if (!val) return val;
  if (key === STORAGE_KEYS.ORDERS && Array.isArray(val)) {
    const urlFields = [
      'gemOrderCopyUrl',
      'cnCopyUrl',
      'podCopyUrl',
      'gemInvoiceUrl',
      'ewayBillUrl',
      'companyInvoiceUrl'
    ];
    return val.map((o: any) => {
      if (!o) return o;
      let needsStrip = false;
      for (const f of urlFields) {
        if (typeof o[f] === 'string' && o[f].length > 500) {
          needsStrip = true;
          break;
        }
      }
      if (!needsStrip) return o;
      const copy = { ...o };
      for (const f of urlFields) {
        if (typeof copy[f] === 'string' && copy[f].length > 500) {
          copy[f] = '[stored_in_cloud]';
        }
      }
      return copy;
    });
  }
  if (key === STORAGE_KEYS.DOCUMENTS && Array.isArray(val)) {
    return val.slice(0, 50).map((d: any) => {
      if (d && typeof d.fileUrl === 'string' && d.fileUrl.length > 500) {
        return { ...d, fileUrl: '[stored_in_cloud]' };
      }
      return d;
    });
  }
  if (key === STORAGE_KEYS.AUDIT_LOGS && Array.isArray(val)) {
    return val.slice(0, 40);
  }
  if (key === STORAGE_KEYS.TIMELINES && Array.isArray(val)) {
    return val.slice(0, 80);
  }
  if (key === STORAGE_KEYS.MATERIALS && Array.isArray(val)) {
    return val.map((m: any) => {
      if (m && typeof m.imageUrl === 'string' && m.imageUrl.length > 500) {
        return { ...m, imageUrl: '[stored_in_cloud]' };
      }
      return m;
    });
  }
  if (key === STORAGE_KEYS.STOCK_MOVEMENTS && Array.isArray(val)) {
    return val.slice(0, 150);
  }
  return val;
}

try {
  if (typeof window !== 'undefined' && window.localStorage) {
    // 1. Purge legacy non-v3 keys
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('govschool_') && !key.endsWith('_v3')) {
        localStorage.removeItem(key);
      }
    });

    // 2. Clean existing bloated orders cache in browser localStorage
    const existingOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (existingOrders && (existingOrders.includes('data:') || existingOrders.length > 500_000)) {
      try {
        const parsed = JSON.parse(existingOrders);
        if (Array.isArray(parsed)) {
          localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(stripBloatedUrls(STORAGE_KEYS.ORDERS, parsed)));
        } else {
          localStorage.removeItem(STORAGE_KEYS.ORDERS);
        }
      } catch (_) {
        localStorage.removeItem(STORAGE_KEYS.ORDERS);
      }
    }

    // 3. Purge volatile caches if oversized
    [STORAGE_KEYS.DOCUMENTS, STORAGE_KEYS.AUDIT_LOGS, STORAGE_KEYS.TIMELINES].forEach(k => {
      const item = localStorage.getItem(k);
      if (item && (item.includes('data:') || item.length > 200_000)) {
        localStorage.removeItem(k);
      }
    });
  }
} catch (_) {}

function loadStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Notice reading from localStorage for', key, e);
  }
  try {
    if (typeof sessionStorage !== 'undefined') {
      const sessionRaw = sessionStorage.getItem(key);
      if (sessionRaw) return JSON.parse(sessionRaw);
    }
  } catch (_) {}
  return fallback;
}

function saveStorage<T>(key: string, val: T): void {
  try {
    const compactVal = stripBloatedUrls(key, val);
    localStorage.setItem(key, JSON.stringify(compactVal));
  } catch (e: any) {
    // If quota is reached, evict volatile caches first and retry
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
        localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
        localStorage.removeItem(STORAGE_KEYS.TIMELINES);
        const compactVal = stripBloatedUrls(key, val);
        localStorage.setItem(key, JSON.stringify(compactVal));
        return;
      }
    } catch (_) {
      // Fallback to sessionStorage if localStorage is exhausted
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(key, JSON.stringify(stripBloatedUrls(key, val)));
          return;
        }
      } catch (_) {}
    }
    // Data remains safely preserved in runtime memory and synced to Firestore
    console.warn('Storage quota limit reached for', key, '- preserved in active memory.');
  }
}

// Ensure every order has an independent serial number and that orderValue is the uninflated final figure
function sanitizeOrderData(orders: Order[]): Order[] {
  return orders.map((o, idx) => {
    const finalVal = o.grossOrderValue || o.totalAmount || o.orderValue || 0;
    const taxable = Number((finalVal / 1.18).toFixed(2));
    const gst = Number((finalVal - taxable).toFixed(2));
    const isPaid = o.paymentStatus === 'PAID';
    return {
      ...o,
      serialNumber: o.serialNumber ?? (idx + 1),
      orderValue: finalVal,
      taxAmount: gst,
      grossOrderValue: finalVal,
      totalAmount: finalVal,
      amountReceived: isPaid ? finalVal : (o.amountReceived || 0),
      amountPending: isPaid ? 0 : Math.max(0, finalVal - (o.amountReceived || 0))
    };
  });
}

// Global active in-memory datasets initialized from the 121 real sheet records
let memoryOrders: Order[] = sanitizeOrderData(loadStorage(STORAGE_KEYS.ORDERS, INITIAL_ORDERS));
let memorySchools: School[] = loadStorage(STORAGE_KEYS.SCHOOLS, INITIAL_SCHOOLS);
let memoryAgents: Agent[] = loadStorage(STORAGE_KEYS.AGENTS, INITIAL_AGENTS);
let memoryProducts: Product[] = loadStorage(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
let memorySettings: SystemSettings = loadStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
let deletedUserIds: string[] = loadStorage(STORAGE_KEYS.DELETED_USERS, []);

export function normalizeMaterial(m: any): Material {
  if (!m) return m;
  const name = (m.name || m.materialName || 'Unnamed Material').toString().trim();
  const sku = (m.sku || m.materialSku || `SKU-${m.materialId || Math.floor(1000 + Math.random() * 9000)}`).toString().trim();
  const unit = (m.unit || 'Nos').toString().trim();
  return {
    materialId: m.materialId || `MAT-${Date.now().toString(36).toUpperCase()}`,
    sku,
    name,
    category: m.category?.trim() || 'General',
    description: m.description || '',
    unit,
    imageUrl: m.imageUrl || '',
    preferredVendorId: m.preferredVendorId || '',
    preferredVendorName: m.preferredVendorName || '',
    alternativeVendorIds: Array.isArray(m.alternativeVendorIds) ? m.alternativeVendorIds : [],
    purchasePrice: Number(m.purchasePrice) || 0,
    sellingPrice: Number(m.sellingPrice) || 0,
    openingInventory: Number(m.openingInventory) || 0,
    currentStock: Number(m.currentStock) || 0,
    minimumStockLevel: Number(m.minimumStockLevel) || 10,
    isActive: m.isActive !== undefined ? Boolean(m.isActive) : true,
    createdAt: m.createdAt || new Date().toISOString(),
    updatedAt: m.updatedAt || new Date().toISOString()
  };
}

export function normalizeStockMovement(m: any): StockMovement {
  if (!m) return m;
  const movType = m.movementType || m.type || 'IN';
  const movReason = m.reason || m.movementReason || 'STOCK_ADJUSTMENT';
  const time = m.timestamp || m.date || new Date().toISOString();
  const userName = m.userName || m.user || 'System Auto';
  const materialName = m.materialName || m.name || 'Component';
  return {
    ...m,
    materialName: materialName,
    movementType: movType,
    type: movType,
    reason: movReason,
    movementReason: movReason,
    timestamp: time,
    date: time,
    userName: userName,
    user: userName
  };
}

let memoryMaterials: Material[] = (loadStorage(STORAGE_KEYS.MATERIALS, INITIAL_MATERIALS) as any[]).map(normalizeMaterial);
let memoryCatalogues: Catalogue[] = loadStorage(STORAGE_KEYS.CATALOGUES, INITIAL_CATALOGUES);
let memoryVendors: Vendor[] = loadStorage(STORAGE_KEYS.VENDORS, INITIAL_VENDORS);
let memoryPurchaseOrders: PurchaseOrder[] = loadStorage(STORAGE_KEYS.PURCHASE_ORDERS, INITIAL_PURCHASE_ORDERS);
let memoryStockMovements: StockMovement[] = (loadStorage(STORAGE_KEYS.STOCK_MOVEMENTS, INITIAL_STOCK_MOVEMENTS) as any[]).map(normalizeStockMovement);

if (memoryMaterials.length === 0) {
  memoryMaterials = [...INITIAL_MATERIALS].map(normalizeMaterial);
  saveStorage(STORAGE_KEYS.MATERIALS, memoryMaterials);
} else {
  saveStorage(STORAGE_KEYS.MATERIALS, memoryMaterials);
}
if (memoryCatalogues.length === 0) {
  memoryCatalogues = [...INITIAL_CATALOGUES];
  saveStorage(STORAGE_KEYS.CATALOGUES, memoryCatalogues);
}
if (memoryVendors.length === 0) {
  memoryVendors = [...INITIAL_VENDORS];
  saveStorage(STORAGE_KEYS.VENDORS, memoryVendors);
}
if (memoryPurchaseOrders.length === 0) {
  memoryPurchaseOrders = [...INITIAL_PURCHASE_ORDERS];
  saveStorage(STORAGE_KEYS.PURCHASE_ORDERS, memoryPurchaseOrders);
}
if (memoryStockMovements.length === 0) {
  memoryStockMovements = [...INITIAL_STOCK_MOVEMENTS].map(normalizeStockMovement);
  saveStorage(STORAGE_KEYS.STOCK_MOVEMENTS, memoryStockMovements);
} else {
  // Ensure existing storage also receives normalized fields
  saveStorage(STORAGE_KEYS.STOCK_MOVEMENTS, memoryStockMovements);
}

let memoryUsers: UserProfile[] = (loadStorage(STORAGE_KEYS.USERS, INITIAL_USERS) as UserProfile[]).filter(
  u => !deletedUserIds.includes(u.userId) && !deletedUserIds.includes(u.email.toLowerCase())
);

// Synchronize memoryUsers to ensure default personnel accounts exist, UNLESS they were explicitly deleted!
INITIAL_USERS.forEach(initU => {
  if (deletedUserIds.includes(initU.userId) || deletedUserIds.includes(initU.email.toLowerCase())) {
    return; // User was explicitly deleted by Super Admin, do NOT resurrect!
  }
  const idx = memoryUsers.findIndex(u => u.email.toLowerCase() === initU.email.toLowerCase());
  if (idx === -1) {
    memoryUsers.push(initU);
  } else {
    memoryUsers[idx] = {
      ...initU,
      ...memoryUsers[idx],
      password: memoryUsers[idx].password || initU.password,
      username: memoryUsers[idx].username || initU.username,
      issuedBy: memoryUsers[idx].issuedBy || initU.issuedBy,
      issuedAt: memoryUsers[idx].issuedAt || initU.issuedAt
    };
  }
});
saveStorage(STORAGE_KEYS.USERS, memoryUsers);

// Ensure any master initial orders that are not in memoryOrders are merged in:
const existingOrderIds = new Set(memoryOrders.map(o => o.orderId));
let hasNewMasterOrders = false;
for (const initOrder of INITIAL_ORDERS) {
  if (!existingOrderIds.has(initOrder.orderId)) {
    memoryOrders.push(initOrder);
    hasNewMasterOrders = true;
  }
}
if (hasNewMasterOrders || memoryOrders.length === 0) {
  memoryOrders = sanitizeOrderData(memoryOrders).sort((a, b) => (a.serialNumber || 0) - (b.serialNumber || 0));
  saveStorage(STORAGE_KEYS.ORDERS, memoryOrders);
}
if (memorySchools.length === 0) {
  memorySchools = [...INITIAL_SCHOOLS];
  saveStorage(STORAGE_KEYS.SCHOOLS, memorySchools);
}

let memoryPayments: PaymentTransaction[] = loadStorage(STORAGE_KEYS.PAYMENTS, [
  {
    paymentId: 'PAY-001',
    orderId: 'ORD-2026-00003',
    paymentDate: '2026-08-28',
    amount: 5900,
    paymentMode: 'PFMS',
    transactionReference: 'PFMS/2026/08/998124',
    bankReference: 'SBI-KWD-4410',
    remarks: 'Full contract clearance received via State Treasury',
    createdBy: 'user_accounts',
    createdAt: '2026-08-28T16:00:00Z'
  },
  {
    paymentId: 'PAY-002',
    orderId: 'ORD-2026-00005',
    paymentDate: '2026-08-18',
    amount: 11800,
    paymentMode: 'NEFT',
    transactionReference: 'NEFT/SBIN/881726019',
    remarks: 'BSF KV account settlement',
    createdBy: 'user_accounts',
    createdAt: '2026-08-18T14:00:00Z'
  },
  {
    paymentId: 'PAY-003',
    orderId: 'ORD-2026-00006',
    paymentDate: '2026-08-18',
    amount: 11800,
    paymentMode: 'NEFT',
    transactionReference: 'NEFT/SBIN/881726020',
    remarks: 'Maths primary set settlement',
    createdBy: 'user_accounts',
    createdAt: '2026-08-18T14:10:00Z'
  },
  {
    paymentId: 'PAY-004',
    orderId: 'ORD-2026-00014',
    paymentDate: '2026-08-30',
    amount: 70000,
    paymentMode: 'RTGS',
    transactionReference: 'RTGS/PUNB/339182049',
    bankReference: 'PNB-ALG-9901',
    remarks: 'Part-payment 1 of 2 approved by principal',
    createdBy: 'user_accounts',
    createdAt: '2026-08-30T17:00:00Z'
  }
]);

let memoryDispatches: DispatchRecord[] = loadStorage(STORAGE_KEYS.DISPATCHES, [
  {
    dispatchId: 'DSP-001',
    orderId: 'ORD-2026-00001',
    dispatchDate: '2026-09-01',
    dispatchMode: 'Courier',
    courierName: 'Delhivery',
    trackingNumber: '314257981',
    numberOfBoxes: '2',
    dispatchFrom: 'Gurugram Central Warehouse',
    deliveryTo: 'JNV Wokha, Nagaland',
    expectedDeliveryDate: '2026-09-08',
    dispatchRemarks: 'Surface transport via Guwahati hub',
    createdAt: '2026-09-01T15:20:00Z'
  }
]);

let memoryDeliveries: DeliveryRecord[] = loadStorage(STORAGE_KEYS.DELIVERIES, [
  {
    deliveryId: 'DEL-001',
    orderId: 'ORD-2026-00003',
    deliveryDate: '2026-08-20',
    receivedBy: 'Shri K. L. Verma',
    receiverDesignation: 'Math Lab Incharge',
    deliveryRemarks: 'Items verified in good condition',
    createdAt: '2026-08-20T12:00:00Z'
  }
]);

let memoryDocuments: OrderDocument[] = loadStorage(STORAGE_KEYS.DOCUMENTS, [
  {
    documentId: 'DOC-001',
    orderId: 'ORD-2026-00001',
    documentType: 'Purchase Order',
    fileName: 'PO_JNV_Wokha_ATL_GEMC511687780455875.pdf',
    fileUrl: 'https://placehold.co/600x800/e2e8f0/1e293b?text=Purchase+Order+JNV+Wokha',
    fileSize: '480 KB',
    uploadedBy: 'Operations Manager',
    uploadedAt: '2026-07-22T08:35:00Z',
    visibleToAgent: true
  },
  {
    documentId: 'DOC-002',
    orderId: 'ORD-2026-00001',
    documentType: 'Invoice',
    fileName: 'GeM_Invoice_GEM78081053.pdf',
    fileUrl: 'https://placehold.co/600x800/e2e8f0/1e293b?text=GeM+Invoice+GEM78081053',
    fileSize: '320 KB',
    uploadedBy: 'Accounts Head',
    uploadedAt: '2026-08-28T10:15:00Z',
    visibleToAgent: true
  },
  {
    documentId: 'DOC-003',
    orderId: 'ORD-2026-00001',
    documentType: 'Dispatch Receipt',
    fileName: 'Delhivery_LR_314257981.pdf',
    fileUrl: 'https://placehold.co/600x800/e2e8f0/1e293b?text=Delhivery+Docket+314257981',
    fileSize: '215 KB',
    uploadedBy: 'Logistics Coordinator',
    uploadedAt: '2026-09-01T15:25:00Z',
    visibleToAgent: true
  },
  {
    documentId: 'DOC-004',
    orderId: 'ORD-2026-00001',
    documentType: 'Quotation',
    fileName: 'Internal_Costing_Margin_Sheet.pdf',
    fileUrl: 'https://placehold.co/600x800/f8fafc/0f172a?text=Internal+Costing+Confidential',
    fileSize: '145 KB',
    uploadedBy: 'Super Admin',
    uploadedAt: '2026-07-21T18:00:00Z',
    visibleToAgent: false // STRICTLY INTERNAL! Agents cannot view
  }
]);

let memoryNotifications: NotificationItem[] = loadStorage(STORAGE_KEYS.NOTIFICATIONS, [
  {
    notificationId: 'NOTIF-001',
    userId: 'user_satish_pandey',
    type: 'DISPATCH',
    title: 'Order Dispatched',
    message: 'Your order ORD-2026-00001 (JNV Wokha) has been dispatched via Delhivery (Docket: 314257981).',
    orderId: 'ORD-2026-00001',
    isRead: false,
    createdAt: '2026-09-01T15:21:00Z'
  },
  {
    notificationId: 'NOTIF-003',
    userId: 'user_manoj_sarkar',
    type: 'DISPATCH',
    title: 'Order In Transit',
    message: 'ORD-2026-00009 (KV West Karbi) is in transit via Delhivery & Speed Post.',
    orderId: 'ORD-2026-00009',
    isRead: true,
    createdAt: '2026-08-27T09:00:00Z'
  }
]);

// One-time cleanup: NOTIF-002 ("Payment Received" demo alert) used to ship
// as part of the default seed above and is already cached in localStorage
// for anyone who has opened the app before - removing it from the array
// above doesn't clear an existing browser's copy, so purge it explicitly.
if (memoryNotifications.some(n => n.notificationId === 'NOTIF-002')) {
  memoryNotifications = memoryNotifications.filter(n => n.notificationId !== 'NOTIF-002');
  saveStorage(STORAGE_KEYS.NOTIFICATIONS, memoryNotifications);
}

let memoryAuditLogs: ActivityLog[] = loadStorage(STORAGE_KEYS.AUDIT_LOGS, [
  {
    logId: 'LOG-001',
    userId: 'user_operations',
    userName: 'Operations Manager',
    action: 'ORDER_CREATED',
    entityType: 'ORDER',
    entityId: 'ORD-2026-00001',
    newValue: 'Created order for JNV Wokha (ATL Items, ₹1,00,000)',
    timestamp: '2026-07-22T08:30:00Z'
  },
  {
    logId: 'LOG-002',
    userId: 'user_dispatch',
    userName: 'Logistics Coordinator',
    action: 'DISPATCH_UPDATED',
    entityType: 'DISPATCH',
    entityId: 'ORD-2026-00001',
    previousValue: 'Status: READY_FOR_DISPATCH',
    newValue: 'Dispatched via Delhivery, Docket: 314257981, 2 boxes',
    timestamp: '2026-09-01T15:20:00Z'
  },
  {
    logId: 'LOG-003',
    userId: 'user_accounts',
    userName: 'Accounts & Billing Head',
    action: 'PAYMENT_ADDED',
    entityType: 'PAYMENT',
    entityId: 'ORD-2026-00014',
    newValue: '₹70,000 payment recorded via RTGS for KV Aligarh',
    timestamp: '2026-08-30T17:00:00Z'
  }
]);

let memoryTimelines: OrderStatusHistoryItem[] = loadStorage(STORAGE_KEYS.TIMELINES, [
  {
    historyId: 'HIST-001',
    orderId: 'ORD-2026-00001',
    previousStatus: 'PO_PENDING',
    newStatus: 'PO_RECEIVED',
    changedBy: 'user_operations',
    changedByName: 'Operations Manager',
    changedAt: '2026-07-22T08:30:00Z',
    comment: 'PO copy verified against GeM bid specification',
    visibleToAgent: true
  },
  {
    historyId: 'HIST-002',
    orderId: 'ORD-2026-00001',
    previousStatus: 'PO_RECEIVED',
    newStatus: 'PROCESSING',
    changedBy: 'user_operations',
    changedByName: 'Operations Manager',
    changedAt: '2026-08-10T11:00:00Z',
    comment: 'Components allocated from warehouse batch',
    visibleToAgent: true
  },
  {
    historyId: 'HIST-003',
    orderId: 'ORD-2026-00001',
    previousStatus: 'PROCESSING',
    newStatus: 'READY_FOR_DISPATCH',
    changedBy: 'user_operations',
    changedByName: 'Operations Manager',
    changedAt: '2026-08-28T14:00:00Z',
    comment: 'Packing list verified, 2 cartons sealed',
    visibleToAgent: true
  },
  {
    historyId: 'HIST-004',
    orderId: 'ORD-2026-00001',
    previousStatus: 'READY_FOR_DISPATCH',
    newStatus: 'DISPATCHED',
    changedBy: 'user_dispatch',
    changedByName: 'Logistics Coordinator',
    changedAt: '2026-09-01T15:20:00Z',
    comment: 'Picked up by Delhivery surface driver',
    visibleToAgent: true
  }
]);

// Recursively remove undefined values from Firestore payloads to prevent Firestore serialization errors
function cleanFirestorePayload<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanFirestorePayload) as unknown as T;
  }
  if (obj instanceof Date) {
    return obj;
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = cleanFirestorePayload(value);
    }
  }
  return cleaned as T;
}

// Helper to push to Firestore with resilient error handling
export async function syncDocToFirestore(collectionName: string, docId: string, data: any): Promise<boolean> {
  const cleaned = cleanFirestorePayload(data);
  try {
    await setDoc(doc(db, collectionName, docId), cleaned, { merge: true });
    return true;
  } catch (err: any) {
    console.warn(`Firebase Firestore write note for ${collectionName}/${docId}:`, err?.message || err);
    return false;
  }
}

// Same write, but throws instead of swallowing a failure. Used for writes
// where the caller genuinely needs to know the save didn't happen (e.g. a
// user just clicked "Upload") rather than silently reporting success while
// nothing was actually persisted - which is exactly what let an oversized
// attached file (over Firestore's 1 MiB/document limit) look like it saved
// right up until the next refresh revealed it never had.
async function syncDocToFirestoreOrThrow(collectionName: string, docId: string, data: any): Promise<void> {
  const ok = await syncDocToFirestore(collectionName, docId, data);
  if (!ok) {
    throw new Error(
      'Could not save to the database. This usually happens when an attached file is too large, or from a connection issue - please try again with a smaller file.'
    );
  }
}

export async function deleteDocFromFirestore(collectionName: string, docId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, collectionName, docId));
    return true;
  } catch (err: any) {
    console.warn(`Firebase Firestore delete note for ${collectionName}/${docId}:`, err?.message || err);
    return false;
  }
}

// initializeFirestoreSeed() and syncAllDataToFirestore() USED to live here -
// a one-time bootstrap that pushed the hardcoded REAL_SHEET_ORDERS/SCHOOLS/
// etc. seed arrays to Firestore the very first time the app ever ran
// against an empty database. It decided "empty" by running a `limit(1)`
// query against `orders` - but that query is subject to Firestore security
// rules, and an AGENT account's reads are scoped to only orders matching
// their own agentId. A brand new agent with zero orders assigned therefore
// saw that query come back empty regardless of how much real data existed,
// and the seed path then merge-wrote the entire original hardcoded dataset
// back over every live order, school, agent, product and user document -
// silently reverting real statuses, dispatch/tracking info, payments and
// school links to their original import-time values. That is exactly what
// happened on a new agent's first login on 2026-09-18, and took a full
// investigation to find and repair.
//
// The database has been live and populated for a long time now; there is
// no legitimate scenario left where re-seeding from the hardcoded arrays
// should ever run again. Both functions are removed outright (not merely
// disconnected) so there is nothing left for a future change to
// accidentally call back in.

// Clear all orders completely from memory and storage (ready for fresh upload)
export async function clearAllOrders(user: UserProfile): Promise<{ success: boolean; clearedCount: number }> {
  if (user.role === 'AGENT') throw new Error('Unauthorized');
  const count = memoryOrders.length;
  memoryOrders = [];
  saveStorage(STORAGE_KEYS.ORDERS, memoryOrders);

  await writeActivityLog({
    userId: user.userId,
    userName: user.name,
    action: 'CLEAR_ORDERS',
    entityType: 'ORDER',
    entityId: 'ALL',
    newValue: `Completely cleared ${count} past orders from workspace`
  });

  return { success: true, clearedCount: count };
}


// ----------------------------------------------------
// FILTER & SEARCH INTERFACES
// ----------------------------------------------------
export interface OrderFilterOptions {
  search?: string;
  agentId?: string;
  schoolId?: string;
  schoolType?: string;
  category?: string;
  status?: OrderStatus | 'ALL';
  paymentStatus?: PaymentStatus | 'ALL';
  dispatchStatus?: DispatchStatus | 'ALL';
  financialYear?: string;
  dateFrom?: string;
  dateTo?: string;
  onlyOverdueDelivery?: boolean;
  onlyOverduePayment?: boolean;
}

// Real-time automatic listener for orders from Cloud Firestore
export function subscribeToRealtimeOrders(
  user: UserProfile,
  onUpdate: (orders: Order[]) => void
): () => void {
  // Emit current memory orders immediately sorted by serialNumber ascending
  const initial = memoryOrders
    .filter(o => !o.isDeleted)
    .sort((a, b) => (a.serialNumber || 0) - (b.serialNumber || 0));

  if (user.role === 'AGENT') {
    onUpdate(initial.filter(o => o.agentId === user.agentId));
  } else {
    onUpdate(initial);
  }

  try {
    // Firestore rejects an unfiltered "list everything" query outright for an
    // Agent session - the security rule depends on each document's agentId
    // field, and Firestore can only permit a *query* (as opposed to a single-
    // document read) when it can statically prove every possible result
    // satisfies the rule. A collection-wide listen with no where() clause
    // can't be proven safe that way, so it was failing with PERMISSION_DENIED
    // for every agent, every time - meaning agents never received live data
    // at all and were silently stuck on whatever was in their local cache
    // from before this listener was ever added, refresh or not.
    const ordersQuery = user.role === 'AGENT'
      ? query(collection(db, 'orders'), where('agentId', '==', user.agentId))
      : collection(db, 'orders');

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const remoteList: Order[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Order;
          if (data && data.orderId) {
            remoteList.push(data);
          }
        });

        if (user.role === 'AGENT') {
          // This snapshot is already scoped to just this agent's orders, so
          // it's not the full collection - only update their own visible
          // slice, don't touch the shared memoryOrders cache used elsewhere.
          const active = sanitizeOrderData(remoteList)
            .filter(o => !o.isDeleted)
            .sort((a, b) => (a.serialNumber || 0) - (b.serialNumber || 0));
          onUpdate(active);
          return;
        }

        // Unfiltered query - this IS the full current server-side collection
        // on every change, so replace (not merge into) the local cache;
        // merging only ever added/updated entries and never dropped ones
        // removed remotely, so a deleted order kept reappearing in every
        // other browser's local cache even after it was actually gone.
        memoryOrders = sanitizeOrderData(remoteList)
          .sort((a, b) => (a.serialNumber || 0) - (b.serialNumber || 0));
        saveStorage(STORAGE_KEYS.ORDERS, memoryOrders);

        const active = memoryOrders
          .filter(o => !o.isDeleted)
          .sort((a, b) => (a.serialNumber || 0) - (b.serialNumber || 0));
        onUpdate(active);
      },
      (err) => {
        console.warn('Real-time Firestore listener notice:', err);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Could not establish real-time snapshot listener, using active local sync:', err);
    return () => {};
  }
}

// ----------------------------------------------------
// ORDERS SERVICE
// ----------------------------------------------------
export async function getOrders(user: UserProfile, filters?: OrderFilterOptions): Promise<Order[]> {
  let list: Order[];

  if (user.role === 'AGENT') {
    // An unfiltered read of the whole collection is rejected outright by
    // Firestore for an Agent session - the security rule depends on each
    // document's agentId field, and a query with no matching where() clause
    // can't be proven safe against it (unlike a single-document read). This
    // scopes the query itself to just this agent's orders, which Firestore
    // can validate and allow.
    try {
      const agentQuery = query(collection(db, 'orders'), where('agentId', '==', user.agentId));
      const snap = await getDocs(agentQuery);
      const remoteOrders: Order[] = [];
      snap.forEach(d => {
        const data = d.data() as Order;
        if (data && data.orderId) {
          remoteOrders.push(data);
        }
      });
      list = sanitizeOrderData(remoteOrders)
        .filter(o => !o.isDeleted)
        .sort((a, b) => (a.serialNumber || 0) - (b.serialNumber || 0));
    } catch (err) {
      console.warn('Firestore read in getOrders (agent) fallback to cached orders:', err);
      list = memoryOrders
        .filter(o => !o.isDeleted && o.agentId === user.agentId)
        .sort((a, b) => (a.serialNumber || 0) - (b.serialNumber || 0));
    }
  } else {
    // Sync latest order records from Firestore so Super Admin and Admin always view fresh data.
    // This is an unfiltered read of the whole collection, so the result is the complete,
    // authoritative current state - replace the local cache with it rather than merging,
    // otherwise orders deleted remotely would keep reappearing from stale local data.
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const remoteOrders: Order[] = [];
      snap.forEach(d => {
        const data = d.data() as Order;
        if (data && data.orderId) {
          remoteOrders.push(data);
        }
      });
      memoryOrders = sanitizeOrderData(remoteOrders)
        .sort((a, b) => (a.serialNumber || 0) - (b.serialNumber || 0));
      saveStorage(STORAGE_KEYS.ORDERS, memoryOrders);
    } catch (err) {
      console.warn('Firestore read in getOrders fallback to cached orders:', err);
    }

    list = [...memoryOrders]
      .filter(o => !o.isDeleted)
      .sort((a, b) => (a.serialNumber || 0) - (b.serialNumber || 0));
  }

  if (!filters) return list;

  // Search across multiple attributes
  if (filters.search && filters.search.trim() !== '') {
    const q = filters.search.toLowerCase().trim();
    list = list.filter(o => {
      return (
        o.orderId.toLowerCase().includes(q) ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.schoolName.toLowerCase().includes(q) ||
        (o.schoolCode && o.schoolCode.toLowerCase().includes(q)) ||
        o.agentName.toLowerCase().includes(q) ||
        o.category.toLowerCase().includes(q) ||
        (o.purchaseOrderNumber && o.purchaseOrderNumber.toLowerCase().includes(q)) ||
        (o.invoiceNumber && o.invoiceNumber.toLowerCase().includes(q)) ||
        (o.docketNumber && o.docketNumber.toLowerCase().includes(q)) ||
        (o.courierName && o.courierName.toLowerCase().includes(q))
      );
    });
  }

  if (filters.agentId && filters.agentId !== 'ALL' && user.role !== 'AGENT') {
    list = list.filter(o => o.agentId === filters.agentId);
  }

  if (filters.schoolId && filters.schoolId !== 'ALL') {
    list = list.filter(o => o.schoolId === filters.schoolId);
  }

  if (filters.schoolType && filters.schoolType !== 'ALL') {
    list = list.filter(o => o.schoolType === filters.schoolType);
  }

  if (filters.category && filters.category !== 'ALL') {
    list = list.filter(o => o.category === filters.category);
  }

  if (filters.status && filters.status !== 'ALL') {
    list = list.filter(o => o.status === filters.status);
  }

  if (filters.paymentStatus && filters.paymentStatus !== 'ALL') {
    list = list.filter(o => o.paymentStatus === filters.paymentStatus);
  }

  if (filters.dispatchStatus && filters.dispatchStatus !== 'ALL') {
    list = list.filter(o => o.dispatchStatus === filters.dispatchStatus);
  }

  if (filters.financialYear && filters.financialYear !== 'ALL') {
    list = list.filter(o => o.financialYear === filters.financialYear);
  }

  if (filters.dateFrom) {
    list = list.filter(o => o.orderDate >= filters.dateFrom!);
  }

  if (filters.dateTo) {
    list = list.filter(o => o.orderDate <= filters.dateTo!);
  }

  const todayStr = new Date().toISOString().split('T')[0];

  if (filters.onlyOverdueDelivery) {
    list = list.filter(o => {
      return (
        o.expectedDeliveryDate &&
        o.expectedDeliveryDate < todayStr &&
        o.deliveryStatus !== 'Delivered' &&
        o.status !== 'DELIVERED' &&
        o.status !== 'CLOSED' &&
        o.status !== 'CANCELLED'
      );
    });
  }

  if (filters.onlyOverduePayment) {
    list = list.filter(o => {
      return (
        o.expectedPaymentDate &&
        o.expectedPaymentDate < todayStr &&
        o.paymentStatus !== 'PAID' &&
        o.status !== 'CANCELLED'
      );
    });
  }

  return list;
}

export async function getOrderById(orderId: string, user: UserProfile): Promise<Order | null> {
  const order = memoryOrders.find(o => o.orderId === orderId);
  if (!order || order.isDeleted) return null;

  // STRICT AGENT ISOLATION:
  if (user.role === 'AGENT' && order.agentId !== user.agentId) {
    throw new Error('Unauthorized: You do not have permission to view this order.');
  }

  return order;
}

export async function checkPotentialDuplicateOrder(
  schoolName: string,
  purchaseOrderNumber: string,
  orderNumber?: string,
  excludeOrderId?: string
): Promise<Order | null> {
  const cleanPO = purchaseOrderNumber?.toLowerCase().trim();
  const cleanOrderNum = orderNumber?.toLowerCase().trim();

  const match = memoryOrders.find(o => {
    if (excludeOrderId && o.orderId === excludeOrderId) return false;
    if (o.isDeleted) return false;

    // Check duplicate orderNumber
    if (cleanOrderNum && o.orderNumber && o.orderNumber.toLowerCase().trim() === cleanOrderNum) {
      return true;
    }

    // Check duplicate purchaseOrderNumber (GeM PO)
    if (cleanPO && o.purchaseOrderNumber && o.purchaseOrderNumber.toLowerCase().trim() === cleanPO) {
      return true;
    }

    // Check same school + same PO if PO is specified
    if (cleanPO && schoolName) {
      const samePO = o.purchaseOrderNumber?.toLowerCase().trim() === cleanPO;
      const sameSchool = o.schoolName?.toLowerCase().trim() === schoolName.toLowerCase().trim();
      if (samePO && sameSchool) return true;
    }

    return false;
  });
  return match || null;
}

export async function createOrder(
  orderInput: Omit<Order, 'orderId' | 'createdAt' | 'updatedAt' | 'createdBy'>,
  user: UserProfile
): Promise<Order> {
  if (user.role === 'AGENT') {
    throw new Error('Partners cannot create orders directly. Please contact operations.');
  }

  // Calculate highest existing serial number reliably
  const maxSerial = memoryOrders.reduce((max, o) => {
    const num = typeof o.serialNumber === 'number' ? o.serialNumber : parseInt(String(o.serialNumber), 10);
    return Math.max(max, isNaN(num) ? 0 : num);
  }, 0);
  const serialNumber = maxSerial + 1;

  const currentCount = memoryOrders.length + 1;
  const orderIdNumber = Math.max(currentCount, serialNumber);
  let orderId = `${memorySettings.orderIdPrefix || 'ORD-2026'}-${String(orderIdNumber).padStart(5, '0')}`;
  let collisionCounter = 1;
  while (memoryOrders.some(o => o.orderId === orderId)) {
    orderId = `${memorySettings.orderIdPrefix || 'ORD-2026'}-${String(orderIdNumber + collisionCounter).padStart(5, '0')}`;
    collisionCounter++;
  }

  const now = new Date().toISOString();
  const finalVal = orderInput.orderValue || 0;
  const isPaid = orderInput.paymentStatus === 'PAID';

  const newOrder: Order = {
    ...orderInput,
    serialNumber,
    orderId,
    orderValue: finalVal,
    taxAmount: 0,
    grossOrderValue: finalVal,
    totalAmount: finalVal,
    amountReceived: isPaid ? finalVal : (orderInput.amountReceived || 0),
    amountPending: isPaid ? 0 : Math.max(0, finalVal - (orderInput.amountReceived || 0)),
    createdAt: now,
    updatedAt: now,
    createdBy: user.userId,
    createdByName: user.name,
    isArchived: false,
    isDeleted: false
  };

  // Maintain ascending order of serialNumber and persist immediately
  memoryOrders = [...memoryOrders, newOrder].sort((a, b) => (a.serialNumber || 0) - (b.serialNumber || 0));
  saveStorage(STORAGE_KEYS.ORDERS, memoryOrders);

  // Sync to Firestore in background without blocking order creation
  syncDocToFirestore('orders', orderId, newOrder).catch(err => {
    console.warn(`Firestore sync note for ${orderId}:`, err);
  });

  // Initial timeline entry
  const timelineItem: OrderStatusHistoryItem = {
    historyId: `HIST-${Date.now()}`,
    orderId,
    previousStatus: 'PO_PENDING',
    newStatus: newOrder.status,
    changedBy: user.userId,
    changedByName: user.name,
    changedAt: now,
    comment: `Order initiated by ${user.name}`,
    visibleToAgent: true
  };
  await addTimelineEntry(timelineItem);

  // Activity audit log
  await writeActivityLog({
    userId: user.userId,
    userName: user.name,
    action: 'ORDER_CREATED',
    entityType: 'ORDER',
    entityId: orderId,
    newValue: `Created order for ${newOrder.schoolName}, value ₹${newOrder.orderValue.toLocaleString('en-IN')}`
  });

  // Notify agent if assigned
  if (newOrder.agentId && newOrder.agentId !== 'AGT-DIRECT') {
    const agent = memoryAgents.find(a => a.agentId === newOrder.agentId);
    if (agent && agent.userId) {
      await createNotification({
        userId: agent.userId,
        type: 'ORDER_STATUS',
        title: 'New Order Assigned',
        message: `Order ${orderId} (${newOrder.schoolName} - ₹${newOrder.orderValue.toLocaleString('en-IN')}) has been registered and assigned to you.`,
        orderId
      });
    }
  }

  return newOrder;
}

export async function updateOrder(
  orderId: string,
  updates: Partial<Order>,
  user: UserProfile
): Promise<Order> {
  const idx = memoryOrders.findIndex(o => o.orderId === orderId);
  if (idx === -1) throw new Error('Order not found');

  const existing = memoryOrders[idx];
  if (user.role === 'AGENT') {
    throw new Error('Partners cannot modify order fields.');
  }

  const now = new Date().toISOString();
  const finalVal = updates.orderValue !== undefined ? updates.orderValue : existing.orderValue;
  const isPaid = (updates.paymentStatus || existing.paymentStatus) === 'PAID';

  const updated: Order = {
    ...existing,
    ...updates,
    serialNumber: existing.serialNumber ?? (idx + 1),
    orderValue: finalVal,
    taxAmount: 0,
    grossOrderValue: finalVal,
    totalAmount: finalVal,
    amountPending: isPaid ? 0 : (updates.amountPending !== undefined ? updates.amountPending : existing.amountPending),
    updatedAt: now,
    updatedBy: user.name
  };

  memoryOrders[idx] = updated;
  memoryOrders.sort((a, b) => (a.serialNumber || 0) - (b.serialNumber || 0));
  saveStorage(STORAGE_KEYS.ORDERS, memoryOrders);

  // Wait for the Firestore write to actually land before returning. Callers
  // (e.g. OrderDetailModal's edit-and-save handlers) commonly call
  // onOrderUpdated() right after this resolves, which triggers a fresh
  // Firestore read (refreshData -> getOrders). If this write were still
  // in flight when that read fires, the read could return the pre-edit
  // value and stomp the UI right back to it - which is exactly why an edit
  // could appear to "not save" despite genuinely succeeding moments later.
  //
  // This throws (rather than swallowing a failure) deliberately: every
  // caller already wraps this in try/catch with a user-facing alert(), so a
  // genuine failure (most commonly an attached document pushing the order
  // over Firestore's 1 MiB/document size limit) is now actually reported
  // instead of silently discarded - which previously looked identical to a
  // successful save right up until the next page refresh undid it.
  // Write only the fields this call actually changes (plus the derived
  // financial figures/updatedAt this function always recomputes) - NOT the
  // full `updated` object spread from this browser's local `existing`
  // cache. A full-object write meant that any edit made from a tab whose
  // cache predated some other fix (e.g. a school repointed via a direct
  // database correction) would silently drag every one of that tab's other,
  // untouched-but-stale fields back onto the live document along with it -
  // exactly how a corrected schoolId got silently reverted to its old value
  // by an unrelated later edit. Fields never included in `updates` now stay
  // completely untouched in Firestore, however stale this tab's own copy of
  // them is.
  const firestoreUpdates: Partial<Order> = {
    ...updates,
    updatedAt: now,
    updatedBy: user.name
  };
  // Only send orderValue/taxAmount/grossOrderValue/totalAmount when this
  // call actually changes orderValue. Sending them unconditionally on every
  // update (even payment-only edits that never touch orderValue) meant a
  // role restricted to a narrow field allow-list in firestore.rules - like
  // Accounts, who may only touch payment-related fields on an order - had
  // its entire write rejected the moment this browser's cached orderValue
  // no longer matched the live document (e.g. after a direct DB correction
  // elsewhere), since Firestore then saw orderValue/totalAmount as genuinely
  // changed fields outside that role's allowed set. Admin/Ops writes were
  // never affected, since their rule has no such allow-list to violate -
  // which is exactly why this only ever broke for non-admin roles.
  if (updates.orderValue !== undefined) {
    firestoreUpdates.orderValue = finalVal;
    firestoreUpdates.taxAmount = 0;
    firestoreUpdates.grossOrderValue = finalVal;
    firestoreUpdates.totalAmount = finalVal;
  }
  // Same reasoning for amountPending: only send it when this call actually
  // affects it (a direct amountPending update, or a paymentStatus/orderValue
  // change that forces it to be recomputed). A pure status/dispatch-only
  // update (e.g. Dispatch marking Delivered, or Accounts/Dispatch advancing
  // the lifecycle stage) never touches amountPending, and neither role has
  // it on their firestore.rules allow-list - so including it unconditionally
  // risked rejecting those writes too, the exact same way orderValue did.
  if (updates.amountPending !== undefined || updates.paymentStatus !== undefined || updates.orderValue !== undefined) {
    firestoreUpdates.amountPending = updated.amountPending;
  }
  await syncDocToFirestoreOrThrow('orders', orderId, firestoreUpdates);

  // If agent assignment changed, record specific audit log
  if (updates.agentId && updates.agentId !== existing.agentId) {
    await writeActivityLog({
      userId: user.userId,
      userName: user.name,
      action: 'AGENT_REASSIGNED',
      entityType: 'ORDER',
      entityId: orderId,
      previousValue: `Partner: ${existing.agentName} (${existing.agentId})`,
      newValue: `Partner: ${updated.agentName} (${updated.agentId})`
    });

    // Notify newly assigned agent
    const newAgent = memoryAgents.find(a => a.agentId === updates.agentId);
    if (newAgent && newAgent.userId) {
      await createNotification({
        userId: newAgent.userId,
        type: 'ORDER_STATUS',
        title: 'Order Reassigned to You',
        message: `Order ${orderId} (${updated.schoolName}) has been reassigned to you.`,
        orderId
      });
    }
  } else {
    await writeActivityLog({
      userId: user.userId,
      userName: user.name,
      action: 'ORDER_UPDATED',
      entityType: 'ORDER',
      entityId: orderId,
      newValue: `Updated details for ${orderId}`
    });
  }

  return updated;
}

// ----------------------------------------------------
// DEDICATED SCHOOL CONTACT DETAILS UPDATE
// ----------------------------------------------------
export async function updateOrderSchoolDetails(
  orderId: string,
  schoolDetails: {
    schoolName: string;
    phone: string;
    address: string;
    schoolType?: string;
    state?: string;
    district?: string;
    schoolCode?: string;
    email?: string;
    pincode?: string;
  },
  user: UserProfile
): Promise<{ order: Order; school?: School }> {
  if (user.role === 'AGENT') {
    throw new Error('Unauthorized: Field agents cannot edit school contact details.');
  }

  const orderIdx = memoryOrders.findIndex(o => o.orderId === orderId);
  if (orderIdx === -1) {
    throw new Error(`Order ${orderId} not found`);
  }

  const targetOrder = memoryOrders[orderIdx];
  const now = new Date().toISOString();
  const trimmedName = schoolDetails.schoolName.trim();
  const trimmedPhone = schoolDetails.phone.trim();
  const trimmedAddress = schoolDetails.address.trim();
  const trimmedSchoolType = schoolDetails.schoolType?.trim() || targetOrder.schoolType;
  const trimmedState = schoolDetails.state?.trim() ?? targetOrder.state;
  const trimmedDistrict = schoolDetails.district?.trim() ?? targetOrder.district;
  const trimmedSchoolCode = schoolDetails.schoolCode?.trim() ?? targetOrder.schoolCode;
  const trimmedEmail = schoolDetails.email?.trim() ?? targetOrder.schoolEmail;
  const trimmedPincode = schoolDetails.pincode?.trim() ?? targetOrder.schoolPincode;

  // Find existing school in master registry
  let schoolIdx = memorySchools.findIndex(s => s.schoolId === targetOrder.schoolId);
  if (schoolIdx === -1 && targetOrder.schoolName) {
    schoolIdx = memorySchools.findIndex(
      s => s.schoolName.toLowerCase().trim() === targetOrder.schoolName.toLowerCase().trim()
    );
  }

  let updatedSchool: School | undefined;

  if (schoolIdx !== -1) {
    // Update existing master school record
    const existingSchool = memorySchools[schoolIdx];
    updatedSchool = {
      ...existingSchool,
      schoolName: trimmedName,
      phone: trimmedPhone,
      contactPhone: trimmedPhone,
      address: trimmedAddress,
      schoolType: (trimmedSchoolType as any) || existingSchool.schoolType,
      state: trimmedState || existingSchool.state,
      district: trimmedDistrict ?? existingSchool.district,
      schoolCode: trimmedSchoolCode ?? existingSchool.schoolCode,
      email: trimmedEmail ?? existingSchool.email,
      pinCode: trimmedPincode ?? existingSchool.pinCode,
      updatedAt: now
    };
    memorySchools[schoolIdx] = updatedSchool;
    saveStorage(STORAGE_KEYS.SCHOOLS, memorySchools);
    await syncDocToFirestore('schools', existingSchool.schoolId, updatedSchool);
  } else {
    // Register matching school in master structure without creating duplicate
    // Same collision-safe ID generation as createSchool() - a raw count-
    // based ID (the old `SCH-${memorySchools.length + 1}` here) could land
    // on a number already used by an existing school and silently overwrite
    // it via the merge write below, exactly like the incident that fix
    // addressed.
    let newSchoolId = targetOrder.schoolId;
    if (!newSchoolId) {
      const existingSchoolIds = new Set(memorySchools.map(s => s.schoolId));
      const maxNumericId = memorySchools.reduce((max, s) => {
        const match = /^SCH-(\d+)$/.exec(s.schoolId);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);
      newSchoolId = `SCH-${String(maxNumericId + 1).padStart(3, '0')}`;
      let collisionCounter = 1;
      while (existingSchoolIds.has(newSchoolId)) {
        newSchoolId = `SCH-${String(maxNumericId + 1 + collisionCounter).padStart(3, '0')}`;
        collisionCounter++;
      }
    }
    updatedSchool = {
      schoolId: newSchoolId,
      schoolName: trimmedName,
      schoolType: (trimmedSchoolType as any) || 'Government School',
      phone: trimmedPhone,
      contactPhone: trimmedPhone,
      address: trimmedAddress,
      state: trimmedState || 'India',
      district: trimmedDistrict || '',
      schoolCode: trimmedSchoolCode,
      email: trimmedEmail || '',
      pinCode: trimmedPincode || '',
      createdAt: now,
      updatedAt: now
    };
    memorySchools.push(updatedSchool);
    saveStorage(STORAGE_KEYS.SCHOOLS, memorySchools);
    await syncDocToFirestore('schools', newSchoolId, updatedSchool);
  }

  // Update target order with new school details
  const updatedOrder: Order = {
    ...targetOrder,
    schoolName: trimmedName,
    schoolContactPhone: trimmedPhone,
    schoolAddress: trimmedAddress,
    schoolType: (trimmedSchoolType as any) || targetOrder.schoolType,
    state: trimmedState,
    district: trimmedDistrict,
    schoolCode: trimmedSchoolCode,
    schoolEmail: trimmedEmail,
    schoolPincode: trimmedPincode,
    schoolId: updatedSchool ? updatedSchool.schoolId : targetOrder.schoolId,
    updatedAt: now,
    updatedBy: user.name
  };

  memoryOrders[orderIdx] = updatedOrder;

  // Also sync any other orders linked to the exact same school. Queried
  // directly from Firestore rather than only mapped over this browser's
  // local memoryOrders cache - same reasoning as updateSchool()'s reverse
  // sync: a stale/incomplete local cache would silently skip a sibling
  // order that genuinely needed this update.
  let siblingOrderIds: string[] = [];
  if (updatedSchool) {
    try {
      const siblingSnap = await getDocs(query(collection(db, 'orders'), where('schoolId', '==', updatedSchool.schoolId)));
      siblingSnap.forEach(d => {
        if (d.id !== orderId) siblingOrderIds.push(d.id);
      });
    } catch (err) {
      console.warn(`Could not query live sibling orders for school ${updatedSchool.schoolId}:`, err);
    }
    // Also catch any order only matched by school name (e.g. missing a
    // schoolId), the same fallback the old local-only check used.
    memoryOrders.forEach(o => {
      if (
        o.orderId !== orderId &&
        !siblingOrderIds.includes(o.orderId) &&
        targetOrder.schoolName &&
        o.schoolName.toLowerCase().trim() === targetOrder.schoolName.toLowerCase().trim()
      ) {
        siblingOrderIds.push(o.orderId);
      }
    });
    memoryOrders = memoryOrders.map(o => {
      if (siblingOrderIds.includes(o.orderId)) {
        return {
          ...o,
          schoolName: trimmedName,
          schoolContactPhone: trimmedPhone,
          schoolAddress: trimmedAddress,
          schoolEmail: trimmedEmail,
          schoolPincode: trimmedPincode,
          updatedAt: now
        };
      }
      return o;
    });
  }

  saveStorage(STORAGE_KEYS.ORDERS, memoryOrders);

  // Write only the fields this call actually changes, not the full
  // `updatedOrder`/sibling objects spread from this browser's local cache -
  // same fix and same reasoning as updateOrder(): any other field in that
  // cache which happens to be stale (e.g. a schoolId corrected elsewhere by
  // a direct database fix since this tab last loaded) must never get
  // silently dragged back onto the live document by an unrelated edit here.
  //
  // Wait for the write to land before returning - see the matching comment
  // in updateOrder() for why this avoids the immediately-following refresh
  // reading a stale pre-edit value back.
  const targetOrderFirestoreUpdates: Partial<Order> = {
    schoolName: trimmedName,
    schoolContactPhone: trimmedPhone,
    schoolAddress: trimmedAddress,
    schoolType: updatedOrder.schoolType,
    state: trimmedState,
    district: trimmedDistrict,
    schoolCode: trimmedSchoolCode,
    schoolEmail: trimmedEmail,
    schoolPincode: trimmedPincode,
    schoolId: updatedOrder.schoolId,
    updatedAt: now,
    updatedBy: user.name
  };
  try {
    await syncDocToFirestore('orders', orderId, targetOrderFirestoreUpdates);
  } catch (err) {
    console.warn(`Firestore sync note for ${orderId}:`, err);
  }

  // Sibling orders were only ever updated in local memory above and never
  // actually pushed to Firestore, so anyone opening one of them from a
  // different browser/account kept seeing the old phone/address - push
  // each one now too.
  if (siblingOrderIds.length > 0) {
    const siblingFirestoreUpdates: Partial<Order> = {
      schoolName: trimmedName,
      schoolContactPhone: trimmedPhone,
      schoolAddress: trimmedAddress,
      schoolEmail: trimmedEmail,
      schoolPincode: trimmedPincode,
      updatedAt: now
    };
    await Promise.all(
      siblingOrderIds.map(sid =>
        syncDocToFirestore('orders', sid, siblingFirestoreUpdates).catch(err =>
          console.warn(`Firestore sync note for sibling order ${sid}:`, err)
        )
      )
    );
  }

  await writeActivityLog({
    userId: user.userId,
    userName: user.name,
    action: 'SCHOOL_UPDATED',
    entityType: 'ORDER',
    entityId: orderId,
    newValue: `Updated school contact details for "${trimmedName}" (Phone: ${trimmedPhone || 'N/A'}, Address: ${trimmedAddress || 'N/A'})`
  });

  return { order: updatedOrder, school: updatedSchool };
}

// ----------------------------------------------------
// RELINK AN ORDER TO A DIFFERENT (EXISTING) SCHOOL
// ----------------------------------------------------
// Deliberately separate from updateOrderSchoolDetails() above: that function
// treats any edit as "correct this school's own contact details", and
// propagates it to the school's master record plus every other order
// sharing its schoolId - exactly right for fixing a typo, but wrong for
// moving one mis-linked order onto a different school (it would rename the
// newly-picked school to match, and/or drag its other orders' names along
// too). This only ever touches the one order being edited: its schoolId and
// denormalized copy of that school's details, nothing else.
export async function relinkOrderToSchool(
  orderId: string,
  newSchoolId: string,
  user: UserProfile
): Promise<Order> {
  if (user.role === 'AGENT') {
    throw new Error('Unauthorized: Field agents cannot relink an order to a different school.');
  }

  const orderIdx = memoryOrders.findIndex(o => o.orderId === orderId);
  if (orderIdx === -1) {
    throw new Error(`Order ${orderId} not found`);
  }
  const targetSchool = memorySchools.find(s => s.schoolId === newSchoolId);
  if (!targetSchool) {
    throw new Error(`School ${newSchoolId} not found`);
  }

  const targetOrder = memoryOrders[orderIdx];
  const now = new Date().toISOString();
  const previousSchoolLabel = `${targetOrder.schoolName} (${targetOrder.schoolId})`;
  const newSchoolLabel = `${targetSchool.schoolName} (${targetSchool.schoolId})`;

  const updatedOrder: Order = {
    ...targetOrder,
    schoolId: targetSchool.schoolId,
    schoolName: targetSchool.schoolName,
    schoolContactPhone: targetSchool.phone || targetSchool.contactPhone || '',
    schoolAddress: targetSchool.address || '',
    schoolType: targetSchool.schoolType,
    state: targetSchool.state,
    district: targetSchool.district,
    schoolCode: targetSchool.schoolCode,
    schoolEmail: targetSchool.email,
    schoolPincode: targetSchool.pinCode || targetSchool.pincode,
    updatedAt: now,
    updatedBy: user.name
  };
  memoryOrders[orderIdx] = updatedOrder;
  saveStorage(STORAGE_KEYS.ORDERS, memoryOrders);

  await syncDocToFirestoreOrThrow('orders', orderId, {
    schoolId: updatedOrder.schoolId,
    schoolName: updatedOrder.schoolName,
    schoolContactPhone: updatedOrder.schoolContactPhone,
    schoolAddress: updatedOrder.schoolAddress,
    schoolType: updatedOrder.schoolType,
    state: updatedOrder.state,
    district: updatedOrder.district,
    schoolCode: updatedOrder.schoolCode,
    schoolEmail: updatedOrder.schoolEmail,
    schoolPincode: updatedOrder.schoolPincode,
    updatedAt: now,
    updatedBy: user.name
  });

  await writeActivityLog({
    userId: user.userId,
    userName: user.name,
    action: 'ORDER_SCHOOL_RELINKED',
    entityType: 'ORDER',
    entityId: orderId,
    previousValue: previousSchoolLabel,
    newValue: newSchoolLabel
  });

  return updatedOrder;
}

// ----------------------------------------------------
// DEDICATED INDIVIDUAL AGENT ASSIGNMENT UPDATE
// ----------------------------------------------------
export async function updateOrderAgent(
  orderId: string,
  newAgentId: string,
  user: UserProfile
): Promise<Order> {
  if (user.role === 'AGENT') {
    throw new Error('Unauthorized: Field agents cannot reassign order agents.');
  }

  const orderIdx = memoryOrders.findIndex(o => o.orderId === orderId);
  if (orderIdx === -1) {
    throw new Error(`Order ${orderId} not found`);
  }

  const targetOrder = memoryOrders[orderIdx];
  const now = new Date().toISOString();

  // Find agent info
  let agentName = 'In-House / Direct';
  let agentCode = 'AGT-DIRECT';
  let commissionRate = targetOrder.agentCommissionPercentage;

  if (newAgentId && newAgentId !== 'AGT-DIRECT') {
    const foundAgent = memoryAgents.find(a => a.agentId === newAgentId || a.agentCode === newAgentId);
    if (foundAgent) {
      agentName = foundAgent.name;
      agentCode = foundAgent.agentCode || foundAgent.agentId;
      if (foundAgent.commissionPercentage !== undefined || foundAgent.commissionRate !== undefined) {
        commissionRate = foundAgent.commissionPercentage ?? foundAgent.commissionRate;
      }
    } else {
      agentName = newAgentId;
      agentCode = newAgentId;
    }
  }

  // Update ONLY the assigned Agent, without modifying any other order parameters
  const updatedOrder: Order = {
    ...targetOrder,
    agentId: newAgentId,
    agentName,
    agentCode,
    ...(commissionRate !== undefined ? { agentCommissionPercentage: commissionRate } : {}),
    updatedAt: now,
    updatedBy: user.name
  };

  memoryOrders[orderIdx] = updatedOrder;
  saveStorage(STORAGE_KEYS.ORDERS, memoryOrders);

  // Write only the changed fields, not the full stale-cache-derived
  // `updatedOrder` - see the matching comment in updateOrder().
  // Wait for the write to land - see the matching comment in updateOrder().
  try {
    await syncDocToFirestore('orders', orderId, {
      agentId: newAgentId,
      agentName,
      agentCode,
      ...(commissionRate !== undefined ? { agentCommissionPercentage: commissionRate } : {}),
      updatedAt: now,
      updatedBy: user.name
    });
  } catch (err) {
    console.warn(`Firestore sync note for ${orderId}:`, err);
  }

  await writeActivityLog({
    userId: user.userId,
    userName: user.name,
    action: 'AGENT_REASSIGNED',
    entityType: 'ORDER',
    entityId: orderId,
    newValue: `Reassigned agent for order ${orderId} to ${agentName} (${agentCode})`
  });

  return updatedOrder;
}

// ----------------------------------------------------
// DEDICATED BULK AGENT REASSIGNMENT (RESPECTS SELECTION)
// ----------------------------------------------------
export async function bulkUpdateOrderAgent(
  orderIds: string[],
  newAgentId: string,
  user: UserProfile
): Promise<Order[]> {
  if (user.role === 'AGENT') {
    throw new Error('Unauthorized: Field agents cannot reassign order agents.');
  }

  if (!orderIds || orderIds.length === 0) return [];

  const now = new Date().toISOString();

  // Find agent info
  let agentName = 'In-House / Direct';
  let agentCode = 'AGT-DIRECT';
  let commissionRate: number | undefined;

  if (newAgentId && newAgentId !== 'AGT-DIRECT') {
    const foundAgent = memoryAgents.find(a => a.agentId === newAgentId || a.agentCode === newAgentId);
    if (foundAgent) {
      agentName = foundAgent.name;
      agentCode = foundAgent.agentCode || foundAgent.agentId;
      if (foundAgent.commissionPercentage !== undefined || foundAgent.commissionRate !== undefined) {
        commissionRate = foundAgent.commissionPercentage ?? foundAgent.commissionRate;
      }
    } else {
      agentName = newAgentId;
      agentCode = newAgentId;
    }
  }

  const updatedOrders: Order[] = [];

  // Update memory orders ONLY for specifically selected order IDs
  memoryOrders = memoryOrders.map(o => {
    if (orderIds.includes(o.orderId)) {
      const updated: Order = {
        ...o,
        agentId: newAgentId,
        agentName,
        agentCode,
        ...(commissionRate !== undefined ? { agentCommissionPercentage: commissionRate } : {}),
        updatedAt: now,
        updatedBy: user.name
      };
      updatedOrders.push(updated);
      return updated;
    }
    return o;
  });

  // Immediately save to persistent local storage
  saveStorage(STORAGE_KEYS.ORDERS, memoryOrders);

  // Sync updated orders to Firestore in background without blocking
  (async () => {
    try {
      const batch = writeBatch(db);
      for (const ord of updatedOrders) {
        const orderRef = doc(db, 'orders', ord.orderId);
        const cleaned = cleanFirestorePayload({
          agentId: newAgentId,
          agentName,
          agentCode,
          ...(commissionRate !== undefined ? { agentCommissionPercentage: commissionRate } : {}),
          updatedAt: now,
          updatedBy: user.name
        });
        batch.update(orderRef, cleaned);
      }
      await batch.commit();
    } catch (err) {
      console.warn('Firebase batch update fallback note:', err);
      // Same targeted-fields payload as the batch path above, not the full
      // stale-cache-derived `ord` object - see the matching comment in
      // updateOrder().
      for (const ord of updatedOrders) {
        syncDocToFirestore('orders', ord.orderId, {
          agentId: newAgentId,
          agentName,
          agentCode,
          ...(commissionRate !== undefined ? { agentCommissionPercentage: commissionRate } : {}),
          updatedAt: now,
          updatedBy: user.name
        }).catch(() => {});
      }
    }
  })();

  await writeActivityLog({
    userId: user.userId,
    userName: user.name,
    action: 'BULK_AGENT_REASSIGNED',
    entityType: 'ORDER',
    entityId: orderIds.join(','),
    newValue: `Bulk reassigned ${orderIds.length} order(s) to agent ${agentName} (${agentCode})`
  });

  return updatedOrders;
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  comment: string,
  visibleToAgent: boolean,
  user: UserProfile
): Promise<Order> {
  const order = memoryOrders.find(o => o.orderId === orderId);
  if (!order) throw new Error('Order not found');

  if (user.role === 'AGENT') {
    throw new Error('Partners cannot update order status.');
  }

  const oldStatus = order.status;
  const now = new Date().toISOString();

  // Update order record
  const updatedOrder = await updateOrder(orderId, { status: newStatus }, user);

  // Create timeline record
  const historyItem: OrderStatusHistoryItem = {
    historyId: `HIST-${Date.now()}`,
    orderId,
    previousStatus: oldStatus,
    newStatus,
    changedBy: user.userId,
    changedByName: user.name,
    changedAt: now,
    comment: comment || `Status transition from ${oldStatus} to ${newStatus}`,
    visibleToAgent
  };

  await addTimelineEntry(historyItem);
  syncDocToFirestore('orderStatusHistory', historyItem.historyId, historyItem);

  // Audit log
  await writeActivityLog({
    userId: user.userId,
    userName: user.name,
    action: 'ORDER_STATUS_CHANGED',
    entityType: 'ORDER',
    entityId: orderId,
    previousValue: oldStatus,
    newValue: newStatus
  });

  // Notify agent if visible
  if (visibleToAgent && order.agentId) {
    const agent = memoryAgents.find(a => a.agentId === order.agentId);
    if (agent && agent.userId) {
      await createNotification({
        userId: agent.userId,
        type: 'ORDER_STATUS',
        title: 'Order Status Updated',
        message: `Order ${orderId} (${order.schoolName}) status changed to: ${newStatus}.`,
        orderId
      });
    }
  }

  // Deduct inventory when order is marked Dispatched
  if (newStatus === 'DISPATCHED') {
    try {
      await deductInventoryForOrder(updatedOrder, user);
    } catch (err) {
      console.warn('Failed to deduct inventory on dispatch status change:', err);
    }
  }

  return updatedOrder;
}

export async function softDeleteOrder(orderId: string, user: UserProfile): Promise<void> {
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    throw new Error('Only administrators can delete orders.');
  }
  const idx = memoryOrders.findIndex(o => o.orderId === orderId);
  if (idx !== -1) {
    const previousUpdatedAt = memoryOrders[idx].updatedAt;
    memoryOrders[idx].isDeleted = true;
    memoryOrders[idx].updatedAt = new Date().toISOString();
    saveStorage(STORAGE_KEYS.ORDERS, memoryOrders);
    // Wait for the database write and report a failure. This used to be
    // fire-and-forget, so if the save failed the order vanished from this
    // screen while still existing in the database - and in a bulk delete
    // some orders could silently not be deleted at all.
    const saved = await syncDocToFirestore('orders', orderId, { isDeleted: true });
    if (!saved) {
      memoryOrders[idx].isDeleted = false;
      memoryOrders[idx].updatedAt = previousUpdatedAt;
      saveStorage(STORAGE_KEYS.ORDERS, memoryOrders);
      throw new Error(`Could not delete order ${orderId} - it was not changed. Please check your connection and try again.`);
    }

    await writeActivityLog({
      userId: user.userId,
      userName: user.name,
      action: 'ORDER_DELETED',
      entityType: 'ORDER',
      entityId: orderId,
      newValue: `Soft deleted by ${user.name}`
    });
  }
}

// ----------------------------------------------------
// DISPATCH & LOGISTICS SERVICE
// ----------------------------------------------------
export async function updateDispatch(
  orderId: string,
  dispatchInput: {
    courierName: string;
    trackingNumber: string;
    dispatchDate: string;
    numberOfBoxes?: string | number;
    expectedDeliveryDate?: string;
    dispatchRemarks?: string;
    dispatchMode?: 'Courier' | 'India Post' | 'Transport' | 'Company Vehicle' | 'Other';
  },
  user: UserProfile
): Promise<Order> {
  if (user.role === 'AGENT') {
    throw new Error('Partners cannot update dispatch records.');
  }

  const order = memoryOrders.find(o => o.orderId === orderId);
  if (!order) throw new Error('Order not found');

  const dispatchRecord: DispatchRecord = {
    dispatchId: `DSP-${Date.now()}`,
    orderId,
    dispatchDate: dispatchInput.dispatchDate,
    dispatchMode: dispatchInput.dispatchMode || (dispatchInput.courierName.toLowerCase().includes('post') ? 'India Post' : 'Courier'),
    courierName: dispatchInput.courierName,
    trackingNumber: dispatchInput.trackingNumber,
    numberOfBoxes: dispatchInput.numberOfBoxes || '1',
    deliveryTo: order.schoolName,
    expectedDeliveryDate: dispatchInput.expectedDeliveryDate,
    dispatchRemarks: dispatchInput.dispatchRemarks,
    createdAt: new Date().toISOString()
  };

  memoryDispatches = [dispatchRecord, ...memoryDispatches];
  saveStorage(STORAGE_KEYS.DISPATCHES, memoryDispatches);
  // This write used to be fire-and-forget: if it failed, the order's own
  // fields below still updated and everything looked saved, but the dispatch
  // record itself silently never reached the database. Now a failure stops
  // here with a clear message (markDelivered() already works this way), and
  // the local copy is dropped so it can't be mistaken for a saved record.
  const dispatchSaved = await syncDocToFirestore('dispatches', dispatchRecord.dispatchId, dispatchRecord);
  if (!dispatchSaved) {
    memoryDispatches = memoryDispatches.filter(d => d.dispatchId !== dispatchRecord.dispatchId);
    saveStorage(STORAGE_KEYS.DISPATCHES, memoryDispatches);
    throw new Error('Could not save the dispatch record to the database. Nothing was changed - please check your connection and try again.');
  }

  // Update order's quick status
  const updatedOrder = await updateOrder(
    orderId,
    {
      dispatchStatus: 'DISPATCHED',
      status: order.status === 'DELIVERED' ? 'DELIVERED' : 'DISPATCHED',
      deliveryStatus: 'In Transit',
      courierName: dispatchInput.courierName,
      docketNumber: dispatchInput.trackingNumber,
      dispatchDate: dispatchInput.dispatchDate,
      numberOfBoxes: dispatchInput.numberOfBoxes,
      expectedDeliveryDate: dispatchInput.expectedDeliveryDate
    },
    user
  );

  // Timeline entry
  const timelineItem: OrderStatusHistoryItem = {
    historyId: `HIST-${Date.now()}`,
    orderId,
    previousStatus: order.status,
    newStatus: 'DISPATCHED',
    changedBy: user.userId,
    changedByName: user.name,
    changedAt: new Date().toISOString(),
    comment: `Dispatched via ${dispatchInput.courierName} (Docket: ${dispatchInput.trackingNumber}). Expected delivery by ${dispatchInput.expectedDeliveryDate || 'N/A'}.`,
    visibleToAgent: true
  };
  await addTimelineEntry(timelineItem);

  // Notify Agent
  if (order.agentId) {
    const agent = memoryAgents.find(a => a.agentId === order.agentId);
    if (agent && agent.userId) {
      await createNotification({
        userId: agent.userId,
        type: 'DISPATCH',
        title: 'Material Dispatched!',
        message: `Order ${orderId} (${order.schoolName}) has been dispatched via ${dispatchInput.courierName}. Tracking: ${dispatchInput.trackingNumber}`,
        orderId
      });
    }
  }

  await writeActivityLog({
    userId: user.userId,
    userName: user.name,
    action: 'DISPATCH_UPDATED',
    entityType: 'DISPATCH',
    entityId: orderId,
    newValue: `${dispatchInput.courierName} tracking #${dispatchInput.trackingNumber}`
  });

  // Automatically deduct physical inventory and record Stock Movement ledger
  try {
    await deductInventoryForOrder(updatedOrder, user);
  } catch (err) {
    console.warn('Failed to deduct inventory on dispatch update:', err);
  }

  return updatedOrder;
}

export async function markDelivered(
  orderId: string,
  deliveryInput: {
    deliveryDate: string;
    receiverDesignation?: string;
    deliveryRemarks?: string;
    proofOfDeliveryUrl?: string;
  },
  user: UserProfile
): Promise<Order> {
  if (user.role === 'AGENT') {
    throw new Error('Partners cannot record delivery completions.');
  }

  const order = memoryOrders.find(o => o.orderId === orderId);
  if (!order) throw new Error('Order not found');

  const deliveryRecord: DeliveryRecord = {
    deliveryId: `DEL-${Date.now()}`,
    orderId,
    deliveryDate: deliveryInput.deliveryDate,
    receiverDesignation: deliveryInput.receiverDesignation,
    deliveryRemarks: deliveryInput.deliveryRemarks,
    proofOfDeliveryUrl: deliveryInput.proofOfDeliveryUrl,
    createdAt: new Date().toISOString()
  };

  memoryDeliveries = [deliveryRecord, ...memoryDeliveries];
  saveStorage(STORAGE_KEYS.DELIVERIES, memoryDeliveries);
  // This write was previously fire-and-forget (not even awaited) - a
  // failure here was invisible even in the console, let alone to the user,
  // and "Mark as Delivered" would appear to work (since the order's own
  // status update below could still succeed independently) while the
  // delivery record itself silently never saved.
  await syncDocToFirestoreOrThrow('deliveries', deliveryRecord.deliveryId, deliveryRecord);

  const updatedOrder = await updateOrder(
    orderId,
    {
      deliveryStatus: 'Delivered',
      dispatchStatus: 'DELIVERED',
      status: 'DELIVERED',
      actualDeliveryDate: deliveryInput.deliveryDate
    },
    user
  );

  // Timeline
  const timelineItem: OrderStatusHistoryItem = {
    historyId: `HIST-${Date.now()}`,
    orderId,
    previousStatus: order.status,
    newStatus: 'DELIVERED',
    changedBy: user.userId,
    changedByName: user.name,
    changedAt: new Date().toISOString(),
    comment: `Material successfully delivered and confirmed received by ${deliveryInput.receiverDesignation || 'School Representative'}.`,
    visibleToAgent: true
  };
  await addTimelineEntry(timelineItem);

  // Notify Agent
  if (order.agentId) {
    const agent = memoryAgents.find(a => a.agentId === order.agentId);
    if (agent && agent.userId) {
      await createNotification({
        userId: agent.userId,
        type: 'DELIVERY',
        title: 'Order Delivered to School',
        message: `Order ${orderId} has been confirmed delivered at ${order.schoolName}.`,
        orderId
      });
    }
  }

  await writeActivityLog({
    userId: user.userId,
    userName: user.name,
    action: 'ORDER_DELIVERED',
    entityType: 'ORDER',
    entityId: orderId,
    newValue: `Delivered on ${deliveryInput.deliveryDate}${deliveryInput.receiverDesignation ? ` (${deliveryInput.receiverDesignation})` : ''}`
  });

  return updatedOrder;
}

// ----------------------------------------------------
// PAYMENTS SERVICE
// ----------------------------------------------------
export async function addPayment(
  paymentInput: Omit<PaymentTransaction, 'paymentId' | 'createdAt'>,
  user: UserProfile
): Promise<{ payment: PaymentTransaction; order: Order }> {
  if (user.role === 'AGENT' || user.role === 'DISPATCH') {
    throw new Error('You do not have permission to record payments.');
  }

  const order = memoryOrders.find(o => o.orderId === paymentInput.orderId);
  if (!order) throw new Error('Order not found');

  const paymentId = `PAY-${Date.now()}`;
  const newPayment: PaymentTransaction = {
    ...paymentInput,
    paymentId,
    createdAt: new Date().toISOString()
  };

  memoryPayments = [newPayment, ...memoryPayments];
  saveStorage(STORAGE_KEYS.PAYMENTS, memoryPayments);
  try {
    await syncDocToFirestore('payments', paymentId, newPayment);
  } catch (err) {
    console.warn(`Firestore sync note for payment ${paymentId}:`, err);
  }

  // Recalculate totals
  const totalAmount = order.totalAmount || order.grossOrderValue || order.orderValue;
  const newReceived = (order.amountReceived || 0) + paymentInput.amount;
  const newPending = Math.max(0, totalAmount - newReceived);

  let newPaymentStatus: PaymentStatus = 'PARTIALLY_PAID';
  if (newPending <= 0) {
    newPaymentStatus = 'PAID';
  } else if (newReceived === 0) {
    newPaymentStatus = 'PAYMENT_PENDING';
  }

  const updatedOrder = await updateOrder(
    order.orderId,
    {
      amountReceived: newReceived,
      amountPending: newPending,
      paymentStatus: newPaymentStatus,
      lastPaymentDate: paymentInput.paymentDate
    },
    user
  );

  // Timeline entry
  const timelineItem: OrderStatusHistoryItem = {
    historyId: `HIST-${Date.now()}`,
    orderId: order.orderId,
    previousStatus: order.status,
    newStatus: order.status,
    changedBy: user.userId,
    changedByName: user.name,
    changedAt: new Date().toISOString(),
    comment: `Payment received: ₹${paymentInput.amount.toLocaleString('en-IN')} via ${paymentInput.paymentMode} (Ref: ${paymentInput.transactionReference}). Outstanding: ₹${newPending.toLocaleString('en-IN')}`,
    visibleToAgent: true
  };
  await addTimelineEntry(timelineItem);

  await writeActivityLog({
    userId: user.userId,
    userName: user.name,
    action: 'PAYMENT_RECORDED',
    entityType: 'PAYMENT',
    entityId: paymentId,
    newValue: `₹${paymentInput.amount.toLocaleString('en-IN')} for order ${order.orderId}`
  });

  return { payment: newPayment, order: updatedOrder };
}

export async function getPaymentsForOrder(orderId: string): Promise<PaymentTransaction[]> {
  // Same fix as getTimelineForOrder(): this only ever read the local cache,
  // never Firestore, so the Payment Ledger showed nothing for anyone except
  // the browser that recorded each payment. No agent-specific query variant
  // needed here - the payments collection's security rule has no Agent
  // branch at all, so a Partner session's read fails 403 regardless of
  // query shape and falls back to the (empty) local cache below, same as
  // it already does today.
  try {
    const q = query(collection(db, 'payments'), where('orderId', '==', orderId));
    const snap = await getDocs(q);
    const remote: PaymentTransaction[] = [];
    snap.forEach(d => {
      const p = d.data() as PaymentTransaction;
      if (p && p.paymentId) remote.push(p);
    });
    memoryPayments = [...memoryPayments.filter(p => p.orderId !== orderId), ...remote];
    saveStorage(STORAGE_KEYS.PAYMENTS, memoryPayments);
  } catch (err) {
    console.warn('Firestore read in getPaymentsForOrder fallback to cached payments:', err);
  }
  return memoryPayments.filter(p => p.orderId === orderId);
}

export async function updatePayment(
  paymentId: string,
  updates: {
    amount: number;
    paymentMode: string;
    paymentDate: string;
    transactionReference: string;
    bankReference?: string;
    remarks?: string;
  },
  user: UserProfile
): Promise<{ payment: PaymentTransaction; order: Order }> {
  if (user.role === 'AGENT' || user.role === 'DISPATCH') {
    throw new Error('You do not have permission to edit payments.');
  }

  const idx = memoryPayments.findIndex(p => p.paymentId === paymentId);
  if (idx === -1) throw new Error('Payment record not found');
  const existing = memoryPayments[idx];

  const order = memoryOrders.find(o => o.orderId === existing.orderId);
  if (!order) throw new Error('Order not found');

  const updatedPayment: PaymentTransaction = {
    ...existing,
    amount: updates.amount,
    paymentMode: updates.paymentMode as any,
    paymentDate: updates.paymentDate,
    transactionReference: updates.transactionReference,
    bankReference: updates.bankReference,
    remarks: updates.remarks
  };
  memoryPayments[idx] = updatedPayment;
  saveStorage(STORAGE_KEYS.PAYMENTS, memoryPayments);
  try {
    await syncDocToFirestore('payments', paymentId, updatedPayment);
  } catch (err) {
    console.warn(`Firestore sync note for payment ${paymentId}:`, err);
  }

  // Editing a payment's amount changes what the order has actually received,
  // so its totals need recomputing the same way addPayment() derives them -
  // otherwise "Total Received"/"Amount Pending" would silently drift out of
  // sync with the sum of the individual payment records shown in the ledger.
  const totalAmount = order.totalAmount || order.grossOrderValue || order.orderValue;
  const newReceived = memoryPayments
    .filter(p => p.orderId === existing.orderId)
    .reduce((sum, p) => sum + p.amount, 0);
  const newPending = Math.max(0, totalAmount - newReceived);

  let newPaymentStatus: PaymentStatus = 'PARTIALLY_PAID';
  if (newPending <= 0) {
    newPaymentStatus = 'PAID';
  } else if (newReceived === 0) {
    newPaymentStatus = 'PAYMENT_PENDING';
  }

  const updatedOrder = await updateOrder(
    order.orderId,
    {
      amountReceived: newReceived,
      amountPending: newPending,
      paymentStatus: newPaymentStatus
    },
    user
  );

  // Timeline entry - same visible-history mechanism as a new payment, so
  // editing one leaves just as clear a trail in the order's own Timeline &
  // Status tab, not just the Super-Admin-only audit log.
  const editTimelineItem: OrderStatusHistoryItem = {
    historyId: `HIST-${Date.now()}`,
    orderId: order.orderId,
    previousStatus: order.status,
    newStatus: order.status,
    changedBy: user.userId,
    changedByName: user.name,
    changedAt: new Date().toISOString(),
    comment: `Payment edited: ₹${existing.amount.toLocaleString('en-IN')} via ${existing.paymentMode} (Ref: ${existing.transactionReference}) -> ₹${updatedPayment.amount.toLocaleString('en-IN')} via ${updatedPayment.paymentMode} (Ref: ${updatedPayment.transactionReference}). Outstanding: ₹${newPending.toLocaleString('en-IN')}`,
    visibleToAgent: true
  };
  await addTimelineEntry(editTimelineItem);

  await writeActivityLog({
    userId: user.userId,
    userName: user.name,
    action: 'PAYMENT_EDITED',
    entityType: 'PAYMENT',
    entityId: paymentId,
    previousValue: `₹${existing.amount.toLocaleString('en-IN')} via ${existing.paymentMode}`,
    newValue: `₹${updatedPayment.amount.toLocaleString('en-IN')} via ${updatedPayment.paymentMode} for order ${order.orderId}`
  });

  return { payment: updatedPayment, order: updatedOrder };
}

export async function deletePayment(paymentId: string, user: UserProfile): Promise<{ order: Order }> {
  if (user.role === 'AGENT' || user.role === 'DISPATCH') {
    throw new Error('You do not have permission to delete payments.');
  }

  const idx = memoryPayments.findIndex(p => p.paymentId === paymentId);
  if (idx === -1) throw new Error('Payment record not found');
  const existing = memoryPayments[idx];

  const order = memoryOrders.find(o => o.orderId === existing.orderId);
  if (!order) throw new Error('Order not found');

  memoryPayments = memoryPayments.filter(p => p.paymentId !== paymentId);
  saveStorage(STORAGE_KEYS.PAYMENTS, memoryPayments);
  try {
    await deleteDocFromFirestore('payments', paymentId);
  } catch (err) {
    console.warn(`Firestore delete note for payment ${paymentId}:`, err);
  }

  // Same recalculation as updatePayment() - derive the order's totals from
  // the actual sum of its remaining payment records, not a delta, so they
  // can never drift out of sync with what the ledger shows.
  const totalAmount = order.totalAmount || order.grossOrderValue || order.orderValue;
  const newReceived = memoryPayments
    .filter(p => p.orderId === existing.orderId)
    .reduce((sum, p) => sum + p.amount, 0);
  const newPending = Math.max(0, totalAmount - newReceived);

  let newPaymentStatus: PaymentStatus = 'PARTIALLY_PAID';
  if (newPending <= 0) {
    newPaymentStatus = 'PAID';
  } else if (newReceived === 0) {
    newPaymentStatus = 'PAYMENT_PENDING';
  }

  const updatedOrder = await updateOrder(
    order.orderId,
    {
      amountReceived: newReceived,
      amountPending: newPending,
      paymentStatus: newPaymentStatus
    },
    user
  );

  const deleteTimelineItem: OrderStatusHistoryItem = {
    historyId: `HIST-${Date.now()}`,
    orderId: order.orderId,
    previousStatus: order.status,
    newStatus: order.status,
    changedBy: user.userId,
    changedByName: user.name,
    changedAt: new Date().toISOString(),
    comment: `Payment deleted: ₹${existing.amount.toLocaleString('en-IN')} via ${existing.paymentMode} (Ref: ${existing.transactionReference}). Outstanding: ₹${newPending.toLocaleString('en-IN')}`,
    visibleToAgent: true
  };
  await addTimelineEntry(deleteTimelineItem);

  await writeActivityLog({
    userId: user.userId,
    userName: user.name,
    action: 'PAYMENT_DELETED',
    entityType: 'PAYMENT',
    entityId: paymentId,
    previousValue: `₹${existing.amount.toLocaleString('en-IN')} via ${existing.paymentMode} for order ${order.orderId}`
  });

  return { order: updatedOrder };
}

// ----------------------------------------------------
// DOCUMENTS SERVICE
// ----------------------------------------------------
export async function getDocumentsForOrder(orderId: string, user: UserProfile): Promise<OrderDocument[]> {
  try {
    // Same "list query must be provably safe" constraint worked around
    // elsewhere in this file (timeline, payments, schools): an Agent's read
    // rule depends on resource.data.visibleToAgent, so their query must
    // filter on it explicitly; every other role reads under a role-only
    // rule branch that doesn't need it.
    const q = user.role === 'AGENT'
      ? query(collection(db, 'documents'), where('orderId', '==', orderId), where('visibleToAgent', '==', true))
      : query(collection(db, 'documents'), where('orderId', '==', orderId));
    const snap = await getDocs(q);
    const remote: OrderDocument[] = [];
    snap.forEach(d => {
      const doc = d.data() as OrderDocument;
      if (doc && doc.documentId) remote.push(doc);
    });
    // Replace this order's slice with the authoritative server state, same
    // reasoning as every other "replace, don't merge" fix in this file.
    memoryDocuments = [...memoryDocuments.filter(d => d.orderId !== orderId), ...remote];
    saveStorage(STORAGE_KEYS.DOCUMENTS, memoryDocuments);
  } catch (err) {
    console.warn('Firestore read in getDocumentsForOrder fallback to cached documents:', err);
  }

  let list = memoryDocuments.filter(d => d.orderId === orderId);
  // Agents can ONLY view documents explicitly marked visibleToAgent: true
  if (user.role === 'AGENT') {
    list = list.filter(d => d.visibleToAgent === true);
  }
  return list;
}

export async function uploadDocument(
  docInput: Omit<OrderDocument, 'documentId' | 'uploadedAt'>,
  user: UserProfile
): Promise<OrderDocument> {
  const documentId = `DOC-${Date.now()}`;
  const newDoc: OrderDocument = {
    ...docInput,
    documentId,
    uploadedAt: new Date().toISOString()
  };

  memoryDocuments = [newDoc, ...memoryDocuments];
  saveStorage(STORAGE_KEYS.DOCUMENTS, memoryDocuments);
  // Throws on failure (e.g. the file pushed this document over Firestore's
  // 1 MiB limit) instead of reporting success while nothing was saved -
  // every caller already surfaces this to the user.
  await syncDocToFirestoreOrThrow('documents', documentId, newDoc);

  await writeActivityLog({
    userId: user.userId,
    userName: user.name,
    action: 'DOCUMENT_UPLOADED',
    entityType: 'DOCUMENT',
    entityId: documentId,
    newValue: `${docInput.documentType} - ${docInput.fileName} (Agent visible: ${docInput.visibleToAgent})`
  });

  return newDoc;
}

export async function deleteDocument(documentId: string, user: UserProfile): Promise<void> {
  if (user.role === 'AGENT') {
    throw new Error('Partners cannot delete documents.');
  }
  memoryDocuments = memoryDocuments.filter(d => d.documentId !== documentId);
  saveStorage(STORAGE_KEYS.DOCUMENTS, memoryDocuments);
  await deleteDocFromFirestore('documents', documentId);
}

// ----------------------------------------------------
// TIMELINE SERVICE
// ----------------------------------------------------
// Every timeline entry (order created, status changed, dispatched,
// delivered, payment recorded/edited/deleted, ...) was only ever pushed
// onto the in-memory/localStorage list and never actually written to
// Firestore, despite security rules already existing for it
// (orderStatusHistory) - so the entire "Timeline & Status" history was
// silently invisible to anyone except the browser that created each entry.
// Every call site that adds one now goes through this so it's persisted and
// visible to everyone, not just locally.
async function addTimelineEntry(item: OrderStatusHistoryItem): Promise<void> {
  memoryTimelines = [item, ...memoryTimelines];
  saveStorage(STORAGE_KEYS.TIMELINES, memoryTimelines);
  try {
    await syncDocToFirestore('orderStatusHistory', item.historyId, item);
  } catch (err) {
    console.warn(`Firestore sync note for timeline entry ${item.historyId}:`, err);
  }
}

export async function getTimelineForOrder(orderId: string, user: UserProfile): Promise<OrderStatusHistoryItem[]> {
  try {
    // Agents can only read a history entry where visibleToAgent == true (see
    // firestore.rules) - Firestore can't validate that for an unfiltered
    // query (the same "list rejected outright" constraint already worked
    // around for orders/agents/schools elsewhere in this file), so their
    // query must include that filter explicitly; every other role reads
    // under a role-only rule branch that doesn't need it.
    const q = user.role === 'AGENT'
      ? query(collection(db, 'orderStatusHistory'), where('orderId', '==', orderId), where('visibleToAgent', '==', true))
      : query(collection(db, 'orderStatusHistory'), where('orderId', '==', orderId));
    const snap = await getDocs(q);
    const remote: OrderStatusHistoryItem[] = [];
    snap.forEach(d => {
      const t = d.data() as OrderStatusHistoryItem;
      if (t && t.historyId) remote.push(t);
    });
    // Replace this order's slice with the authoritative server state, same
    // reasoning as every other "replace, don't merge" fix in this file.
    memoryTimelines = [...memoryTimelines.filter(t => t.orderId !== orderId), ...remote];
    saveStorage(STORAGE_KEYS.TIMELINES, memoryTimelines);
  } catch (err) {
    console.warn('Firestore read in getTimelineForOrder fallback to cached timeline:', err);
  }

  let list = memoryTimelines.filter(t => t.orderId === orderId);
  if (user.role === 'AGENT') {
    list = list.filter(t => t.visibleToAgent === true);
  }
  return list.sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
}

// ----------------------------------------------------
// NOTIFICATIONS SERVICE
// ----------------------------------------------------
export async function getNotifications(userOrId: string | UserProfile): Promise<NotificationItem[]> {
  const userId = typeof userOrId === 'string' ? userOrId : userOrId.userId;
  return memoryNotifications
    .filter(n => n.userId === userId || !n.userId || n.userId === 'all')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const idx = memoryNotifications.findIndex(n => n.notificationId === notificationId);
  if (idx !== -1) {
    memoryNotifications[idx].isRead = true;
    saveStorage(STORAGE_KEYS.NOTIFICATIONS, memoryNotifications);
  }
}

export async function markNotificationsAsRead(userOrId: string | UserProfile): Promise<void> {
  const userId = typeof userOrId === 'string' ? userOrId : userOrId.userId;
  memoryNotifications = memoryNotifications.map(n => {
    if (n.userId === userId || !n.userId || n.userId === 'all') return { ...n, isRead: true };
    return n;
  });
  saveStorage(STORAGE_KEYS.NOTIFICATIONS, memoryNotifications);
}

export const markAllNotificationsAsRead = markNotificationsAsRead;

export async function createNotification(
  notifInput: Omit<NotificationItem, 'notificationId' | 'createdAt' | 'isRead'>
): Promise<void> {
  const item: NotificationItem = {
    ...notifInput,
    notificationId: `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  memoryNotifications = [item, ...memoryNotifications];
  saveStorage(STORAGE_KEYS.NOTIFICATIONS, memoryNotifications);
  syncDocToFirestore('notifications', item.notificationId, item);
}

// ----------------------------------------------------
// AUDIT LOG SERVICE
// ----------------------------------------------------
export async function getActivityLogs(user: UserProfile): Promise<ActivityLog[]> {
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    throw new Error('Audit logs are restricted to Administrators only.');
  }
  return [...memoryAuditLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function writeActivityLog(
  logInput: Omit<ActivityLog, 'logId' | 'timestamp'>
): Promise<void> {
  const item: ActivityLog = {
    ...logInput,
    logId: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString()
  };
  memoryAuditLogs = [item, ...memoryAuditLogs];
  saveStorage(STORAGE_KEYS.AUDIT_LOGS, memoryAuditLogs);
  syncDocToFirestore('activityLogs', item.logId, item);
}

// ----------------------------------------------------
// MASTER DATA (Schools, Agents, Products, Users)
// ----------------------------------------------------
// Live-updating school list. The School Registry previously only ever
// fetched schools once when that page first mounted, so an edit made
// elsewhere - e.g. the phone number synced back from an order's School
// Details panel - never showed up there until the page was left and
// reopened (or hard-refreshed). Mirrors subscribeToRealtimeOrders(): an
// unfiltered onSnapshot listener is fine here since the schools collection's
// security rule (allow read: if isSignedIn()) has no per-document scoping to
// worry about, unlike orders.
export function subscribeToRealtimeSchools(onUpdate: (schools: School[]) => void): () => void {
  onUpdate([...memorySchools]);

  try {
    const unsubscribe = onSnapshot(
      collection(db, 'schools'),
      (snapshot) => {
        const remoteSchools: School[] = [];
        snapshot.forEach((docSnap) => {
          const s = docSnap.data() as School;
          if (s && s.schoolId) remoteSchools.push(s);
        });
        memorySchools = remoteSchools;
        saveStorage(STORAGE_KEYS.SCHOOLS, memorySchools);
        onUpdate([...memorySchools]);
      },
      (err) => {
        console.warn('Real-time schools listener notice:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not establish real-time schools listener:', err);
    return () => {};
  }
}

export async function getSchools(): Promise<School[]> {
  try {
    const snap = await getDocs(collection(db, 'schools'));
    // Replace (not merge into) the local cache with this authoritative
    // server-side snapshot - merging only ever added/updated entries and
    // never dropped ones removed remotely, so a deleted school (e.g. a
    // fake test record) kept reappearing in the School Registry forever,
    // the same class of bug already fixed for partners in getAgents().
    const remoteSchools: School[] = [];
    snap.forEach(d => {
      const s = d.data() as School;
      if (s && s.schoolId) remoteSchools.push(s);
    });
    memorySchools = remoteSchools;
    saveStorage(STORAGE_KEYS.SCHOOLS, memorySchools);
  } catch (e) {
    // Local fallback
  }
  return [...memorySchools];
}

export async function createSchool(schoolInput: Omit<School, 'schoolId' | 'createdAt' | 'updatedAt'>, user: UserProfile): Promise<School> {
  if (user.role === 'AGENT') throw new Error('Partners cannot create schools.');
  // memorySchools.length + 1 used to be the whole scheme, with no check that
  // the resulting ID wasn't already taken - registry IDs are not densely
  // sequential (gaps and 4-digit outliers like SCH-0024/SCH-0040 exist), so
  // that count could - and did - collide with a real existing schoolId,
  // silently overwriting it via the merge write below. Same collision-loop
  // fix already applied to createOrder()'s orderId generation.
  const existingIds = new Set(memorySchools.map(s => s.schoolId));
  const maxNumericId = memorySchools.reduce((max, s) => {
    const match = /^SCH-(\d+)$/.exec(s.schoolId);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  let schoolId = `SCH-${String(maxNumericId + 1).padStart(3, '0')}`;
  let collisionCounter = 1;
  while (existingIds.has(schoolId)) {
    schoolId = `SCH-${String(maxNumericId + 1 + collisionCounter).padStart(3, '0')}`;
    collisionCounter++;
  }
  const now = new Date().toISOString();
  const newSchool: School = {
    ...schoolInput,
    schoolId,
    createdAt: now,
    updatedAt: now
  };
  memorySchools = [newSchool, ...memorySchools];
  saveStorage(STORAGE_KEYS.SCHOOLS, memorySchools);
  try {
    await syncDocToFirestore('schools', schoolId, newSchool);
  } catch (err) {
    console.warn(`Firestore sync note for school ${schoolId}:`, err);
  }

  await writeActivityLog({
    userId: user.userId,
    userName: user.name,
    action: 'SCHOOL_CREATED',
    entityType: 'SCHOOL',
    entityId: schoolId,
    newValue: `Added school ${newSchool.schoolName} (${newSchool.state})`
  });
  return newSchool;
}

export async function updateSchool(schoolId: string, updates: Partial<School>, user: UserProfile): Promise<School> {
  if (user.role === 'AGENT') throw new Error('Partners cannot edit school records.');
  const idx = memorySchools.findIndex(s => s.schoolId === schoolId);
  if (idx === -1) throw new Error('School not found');
  const now = new Date().toISOString();
  const updated = { ...memorySchools[idx], ...updates, updatedAt: now };
  memorySchools[idx] = updated;
  saveStorage(STORAGE_KEYS.SCHOOLS, memorySchools);
  try {
    await syncDocToFirestore('schools', schoolId, updated);
  } catch (err) {
    console.warn(`Firestore sync note for school ${schoolId}:`, err);
  }

  // Editing contact details here (School Registry page) previously never
  // touched any order - so opening an order for this school kept showing
  // the old contact details, and the only way to fix that was to edit the
  // order itself. Push the same change to every order linked to this
  // school (matching the reverse sync already done from the order side in
  // updateOrderSchoolDetails), so both places stay in sync either way.
  // Originally only covered phone/address - email and pincode had the exact
  // same gap (an order's own schoolEmail/schoolPincode never got the
  // school's real value once it was later added/edited in the registry).
  const phoneChanged = updates.contactPhone !== undefined || updates.phone !== undefined;
  const addressChanged = updates.address !== undefined;
  const emailChanged = updates.email !== undefined;
  const pincodeChanged = updates.pinCode !== undefined;
  if (phoneChanged || addressChanged || emailChanged || pincodeChanged) {
    const newPhone = updates.contactPhone ?? updates.phone ?? '';
    const newAddress = updates.address ?? '';
    const newEmail = updates.email ?? '';
    const newPincode = updates.pinCode ?? '';
    // Query Firestore directly for every order actually linked to this
    // school, rather than trusting this browser's local memoryOrders cache -
    // which can be stale or incomplete (e.g. loaded before some order was
    // repointed to this school), silently skipping orders that genuinely
    // needed this update. This is exactly how two orders for a real school
    // kept showing a blank phone/address for hours after the school's own
    // record was correctly updated: the editing session's cache simply
    // didn't have them.
    let linkedOrderIds: string[] = [];
    try {
      const linkedSnap = await getDocs(query(collection(db, 'orders'), where('schoolId', '==', schoolId)));
      linkedSnap.forEach(d => linkedOrderIds.push(d.id));
    } catch (err) {
      console.warn(`Could not query live orders for school ${schoolId}, falling back to local cache:`, err);
      linkedOrderIds = memoryOrders.filter(o => o.schoolId === schoolId).map(o => o.orderId);
    }
    memoryOrders = memoryOrders.map(o => {
      if (linkedOrderIds.includes(o.orderId)) {
        return {
          ...o,
          schoolContactPhone: phoneChanged ? newPhone : o.schoolContactPhone,
          schoolAddress: addressChanged ? newAddress : o.schoolAddress,
          schoolEmail: emailChanged ? newEmail : o.schoolEmail,
          schoolPincode: pincodeChanged ? newPincode : o.schoolPincode,
          updatedAt: now
        };
      }
      return o;
    });
    if (linkedOrderIds.length > 0) {
      saveStorage(STORAGE_KEYS.ORDERS, memoryOrders);
      // Targeted fields only, not the full stale-cache-derived order object -
      // see the matching comment in updateOrder().
      const linkedOrderFirestoreUpdates: Partial<Order> = {
        ...(phoneChanged ? { schoolContactPhone: newPhone } : {}),
        ...(addressChanged ? { schoolAddress: newAddress } : {}),
        ...(emailChanged ? { schoolEmail: newEmail } : {}),
        ...(pincodeChanged ? { schoolPincode: newPincode } : {}),
        updatedAt: now
      };
      await Promise.all(
        linkedOrderIds.map(oid =>
          syncDocToFirestore('orders', oid, linkedOrderFirestoreUpdates).catch(err =>
            console.warn(`Firestore sync note for order ${oid}:`, err)
          )
        )
      );
    }
  }

  await writeActivityLog({
    userId: user.userId,
    userName: user.name,
    action: 'SCHOOL_UPDATED',
    entityType: 'SCHOOL',
    entityId: schoolId,
    newValue: `Updated ${updated.schoolName}: ${Object.keys(updates).join(', ')}`
  });
  return updated;
}

export async function getAgents(): Promise<Agent[]> {
  try {
    const snap = await getDocs(collection(db, 'agents'));
    // Replace (not merge into) the local cache with this authoritative
    // server-side snapshot - merging only ever added/updated entries and
    // never dropped ones removed remotely, so a deleted partner (e.g. a
    // fake test account) kept reappearing in every dropdown that lists
    // partners, in every browser, forever - the same class of bug already
    // fixed for orders in subscribeToRealtimeOrders().
    const remoteAgents: Agent[] = [];
    snap.forEach(d => {
      const a = d.data() as Agent;
      if (a && a.agentId) remoteAgents.push(a);
    });
    memoryAgents = remoteAgents;
    saveStorage(STORAGE_KEYS.AGENTS, memoryAgents);
  } catch (e) {
    // Local fallback
  }
  return [...memoryAgents];
}

export async function createAgent(agentInput: Omit<Agent, 'agentId' | 'agentCode' | 'createdAt' | 'updatedAt'>, user: UserProfile): Promise<Agent> {
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Only administrators can add new agents.');
  }
  const agentCount = memoryAgents.length + 1;
  const agentCode = `AGT-${String(agentCount).padStart(4, '0')}`;
  const agentId = agentCode;
  const now = new Date().toISOString();
  const newAgent: Agent = {
    ...agentInput,
    agentId,
    agentCode,
    createdAt: now,
    updatedAt: now
  };
  memoryAgents = [newAgent, ...memoryAgents];
  saveStorage(STORAGE_KEYS.AGENTS, memoryAgents);
  syncDocToFirestore('agents', agentId, newAgent);

  await writeActivityLog({
    userId: user.userId,
    userName: user.name,
    action: 'AGENT_CREATED',
    entityType: 'AGENT',
    entityId: agentId,
    newValue: `Created agent profile for ${newAgent.name} (${agentCode})`
  });
  return newAgent;
}

export async function updateAgent(agentId: string, updates: Partial<Agent>, user: UserProfile): Promise<Agent> {
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    throw new Error('Unauthorized to modify agent credentials.');
  }
  const idx = memoryAgents.findIndex(a => a.agentId === agentId);
  if (idx === -1) throw new Error('Partner not found');
  const updated = { ...memoryAgents[idx], ...updates, updatedAt: new Date().toISOString() };
  memoryAgents[idx] = updated;
  saveStorage(STORAGE_KEYS.AGENTS, memoryAgents);
  syncDocToFirestore('agents', agentId, updated);
  return updated;
}

export async function getProducts(): Promise<Product[]> {
  return [...memoryProducts];
}

export async function createProduct(prodInput: Omit<Product, 'productId' | 'createdAt' | 'updatedAt'>, user: UserProfile): Promise<Product> {
  const productId = `PROD-${Date.now()}`;
  const now = new Date().toISOString();
  const newProd: Product = {
    ...prodInput,
    productId,
    createdAt: now,
    updatedAt: now
  };
  memoryProducts = [newProd, ...memoryProducts];
  saveStorage(STORAGE_KEYS.PRODUCTS, memoryProducts);
  syncDocToFirestore('products', productId, newProd);
  return newProd;
}

export async function updateProduct(productId: string, updates: Partial<Product>): Promise<Product> {
  const idx = memoryProducts.findIndex(p => p.productId === productId);
  if (idx === -1) throw new Error('Product not found');
  const updated = { ...memoryProducts[idx], ...updates, updatedAt: new Date().toISOString() };
  memoryProducts[idx] = updated;
  saveStorage(STORAGE_KEYS.PRODUCTS, memoryProducts);
  return updated;
}

export async function getUsers(): Promise<UserProfile[]> {
  // Sync from Firestore so a user created/edited/deleted by the Super Admin in one
  // browser is visible to everyone else immediately (previously this only ever
  // returned the local cache, so a brand new account - even with a fully working
  // Firebase Auth login - would fail with "No user account found" anywhere except
  // the admin's own browser, since nothing had ever fetched the real user list).
  //
  // The users collection also holds UID-keyed permission-mirror docs (see
  // issueUserCredentials, and the lazy-migration path in AuthContext's signIn)
  // alongside the canonical internal-ID profile docs - only the latter are real
  // "accounts" for this list, identifiable because their Firestore document ID matches their own userId
  // field (a mirror doc's ID is the Firebase UID, which differs from its userId).
  try {
    const snap = await getDocs(collection(db, 'users'));
    const remoteUsers: UserProfile[] = [];
    snap.forEach(d => {
      const data = d.data() as UserProfile;
      if (data && data.userId && d.id === data.userId) {
        remoteUsers.push(data);
      }
    });
    if (remoteUsers.length > 0) {
      memoryUsers = remoteUsers;
      saveStorage(STORAGE_KEYS.USERS, memoryUsers);
    }
  } catch (err) {
    console.warn('Firestore read in getUsers fallback to cached users:', err);
  }

  return [...memoryUsers];
}

// Reads ONLY the signed-in account's own users/{firebaseUid} doc. Unlike
// getUsers() (a whole-collection list, which the rules only allow admins to
// do), a user may always read their own doc - and it is the same doc the
// rules use to decide their role, so it is the authoritative source for who
// they are. Throws on a read error (so callers can tell "doesn't exist" from
// "couldn't reach it"); returns null only if the doc genuinely isn't there.
export async function getOwnUserProfile(firebaseUid: string, fallbackEmail: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', firebaseUid));
  if (!snap.exists()) return null;
  const d = snap.data() as Partial<UserProfile> | undefined;
  if (!d || !d.role) return null;
  const stamp = d.updatedAt || new Date().toISOString();
  return {
    userId: d.userId || firebaseUid,
    name: d.name || fallbackEmail.split('@')[0],
    email: d.email || fallbackEmail,
    role: d.role,
    // An agent's agentId and agentCode are the same value (e.g. AGT-0004);
    // fall back to the code so an agent is never left without the id that
    // scopes their orders query.
    agentId: d.agentId || d.agentCode || undefined,
    agentCode: d.agentCode || undefined,
    isActive: d.isActive === true,
    createdAt: d.createdAt || stamp,
    updatedAt: stamp,
    firebaseUid
  };
}

export async function updateUserRole(userId: string, newRole: UserRole, user: UserProfile): Promise<void> {
  if (user.role !== 'SUPER_ADMIN') {
    throw new Error('Only Super Admin can update user roles.');
  }
  const idx = memoryUsers.findIndex(u => u.userId === userId);
  if (idx !== -1) {
    const oldRole = memoryUsers[idx].role;
    memoryUsers[idx].role = newRole;
    memoryUsers[idx].updatedAt = new Date().toISOString();
    saveStorage(STORAGE_KEYS.USERS, memoryUsers);
    syncDocToFirestore('users', userId, { role: newRole });

    // Keep the UID-keyed permission mirror doc in sync too - Firestore's
    // security rules resolve this account's role from users/{firebaseUid},
    // not from this internal-ID doc, so the role change wouldn't actually
    // take effect at the database level without this.
    if (memoryUsers[idx].firebaseUid) {
      syncDocToFirestore('users', memoryUsers[idx].firebaseUid!, { role: newRole, updatedAt: memoryUsers[idx].updatedAt });
    }

    await writeActivityLog({
      userId: user.userId,
      userName: user.name,
      action: 'UPDATE_ROLE',
      entityType: 'USER',
      entityId: userId,
      previousValue: oldRole,
      newValue: newRole
    });
  }
}

export async function updateUserStatus(userId: string, isActive: boolean, user: UserProfile): Promise<void> {
  if (user.role !== 'SUPER_ADMIN') {
    throw new Error('Only Super Admin can activate or deactivate user accounts.');
  }
  const idx = memoryUsers.findIndex(u => u.userId === userId);
  if (idx !== -1) {
    memoryUsers[idx].isActive = isActive;
    memoryUsers[idx].updatedAt = new Date().toISOString();
    saveStorage(STORAGE_KEYS.USERS, memoryUsers);
    syncDocToFirestore('users', userId, { isActive });

    // Same UID-keyed mirror doc as updateUserRole() - without this, a
    // deactivated account's direct database permissions would keep working
    // even though the app's own login screen now blocks them.
    if (memoryUsers[idx].firebaseUid) {
      syncDocToFirestore('users', memoryUsers[idx].firebaseUid!, { isActive, updatedAt: memoryUsers[idx].updatedAt });
    }
  }
}

export async function issueUserCredentials(
  input: {
    name: string;
    email: string;
    username?: string;
    password?: string;
    role: UserRole;
    phone?: string;
    agentId?: string;
    agentCode?: string;
    state?: string;
    notes?: string;
  },
  adminUser: UserProfile
): Promise<IssuedCredential> {
  if (adminUser.role !== 'SUPER_ADMIN') {
    throw new Error('SECURITY POLICY: Login credentials can ONLY be issued by the Super Admin (info@funscholar.com).');
  }

  const cleanEmail = input.email.trim().toLowerCase();
  const existing = memoryUsers.find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    throw new Error(`A user account with email "${input.email}" already exists. You can modify their credentials instead.`);
  }

  const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const rawPassword = input.password && input.password.trim() ? input.password.trim() : `GovSchool@${Math.floor(1000 + Math.random() * 9000)}`;

  let assignedAgentId = input.agentId;
  let assignedAgentCode = input.agentCode;

  // If role is AGENT, ensure agent registry record is linked or provisioned
  if (input.role === 'AGENT') {
    if (!assignedAgentCode) {
      assignedAgentCode = `AGT-${String(memoryAgents.length + 1).padStart(4, '0')}`;
    }
    if (!assignedAgentId) {
      assignedAgentId = assignedAgentCode;
    }

    const agentExisting = memoryAgents.find(a => a.agentCode === assignedAgentCode || a.email.toLowerCase() === cleanEmail);
    if (!agentExisting) {
      const newAgent: Agent = {
        agentId: assignedAgentCode,
        agentCode: assignedAgentCode,
        name: input.name.trim(),
        email: cleanEmail,
        phone: input.phone || '',
        state: input.state || 'Assigned Territory',
        isActive: true,
        userId,
        commissionRate: 8.0,
        createdAt: now,
        updatedAt: now
      };
      memoryAgents = [newAgent, ...memoryAgents];
      saveStorage(STORAGE_KEYS.AGENTS, memoryAgents);
      syncDocToFirestore('agents', assignedAgentCode, newAgent);
    }
  }

  const newUser: UserProfile = {
    userId,
    name: input.name.trim(),
    email: cleanEmail,
    username: input.username || cleanEmail.split('@')[0],
    password: rawPassword,
    phone: input.phone || '',
    role: input.role,
    agentId: assignedAgentId,
    agentCode: assignedAgentCode,
    state: input.state,
    isActive: true,
    issuedBy: adminUser.email,
    issuedAt: now,
    createdAt: now,
    updatedAt: now
  };

  memoryUsers = [newUser, ...memoryUsers];
  saveStorage(STORAGE_KEYS.USERS, memoryUsers);
  // Wait for this write - if someone tries logging in with these
  // credentials right after the Super Admin issues them, login() depends on
  // getUsers() finding this record; an un-awaited write here could still be
  // in flight when that happens.
  try {
    await syncDocToFirestore('users', userId, newUser);
  } catch (err) {
    console.warn(`Firestore sync note for new user ${userId}:`, err);
  }

  // Create the real Firebase Authentication account now so this login works
  // immediately (Firestore security rules require request.auth to be set).
  // Best-effort: if this fails (e.g. transient network issue), the account
  // still gets created automatically on the user's first login attempt.
  //
  // The security rules key role lookups off request.auth.uid (see
  // hasUserDoc()/currentUserDoc() in firestore.rules), which is the REAL
  // Firebase UID - not this record's internal `userId`. So we also mirror
  // the role data at users/{firebaseUid}, which only an admin (this caller)
  // is permitted to write for someone else's UID.
  try {
    const firebaseUid = await createAuthAccountForUser(cleanEmail, rawPassword);
    newUser.firebaseUid = firebaseUid;
    memoryUsers[0] = newUser; // keep the in-memory copy (just unshifted above) in sync
    saveStorage(STORAGE_KEYS.USERS, memoryUsers);
    await syncDocToFirestore('users', userId, { firebaseUid });
    await setDoc(doc(db, 'users', firebaseUid), {
      userId: newUser.userId,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      agentId: newUser.agentId || null,
      agentCode: newUser.agentCode || null,
      isActive: newUser.isActive,
      updatedAt: now
    }, { merge: true });
  } catch (authErr: any) {
    if (authErr?.code !== 'auth/email-already-in-use') {
      console.warn('Could not pre-create Firebase Auth account (will retry on first login):', authErr?.message || authErr);
    }
  }

  await writeActivityLog({
    userId: adminUser.userId,
    userName: adminUser.name,
    action: 'CREDENTIALS_ISSUED',
    entityType: 'USER',
    entityId: userId,
    newValue: `Super Admin issued login credentials for ${newUser.name} (${newUser.email}) with role ${newUser.role}`
  });

  return {
    userId,
    name: newUser.name,
    email: newUser.email,
    username: newUser.username,
    password: rawPassword,
    role: newUser.role,
    agentId: newUser.agentId,
    agentCode: newUser.agentCode,
    state: newUser.state,
    phone: newUser.phone,
    isActive: true,
    issuedBy: adminUser.email,
    issuedAt: now,
    notes: input.notes
  };
}

export async function resetUserPassword(
  userId: string,
  newPass: string,
  adminUser: UserProfile
): Promise<{ emailResetSent: boolean }> {
  if (adminUser.role !== 'SUPER_ADMIN') {
    throw new Error('SECURITY POLICY: Password reset can ONLY be performed by the Super Admin.');
  }
  const idx = memoryUsers.findIndex(u => u.userId === userId);
  if (idx === -1) throw new Error('User account not found');

  const cleanNewPass = newPass.trim();
  memoryUsers[idx].password = cleanNewPass;
  memoryUsers[idx].updatedAt = new Date().toISOString();
  saveStorage(STORAGE_KEYS.USERS, memoryUsers);
  syncDocToFirestore('users', userId, { password: cleanNewPass, updatedAt: memoryUsers[idx].updatedAt });

  // NOTE: A Firebase Authentication password cannot be overwritten to an admin-chosen
  // value from the client SDK without the user's old password (that requires the Admin
  // SDK, which this static site doesn't run). If this account already has a real
  // Firebase Auth identity, the value above only takes effect once the user follows the
  // emailed reset link below; if it does NOT have one yet, this new value is what gets
  // used the next time they log in (see the lazy-migration path in AuthContext.login).
  let emailResetSent = false;
  try {
    await sendPasswordResetEmail(auth, memoryUsers[idx].email);
    emailResetSent = true;
  } catch (e: any) {
    // Non-fatal: most likely this account has no Firebase Auth identity yet, in which
    // case the plaintext value saved above is all that's needed for their next login.
    console.warn('Password reset email notice:', e?.message || e);
  }

  await writeActivityLog({
    userId: adminUser.userId,
    userName: adminUser.name,
    action: 'PASSWORD_RESET',
    entityType: 'USER',
    entityId: userId,
    newValue: `Super Admin reset credentials for ${memoryUsers[idx].email}`
  });

  return { emailResetSent };
}

// migrateAllUsersToFirebaseAuth() USED to live here - a one-time backfill
// that, on every fresh Super Admin browser, walked the 8 hardcoded starter
// accounts and created a real Firebase Auth login + users/{firebaseUid} role
// doc for any of them that didn't already have one. It's no longer needed:
// every real account already has its login, and the same thing already
// happens safely, one account at a time, the moment anyone without a login
// enters the correct password (see the lazy-migration path in AuthContext's
// signIn, which calls createAuthAccountForUser() directly). Removed outright
// rather than left as an automatic startup path that writes hardcoded
// account data - the same reasoning as the seed bootstrap removed earlier.

export async function deleteUser(userId: string, adminUser: UserProfile): Promise<void> {
  if (adminUser.role !== 'SUPER_ADMIN') {
    throw new Error('Only Super Admin can delete user accounts and revoke credentials.');
  }
  const target = memoryUsers.find(u => u.userId === userId);
  if (!target) throw new Error('User account not found.');
  if (target.email.toLowerCase() === 'info@funscholar.com') {
    throw new Error('SECURITY POLICY: Cannot delete or revoke the permanent root Super Admin account (info@funscholar.com).');
  }

  // Remove from memory
  memoryUsers = memoryUsers.filter(u => u.userId !== userId);
  saveStorage(STORAGE_KEYS.USERS, memoryUsers);

  // Permanently record in deletedUserIds so initial seed data never revives it
  if (!deletedUserIds.includes(userId)) {
    deletedUserIds.push(userId);
  }
  if (!deletedUserIds.includes(target.email.toLowerCase())) {
    deletedUserIds.push(target.email.toLowerCase());
  }
  saveStorage(STORAGE_KEYS.DELETED_USERS, deletedUserIds);

  // If user was an AGENT or tied to an agentCode, clean up agent registry
  if (target.role === 'AGENT' || target.agentId || target.agentCode) {
    const agtCode = target.agentCode || target.agentId;
    memoryAgents = memoryAgents.filter(
      a => a.userId !== userId && a.agentCode !== agtCode && a.email.toLowerCase() !== target.email.toLowerCase()
    );
    saveStorage(STORAGE_KEYS.AGENTS, memoryAgents);
    if (agtCode) {
      deleteDocFromFirestore('agents', agtCode);
    }
  }

  // Delete from Firestore
  deleteDocFromFirestore('users', userId);

  // Also remove the UID-keyed role mirror doc (see issueUserCredentials).
  // Without this, the account's Firestore security-rule permissions would
  // keep working even after "deletion" here,
  // since hasUserDoc()/currentUserDoc() look it up by their real Firebase UID,
  // not this record's internal userId.
  if (target.firebaseUid) {
    deleteDocFromFirestore('users', target.firebaseUid);
  }

  await writeActivityLog({
    userId: adminUser.userId,
    userName: adminUser.name,
    action: 'CREDENTIALS_REVOKED',
    entityType: 'USER',
    entityId: userId,
    newValue: `Super Admin purged account and revoked credentials for ${target.name} (${target.email}, ${target.role})`
  });
}

// Alias for backwards compatibility
export const deleteUserCredentials = deleteUser;

export async function createUser(
  input: {
    name: string;
    email: string;
    username?: string;
    password?: string;
    role: UserRole;
    phone?: string;
    agentCode?: string;
    state?: string;
    notes?: string;
  },
  adminUser: UserProfile
): Promise<UserProfile> {
  const cred = await issueUserCredentials(input, adminUser);
  const found = memoryUsers.find(u => u.userId === cred.userId);
  if (!found) throw new Error('User creation failed to record profile.');
  return found;
}

export async function updateUserProfile(
  userId: string,
  updates: {
    name?: string;
    email?: string;
    role?: UserRole;
    phone?: string;
    agentCode?: string;
    password?: string;
    isActive?: boolean;
    state?: string;
  },
  adminUser: UserProfile
): Promise<UserProfile> {
  if (adminUser.role !== 'SUPER_ADMIN' && adminUser.userId !== userId) {
    throw new Error('Only Super Admin can edit user accounts.');
  }

  const idx = memoryUsers.findIndex(u => u.userId === userId);
  if (idx === -1) throw new Error('User account not found.');

  const existing = memoryUsers[idx];
  // Guard info@funscholar.com role modification
  if (existing.email.toLowerCase() === 'info@funscholar.com' && updates.role && updates.role !== 'SUPER_ADMIN') {
    throw new Error('SECURITY POLICY: Cannot change the role of the primary Super Admin (info@funscholar.com).');
  }

  const cleanUpdates: Partial<UserProfile> = {};
  if (updates.name !== undefined) cleanUpdates.name = updates.name.trim();
  if (updates.email !== undefined) cleanUpdates.email = updates.email.trim().toLowerCase();
  if (updates.role !== undefined) cleanUpdates.role = updates.role;
  if (updates.phone !== undefined) cleanUpdates.phone = updates.phone.trim();
  if (updates.agentCode !== undefined) {
    cleanUpdates.agentCode = updates.agentCode.trim();
    cleanUpdates.agentId = updates.agentCode.trim();
  }
  if (updates.password !== undefined && updates.password.trim()) {
    cleanUpdates.password = updates.password.trim();
  }
  if (updates.isActive !== undefined) cleanUpdates.isActive = updates.isActive;
  if (updates.state !== undefined) cleanUpdates.state = updates.state;

  const updatedUser: UserProfile = {
    ...existing,
    ...cleanUpdates,
    updatedAt: new Date().toISOString()
  };

  memoryUsers[idx] = updatedUser;
  saveStorage(STORAGE_KEYS.USERS, memoryUsers);
  // Wait for this write before returning - same race as updateOrder() etc: if
  // someone tries to log in with the newly edited email/password right after
  // the Super Admin saves, and this hadn't landed yet, getUsers() (which
  // login() depends on to even find the account) would come back empty.
  try {
    await syncDocToFirestore('users', userId, updatedUser);
  } catch (err) {
    console.warn(`Firestore sync note for user ${userId}:`, err);
  }

  // Keep the UID-keyed permission mirror doc in sync too - same reasoning as
  // deleteUser()/updateUserRole()/updateUserStatus(): Firestore's security
  // rules resolve this account's actual permissions from users/{firebaseUid},
  // not this internal-ID doc, so an edit here (role, active status, etc.)
  // wouldn't otherwise take effect at the database level.
  if (updatedUser.firebaseUid) {
    try {
      await syncDocToFirestore('users', updatedUser.firebaseUid, {
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        agentId: updatedUser.agentId || null,
        agentCode: updatedUser.agentCode || null,
        isActive: updatedUser.isActive,
        updatedAt: updatedUser.updatedAt
      });
    } catch (err) {
      console.warn(`Firestore sync note for user mirror ${updatedUser.firebaseUid}:`, err);
    }
  }

  // If role is AGENT or agentCode updated, update or create agent record
  if (updatedUser.role === 'AGENT' && updatedUser.agentCode) {
    const agtIdx = memoryAgents.findIndex(a => a.agentCode === updatedUser.agentCode || a.userId === userId);
    if (agtIdx !== -1) {
      memoryAgents[agtIdx] = {
        ...memoryAgents[agtIdx],
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone || '',
        state: updatedUser.state || memoryAgents[agtIdx].state,
        isActive: updatedUser.isActive ?? true,
        updatedAt: new Date().toISOString()
      };
      saveStorage(STORAGE_KEYS.AGENTS, memoryAgents);
      syncDocToFirestore('agents', updatedUser.agentCode, memoryAgents[agtIdx]);
    }
  }

  await writeActivityLog({
    userId: adminUser.userId,
    userName: adminUser.name,
    action: 'UPDATE_USER',
    entityType: 'USER',
    entityId: userId,
    newValue: `Super Admin updated profile for ${updatedUser.name} (${updatedUser.email}, role: ${updatedUser.role})`
  });

  return updatedUser;
}

export interface PendingOtpRecord {
  email: string;
  otp: string;
  expiresAt: number;
}

let memoryPendingOtps: PendingOtpRecord[] = loadStorage(STORAGE_KEYS.PENDING_OTPS, []);

export async function generatePasswordResetOtp(emailInput: string): Promise<{
  success: boolean;
  message: string;
  otp: string;
  expiresAt: number;
  userName: string;
}> {
  const cleanEmail = emailInput.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Please enter a valid email address.');
  }

  const user = memoryUsers.find(u => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    throw new Error(`No account found matching "${emailInput}". Please check the email address or contact Super Admin.`);
  }

  if (!user.isActive) {
    throw new Error('This account has been deactivated. Please contact Super Admin to reactivate credentials.');
  }

  // Generate secure 6-digit numeric OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Keep only non-expired OTPs and add new one
  memoryPendingOtps = memoryPendingOtps.filter(o => o.email.toLowerCase() !== cleanEmail && o.expiresAt > Date.now());
  memoryPendingOtps.push({
    email: cleanEmail,
    otp: otpCode,
    expiresAt
  });
  saveStorage(STORAGE_KEYS.PENDING_OTPS, memoryPendingOtps);

  // Sync to Firestore OTP collection for cloud persistence
  syncDocToFirestore('otps', cleanEmail, {
    email: cleanEmail,
    otp: otpCode,
    expiresAt: new Date(expiresAt).toISOString(),
    createdAt: new Date().toISOString()
  });

  return {
    success: true,
    message: `Verification code generated for ${user.name}.`,
    otp: otpCode,
    expiresAt,
    userName: user.name
  };
}

export async function verifyOtpAndResetPassword(
  emailInput: string,
  otpCode: string,
  newPasswordInput: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = emailInput.trim().toLowerCase();
  const cleanOtp = otpCode.trim();
  const cleanPass = newPasswordInput.trim();

  if (!cleanEmail || !cleanOtp || !cleanPass) {
    throw new Error('Email, OTP code, and new password are required.');
  }

  if (cleanPass.length < 4) {
    throw new Error('New password must be at least 4 characters long.');
  }

  // Check pending OTPs
  memoryPendingOtps = memoryPendingOtps.filter(o => o.expiresAt > Date.now());
  const pending = memoryPendingOtps.find(o => o.email.toLowerCase() === cleanEmail && o.otp === cleanOtp);

  // Master bypass code '123456' for instant demo accessibility
  const isMasterOtp = cleanOtp === '123456';

  if (!pending && !isMasterOtp) {
    throw new Error('Invalid or expired OTP code. Please request a new OTP code.');
  }

  const userIdx = memoryUsers.findIndex(u => u.email.toLowerCase() === cleanEmail);
  if (userIdx === -1) {
    throw new Error('User account not found.');
  }

  const now = new Date().toISOString();
  memoryUsers[userIdx].password = cleanPass;
  memoryUsers[userIdx].updatedAt = now;
  saveStorage(STORAGE_KEYS.USERS, memoryUsers);
  syncDocToFirestore('users', memoryUsers[userIdx].userId, {
    password: cleanPass,
    updatedAt: now
  });

  // Remove used OTP
  memoryPendingOtps = memoryPendingOtps.filter(o => o.email.toLowerCase() !== cleanEmail);
  saveStorage(STORAGE_KEYS.PENDING_OTPS, memoryPendingOtps);
  deleteDocFromFirestore('otps', cleanEmail);

  await writeActivityLog({
    userId: memoryUsers[userIdx].userId,
    userName: memoryUsers[userIdx].name,
    action: 'PASSWORD_RESET',
    entityType: 'USER',
    entityId: memoryUsers[userIdx].userId,
    newValue: `Password reset verified via OTP for ${memoryUsers[userIdx].email}`
  });

  return {
    success: true,
    message: 'Password successfully updated! You can now log in with your new password.'
  };
}

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'global'));
    if (snap.exists()) {
      // Merge over the local defaults rather than replacing outright, so a
      // settings doc saved before a new field (e.g. companies) existed still
      // comes back with a sensible default for it instead of undefined.
      memorySettings = { ...memorySettings, ...(snap.data() as Partial<SystemSettings>) };
      saveStorage(STORAGE_KEYS.SETTINGS, memorySettings);
    }
  } catch (e) {
    // Local fallback
  }
  return { ...memorySettings };
}

export async function updateSystemSettings(newSettings: Partial<SystemSettings>, user: UserProfile): Promise<SystemSettings> {
  if (user.role !== 'SUPER_ADMIN') {
    throw new Error('Only Super Admin can adjust system-wide settings.');
  }
  memorySettings = { ...memorySettings, ...newSettings };
  saveStorage(STORAGE_KEYS.SETTINGS, memorySettings);
  try {
    await syncDocToFirestore('settings', 'global', memorySettings);
  } catch (err) {
    console.warn('Firestore sync note for settings/global:', err);
  }
  return memorySettings;
}

export async function addCompany(companyName: string, user: UserProfile): Promise<string[]> {
  if (user.role !== 'SUPER_ADMIN') {
    throw new Error('Only Super Admin can add a new company.');
  }
  const trimmed = companyName.trim();
  if (!trimmed) {
    throw new Error('Company name cannot be empty.');
  }
  const existing = memorySettings.companies || [];
  if (existing.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error(`"${trimmed}" is already in the company list.`);
  }
  const updated = await updateSystemSettings({ companies: [...existing, trimmed] }, user);
  return updated.companies;
}

export async function removeCompany(companyName: string, user: UserProfile): Promise<string[]> {
  if (user.role !== 'SUPER_ADMIN') {
    throw new Error('Only Super Admin can remove a company.');
  }
  const existing = memorySettings.companies || [];
  const updated = await updateSystemSettings(
    { companies: existing.filter(c => c !== companyName) },
    user
  );
  return updated.companies;
}

export async function addCategory(categoryName: string, user: UserProfile): Promise<string[]> {
  if (user.role !== 'SUPER_ADMIN') {
    throw new Error('Only Super Admin can add a new category.');
  }
  const trimmed = categoryName.trim();
  if (!trimmed) {
    throw new Error('Category name cannot be empty.');
  }
  const existing = memorySettings.categories || [];
  if (existing.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error(`"${trimmed}" is already in the category list.`);
  }
  const updated = await updateSystemSettings({ categories: [...existing, trimmed] }, user);
  return updated.categories;
}

export async function removeCategory(categoryName: string, user: UserProfile): Promise<string[]> {
  if (user.role !== 'SUPER_ADMIN') {
    throw new Error('Only Super Admin can remove a category.');
  }
  const existing = memorySettings.categories || [];
  const updated = await updateSystemSettings(
    { categories: existing.filter(c => c !== categoryName) },
    user
  );
  return updated.categories;
}

export async function addStickerSenderCompany(companyName: string, user: UserProfile): Promise<string[]> {
  if (user.role !== 'SUPER_ADMIN') {
    throw new Error('Only Super Admin can add a new sender company.');
  }
  const trimmed = companyName.trim();
  if (!trimmed) {
    throw new Error('Company name cannot be empty.');
  }
  const existing = memorySettings.stickerSenderCompanies || [];
  if (existing.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error(`"${trimmed}" is already in the sender company list.`);
  }
  const updated = await updateSystemSettings({ stickerSenderCompanies: [...existing, trimmed] }, user);
  return updated.stickerSenderCompanies;
}

export async function removeStickerSenderCompany(companyName: string, user: UserProfile): Promise<string[]> {
  if (user.role !== 'SUPER_ADMIN') {
    throw new Error('Only Super Admin can remove a sender company.');
  }
  const existing = memorySettings.stickerSenderCompanies || [];
  const updated = await updateSystemSettings(
    { stickerSenderCompanies: existing.filter(c => c !== companyName) },
    user
  );
  return updated.stickerSenderCompanies;
}

// Batch import helper
export async function batchImportOrders(ordersToImport: Order[], user: UserProfile, replaceAll: boolean = false): Promise<{ imported: number; errors: string[] }> {
  if (user.role === 'AGENT') throw new Error('Unauthorized');
  let count = 0;
  const errors: string[] = [];

  if (replaceAll) {
    memoryOrders = [];
  }

  for (const ord of ordersToImport) {
    try {
      const existing = memoryOrders.find(o => o.orderId === ord.orderId || (o.purchaseOrderNumber === ord.purchaseOrderNumber && o.schoolName === ord.schoolName));
      if (!existing) {
        memoryOrders.push(ord);
        syncDocToFirestore('orders', ord.orderId, ord);
        count++;
      }
    } catch (e: any) {
      errors.push(`Order ${ord.orderNumber}: ${e.message}`);
    }
  }

  saveStorage(STORAGE_KEYS.ORDERS, memoryOrders);

  await writeActivityLog({
    userId: user.userId,
    userName: user.name,
    action: 'BATCH_IMPORT',
    entityType: 'ORDER',
    entityId: 'IMPORT',
    newValue: `Imported ${count} orders from spreadsheet${replaceAll ? ' (cleared all past orders first)' : ''}`
  });

  return { imported: count, errors };
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  return [...memoryAuditLogs].map(l => ({
    ...l,
    userEmail: l.userId ? `${l.userId}@govschool.in` : 'system@govschool.in',
    userRole: 'ADMIN',
    changes: l.newValue || l.previousValue || ''
  }));
}

// COMMISSION PAYMENTS - backs the hidden /cb page's "Mark as Paid" and
// Transaction Details. Restricted to Super Admin by firestore.rules, so
// unlike most of this file there's no local-cache/offline fallback here -
// it's a small Super-Admin-only feature, not part of the app's main
// always-available order-management flow.

// Whether a commission payment record represents money actually paid, as
// opposed to a DRAFT saved before payment happened (Commission
// Calculation's "Save as Draft"). Every record created before the
// `status` field existed has no such field at all and is a real
// completed payment, so a missing field must be treated the same as
// 'PAID' - never as "not paid", or every payment recorded before this
// feature existed would suddenly vanish from Total Paid. The single
// source of truth for this check - anywhere that sums money paid or
// marks an order as commission-paid must use this, not its own
// `status === 'PAID'` check, so the two can never quietly diverge.
export function isCommissionPaymentPaid(p: CommissionPayment): boolean {
  return p.status !== 'DRAFT';
}

export async function saveCommissionPayment(
  payment: Omit<CommissionPayment, 'commissionPaymentId' | 'createdAt'>,
  user: UserProfile
): Promise<CommissionPayment> {
  if (user.role !== 'SUPER_ADMIN') {
    throw new Error('Only Super Admin can record a commission payment.');
  }
  const commissionPaymentId = `CP-${Date.now()}`;
  const record: CommissionPayment = {
    ...payment,
    commissionPaymentId,
    createdAt: new Date().toISOString()
  };
  await syncDocToFirestoreOrThrow('commissionPayments', commissionPaymentId, record);
  return record;
}

export async function updateCommissionPayment(
  paymentId: string,
  updates: Partial<Pick<CommissionPayment,
    | 'commissionAmount'
    | 'commissionPercent'
    | 'paymentMode'
    | 'paymentDate'
    | 'status'
    | 'receivedByName'
    | 'upiId'
    | 'upiTransactionRef'
    | 'bankName'
    | 'accountNumber'
    | 'transactionRefNumber'
    | 'neftUtrNumber'
    | 'transactionUtrPfmsRef'
    | 'remarks'
  >> & {
    // null (as opposed to undefined/omitted) means "explicitly remove this
    // field" - e.g. a screenshot that was attached then removed before
    // saving. syncDocToFirestoreOrThrow's merge-write drops undefined keys
    // entirely (so it can never clear an existing field, only leave it
    // untouched), which is exactly why this can't just reuse that helper -
    // it needs deleteField() instead.
    screenshotDataUrl?: string | null;
    screenshotFileName?: string | null;
  },
  user: UserProfile
): Promise<void> {
  if (user.role !== 'SUPER_ADMIN') {
    throw new Error('Only Super Admin can edit a commission payment.');
  }
  const payload: Record<string, any> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    payload[key] = value === null ? deleteField() : value;
  }
  await updateDoc(doc(db, 'commissionPayments', paymentId), payload);
}

export async function deleteCommissionPaymentScreenshot(paymentId: string, user: UserProfile): Promise<void> {
  if (user.role !== 'SUPER_ADMIN') {
    throw new Error('Only Super Admin can remove a commission payment screenshot.');
  }
  await updateDoc(doc(db, 'commissionPayments', paymentId), {
    screenshotDataUrl: deleteField(),
    screenshotFileName: deleteField()
  });
}

export function subscribeToRealtimeCommissionPayments(onUpdate: (payments: CommissionPayment[]) => void): () => void {
  try {
    const unsubscribe = onSnapshot(
      collection(db, 'commissionPayments'),
      (snapshot) => {
        const payments: CommissionPayment[] = [];
        snapshot.forEach((docSnap) => {
          const p = docSnap.data() as CommissionPayment;
          if (p && p.commissionPaymentId) payments.push(p);
        });
        payments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
        onUpdate(payments);
      },
      (err) => {
        console.warn('Real-time commission payments listener notice:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not establish real-time commission payments listener:', err);
    return () => {};
  }
}

// ============================================================================
// INVENTORY & PROCUREMENT MANAGEMENT MODULE
// ============================================================================

// 1. REALTIME SUBSCRIBERS
export function subscribeToRealtimeMaterials(onUpdate: (materials: Material[]) => void): () => void {
  onUpdate([...memoryMaterials]);
  try {
    const unsubscribe = onSnapshot(
      collection(db, 'materials'),
      (snapshot) => {
        const remote: Material[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data();
          if (raw && raw.materialId) {
            remote.push(normalizeMaterial(raw));
          }
        });
        if (remote.length > 0) {
          memoryMaterials = remote;
          saveStorage(STORAGE_KEYS.MATERIALS, memoryMaterials);
        }
        onUpdate([...memoryMaterials]);
      },
      (err) => {
        console.warn('Materials snapshot notice:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Materials snapshot error:', err);
    return () => {};
  }
}

export function subscribeToRealtimeCatalogues(onUpdate: (catalogues: Catalogue[]) => void): () => void {
  onUpdate([...memoryCatalogues]);
  try {
    const unsubscribe = onSnapshot(
      collection(db, 'catalogues'),
      (snapshot) => {
        const remote: Catalogue[] = [];
        snapshot.forEach((docSnap) => {
          const c = docSnap.data() as Catalogue;
          if (c && c.catalogueId) remote.push(c);
        });
        if (remote.length > 0) {
          memoryCatalogues = remote;
          saveStorage(STORAGE_KEYS.CATALOGUES, memoryCatalogues);
        }
        onUpdate([...memoryCatalogues]);
      },
      (err) => {
        console.warn('Catalogues snapshot notice:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Catalogues snapshot error:', err);
    return () => {};
  }
}

export function subscribeToRealtimeVendors(onUpdate: (vendors: Vendor[]) => void): () => void {
  onUpdate([...memoryVendors]);
  try {
    const unsubscribe = onSnapshot(
      collection(db, 'vendors'),
      (snapshot) => {
        const remote: Vendor[] = [];
        snapshot.forEach((docSnap) => {
          const v = docSnap.data() as Vendor;
          if (v && v.vendorId) remote.push(v);
        });
        if (remote.length > 0) {
          memoryVendors = remote;
          saveStorage(STORAGE_KEYS.VENDORS, memoryVendors);
        }
        onUpdate([...memoryVendors]);
      },
      (err) => {
        console.warn('Vendors snapshot notice:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Vendors snapshot error:', err);
    return () => {};
  }
}

export function subscribeToRealtimePurchaseOrders(onUpdate: (pos: PurchaseOrder[]) => void): () => void {
  onUpdate([...memoryPurchaseOrders]);
  try {
    const unsubscribe = onSnapshot(
      collection(db, 'purchaseOrders'),
      (snapshot) => {
        const remote: PurchaseOrder[] = [];
        snapshot.forEach((docSnap) => {
          const po = docSnap.data() as PurchaseOrder;
          if (po && po.poId) remote.push(po);
        });
        if (remote.length > 0) {
          remote.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          memoryPurchaseOrders = remote;
          saveStorage(STORAGE_KEYS.PURCHASE_ORDERS, memoryPurchaseOrders);
        }
        onUpdate([...memoryPurchaseOrders]);
      },
      (err) => {
        console.warn('Purchase orders snapshot notice:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Purchase orders snapshot error:', err);
    return () => {};
  }
}

export function subscribeToRealtimeStockMovements(onUpdate: (movements: StockMovement[]) => void): () => void {
  onUpdate([...memoryStockMovements]);
  try {
    const unsubscribe = onSnapshot(
      collection(db, 'stockMovements'),
      (snapshot) => {
        const remote: StockMovement[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data();
          if (raw && raw.movementId) {
            remote.push(normalizeStockMovement(raw));
          }
        });
        if (remote.length > 0) {
          remote.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          memoryStockMovements = remote;
          saveStorage(STORAGE_KEYS.STOCK_MOVEMENTS, memoryStockMovements);
        }
        onUpdate([...memoryStockMovements]);
      },
      (err) => {
        console.warn('Stock movements snapshot notice:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Stock movements snapshot error:', err);
    return () => {};
  }
}

// 2. GETTERS
export async function getMaterials(): Promise<Material[]> {
  try {
    const snap = await getDocs(collection(db, 'materials'));
    const remote: Material[] = [];
    snap.forEach(d => {
      const raw = d.data();
      if (raw && raw.materialId) {
        remote.push(normalizeMaterial(raw));
      }
    });
    if (remote.length > 0) {
      memoryMaterials = remote;
      saveStorage(STORAGE_KEYS.MATERIALS, memoryMaterials);
    }
  } catch (err) {
    console.warn('getMaterials remote fetch warning:', err);
  }
  return [...memoryMaterials];
}

export async function getCatalogues(): Promise<Catalogue[]> {
  try {
    const snap = await getDocs(collection(db, 'catalogues'));
    const remote: Catalogue[] = [];
    snap.forEach(d => {
      const c = d.data() as Catalogue;
      if (c && c.catalogueId) remote.push(c);
    });
    if (remote.length > 0) {
      memoryCatalogues = remote;
      saveStorage(STORAGE_KEYS.CATALOGUES, memoryCatalogues);
    }
  } catch (err) {
    console.warn('getCatalogues remote fetch warning:', err);
  }
  return [...memoryCatalogues];
}

export async function getVendors(): Promise<Vendor[]> {
  try {
    const snap = await getDocs(collection(db, 'vendors'));
    const remote: Vendor[] = [];
    snap.forEach(d => {
      const v = d.data() as Vendor;
      if (v && v.vendorId) remote.push(v);
    });
    if (remote.length > 0) {
      memoryVendors = remote;
      saveStorage(STORAGE_KEYS.VENDORS, memoryVendors);
    }
  } catch (err) {
    console.warn('getVendors remote fetch warning:', err);
  }
  return [...memoryVendors];
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  try {
    const snap = await getDocs(collection(db, 'purchaseOrders'));
    const remote: PurchaseOrder[] = [];
    snap.forEach(d => {
      const po = d.data() as PurchaseOrder;
      if (po && po.poId) remote.push(po);
    });
    if (remote.length > 0) {
      remote.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      memoryPurchaseOrders = remote;
      saveStorage(STORAGE_KEYS.PURCHASE_ORDERS, memoryPurchaseOrders);
    }
  } catch (err) {
    console.warn('getPurchaseOrders remote fetch warning:', err);
  }
  return [...memoryPurchaseOrders];
}

export async function getStockMovements(): Promise<StockMovement[]> {
  try {
    const snap = await getDocs(collection(db, 'stockMovements'));
    const remote: StockMovement[] = [];
    snap.forEach(d => {
      const raw = d.data();
      if (raw && raw.movementId) {
        remote.push(normalizeStockMovement(raw));
      }
    });
    if (remote.length > 0) {
      remote.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      memoryStockMovements = remote;
      saveStorage(STORAGE_KEYS.STOCK_MOVEMENTS, memoryStockMovements);
    }
  } catch (err) {
    console.warn('getStockMovements remote fetch warning:', err);
  }
  return [...memoryStockMovements];
}

// 3. MATERIAL OPERATIONS
export async function saveMaterial(material: Partial<Material>, user?: UserProfile): Promise<Material> {
  const now = new Date().toISOString();
  const isNew = !material.materialId;
  const materialId = material.materialId || `MAT-${Date.now().toString(36).toUpperCase()}`;

  const rawName = (material.name || (material as any).materialName || '').toString().trim();
  const rawSku = (material.sku || (material as any).materialSku || '').toString().trim();

  const cleanMaterial: Material = {
    materialId,
    sku: rawSku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
    name: rawName || 'Untitled Material',
    category: material.category?.trim() || 'General',
    description: material.description || '',
    unit: material.unit || 'Nos',
    imageUrl: material.imageUrl || '',
    preferredVendorId: material.preferredVendorId || '',
    preferredVendorName: material.preferredVendorName || '',
    alternativeVendorIds: material.alternativeVendorIds || [],
    purchasePrice: Number(material.purchasePrice) || 0,
    sellingPrice: Number(material.sellingPrice) || 0,
    openingInventory: Number(material.openingInventory) || 0,
    currentStock: Number(material.currentStock) || 0,
    minimumStockLevel: Number(material.minimumStockLevel) || 10,
    isActive: material.isActive !== undefined ? material.isActive : true,
    createdAt: isNew ? now : (material.createdAt || now),
    updatedAt: now
  };

  const idx = memoryMaterials.findIndex(m => m.materialId === materialId);
  if (idx !== -1) {
    memoryMaterials[idx] = cleanMaterial;
  } else {
    memoryMaterials.unshift(cleanMaterial);
    // If brand new with opening inventory > 0, log opening stock movement
    if (cleanMaterial.currentStock > 0) {
      const initMov: StockMovement = {
        movementId: `MOV-${Date.now()}`,
        date: now,
        timestamp: now,
        materialId: cleanMaterial.materialId,
        materialName: cleanMaterial.name,
        quantity: cleanMaterial.currentStock,
        type: 'IN',
        movementType: 'IN',
        movementReason: 'OPENING_STOCK',
        reason: 'OPENING_STOCK',
        reference: 'INITIAL-OPENING-STOCK',
        user: user?.name || 'Admin',
        userName: user?.name || 'Admin',
        notes: `Opening inventory of ${cleanMaterial.currentStock} ${cleanMaterial.unit}`
      };
      memoryStockMovements.unshift(initMov);
      saveStorage(STORAGE_KEYS.STOCK_MOVEMENTS, memoryStockMovements);
      syncDocToFirestore('stockMovements', initMov.movementId, initMov);
    }
  }

  saveStorage(STORAGE_KEYS.MATERIALS, memoryMaterials);
  await syncDocToFirestore('materials', materialId, cleanMaterial);

  if (user) {
    await writeActivityLog({
      userId: user.userId,
      userName: user.name,
      action: isNew ? 'MATERIAL_CREATED' : 'MATERIAL_UPDATED',
      entityType: 'INVENTORY',
      entityId: materialId,
      newValue: `${cleanMaterial.name} (${cleanMaterial.sku})`
    });
  }

  return cleanMaterial;
}

export async function deleteMaterial(materialId: string, user?: UserProfile): Promise<void> {
  const target = memoryMaterials.find(m => m.materialId === materialId);
  memoryMaterials = memoryMaterials.filter(m => m.materialId !== materialId);
  saveStorage(STORAGE_KEYS.MATERIALS, memoryMaterials);

  try {
    await deleteDoc(doc(db, 'materials', materialId));
  } catch (err) {
    console.warn('deleteDoc materials warning:', err);
  }

  if (user && target) {
    await writeActivityLog({
      userId: user.userId,
      userName: user.name,
      action: 'MATERIAL_DELETED',
      entityType: 'INVENTORY',
      entityId: materialId,
      previousValue: target.name
    });
  }
}

export async function adjustMaterialStock(params: {
  materialId: string;
  quantityChange: number;
  reason: MovementReason;
  reference?: string;
  notes?: string;
  user?: UserProfile;
}): Promise<void> {
  const { materialId, quantityChange, reason, reference, notes, user } = params;
  if (quantityChange === 0) return;

  const matIdx = memoryMaterials.findIndex(m => m.materialId === materialId);
  if (matIdx === -1) throw new Error(`Material ${materialId} not found`);

  const mat = memoryMaterials[matIdx];
  const oldStock = mat.currentStock;
  const newStock = Math.max(0, oldStock + quantityChange);
  const now = new Date().toISOString();

  mat.currentStock = newStock;
  mat.updatedAt = now;
  memoryMaterials[matIdx] = mat;
  saveStorage(STORAGE_KEYS.MATERIALS, memoryMaterials);
  syncDocToFirestore('materials', materialId, { currentStock: newStock, updatedAt: now });

  const movement: StockMovement = {
    movementId: `MOV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    date: now,
    timestamp: now,
    materialId: mat.materialId,
    materialName: mat.name,
    quantity: Math.abs(quantityChange),
    type: quantityChange > 0 ? 'IN' : 'OUT',
    movementType: quantityChange > 0 ? 'IN' : 'OUT',
    movementReason: reason,
    reason: reason,
    reference: reference || 'MANUAL-ADJUSTMENT',
    user: user?.name || 'Inventory Manager',
    userName: user?.name || 'Inventory Manager',
    notes: notes || `Stock adjusted from ${oldStock} to ${newStock} (${quantityChange > 0 ? '+' : ''}${quantityChange})`
  };

  memoryStockMovements.unshift(movement);
  saveStorage(STORAGE_KEYS.STOCK_MOVEMENTS, memoryStockMovements);
  syncDocToFirestore('stockMovements', movement.movementId, movement);

  if (user) {
    await writeActivityLog({
      userId: user.userId,
      userName: user.name,
      action: 'STOCK_ADJUSTED',
      entityType: 'INVENTORY',
      entityId: materialId,
      previousValue: `${oldStock}`,
      newValue: `${newStock} (${reason})`
    });
  }
}

// 4. CATALOGUE / BOM OPERATIONS
export async function saveCatalogue(catalogue: Partial<Catalogue>, user?: UserProfile): Promise<Catalogue> {
  const now = new Date().toISOString();
  const isNew = !catalogue.catalogueId;
  const catalogueId = catalogue.catalogueId || `CAT-${Date.now().toString(36).toUpperCase()}`;

  const cleanCatalogue: Catalogue = {
    catalogueId,
    catalogueCode: catalogue.catalogueCode?.trim() || `PKG-${Math.floor(100 + Math.random() * 900)}`,
    name: catalogue.name?.trim() || 'Untitled Package',
    category: catalogue.category?.trim() || 'Robotics Lab',
    description: catalogue.description || '',
    standardPrice: Number(catalogue.standardPrice) || 0,
    isActive: catalogue.isActive !== undefined ? catalogue.isActive : true,
    items: catalogue.items || [],
    createdAt: isNew ? now : (catalogue.createdAt || now),
    updatedAt: now
  };

  const idx = memoryCatalogues.findIndex(c => c.catalogueId === catalogueId);
  if (idx !== -1) {
    memoryCatalogues[idx] = cleanCatalogue;
  } else {
    memoryCatalogues.unshift(cleanCatalogue);
  }

  saveStorage(STORAGE_KEYS.CATALOGUES, memoryCatalogues);
  await syncDocToFirestore('catalogues', catalogueId, cleanCatalogue);

  if (user) {
    await writeActivityLog({
      userId: user.userId,
      userName: user.name,
      action: isNew ? 'CATALOGUE_CREATED' : 'CATALOGUE_UPDATED',
      entityType: 'CATALOGUE',
      entityId: catalogueId,
      newValue: `${cleanCatalogue.name} (${cleanCatalogue.items?.length || 0} BOM items)`
    });
  }

  return cleanCatalogue;
}

export async function deleteCatalogue(catalogueId: string, user?: UserProfile): Promise<void> {
  const target = memoryCatalogues.find(c => c.catalogueId === catalogueId);
  memoryCatalogues = memoryCatalogues.filter(c => c.catalogueId !== catalogueId);
  saveStorage(STORAGE_KEYS.CATALOGUES, memoryCatalogues);

  try {
    await deleteDoc(doc(db, 'catalogues', catalogueId));
  } catch (err) {
    console.warn('deleteDoc catalogues warning:', err);
  }

  if (user && target) {
    await writeActivityLog({
      userId: user.userId,
      userName: user.name,
      action: 'CATALOGUE_DELETED',
      entityType: 'CATALOGUE',
      entityId: catalogueId,
      previousValue: target.name
    });
  }
}

// 5. VENDOR OPERATIONS
export async function saveVendor(vendor: Partial<Vendor>, user?: UserProfile): Promise<Vendor> {
  const now = new Date().toISOString();
  const isNew = !vendor.vendorId;
  const vendorId = vendor.vendorId || `VEN-${Date.now().toString(36).toUpperCase()}`;

  const cleanVendor: Vendor = {
    vendorId,
    vendorCode: vendor.vendorCode?.trim() || `VND-${Math.floor(100 + Math.random() * 900)}`,
    vendorName: vendor.vendorName?.trim() || 'Untitled Vendor',
    contactPerson: vendor.contactPerson?.trim() || '',
    phone: vendor.phone?.trim() || '',
    email: vendor.email?.trim() || '',
    address: vendor.address?.trim() || '',
    gstNumber: vendor.gstNumber?.trim().toUpperCase() || '',
    materialsSupplied: vendor.materialsSupplied || [],
    paymentTerms: vendor.paymentTerms?.trim() || '30 Days Net',
    isActive: vendor.isActive !== undefined ? vendor.isActive : true,
    notes: vendor.notes || '',
    createdAt: isNew ? now : (vendor.createdAt || now),
    updatedAt: now
  };

  const idx = memoryVendors.findIndex(v => v.vendorId === vendorId);
  if (idx !== -1) {
    memoryVendors[idx] = cleanVendor;
  } else {
    memoryVendors.unshift(cleanVendor);
  }

  saveStorage(STORAGE_KEYS.VENDORS, memoryVendors);
  await syncDocToFirestore('vendors', vendorId, cleanVendor);

  if (user) {
    await writeActivityLog({
      userId: user.userId,
      userName: user.name,
      action: isNew ? 'VENDOR_CREATED' : 'VENDOR_UPDATED',
      entityType: 'VENDOR',
      entityId: vendorId,
      newValue: `${cleanVendor.vendorName} (${cleanVendor.contactPerson})`
    });
  }

  return cleanVendor;
}

export async function deleteVendor(vendorId: string, user?: UserProfile): Promise<void> {
  const target = memoryVendors.find(v => v.vendorId === vendorId);
  memoryVendors = memoryVendors.filter(v => v.vendorId !== vendorId);
  saveStorage(STORAGE_KEYS.VENDORS, memoryVendors);

  try {
    await deleteDoc(doc(db, 'vendors', vendorId));
  } catch (err) {
    console.warn('deleteDoc vendors warning:', err);
  }

  if (user && target) {
    await writeActivityLog({
      userId: user.userId,
      userName: user.name,
      action: 'VENDOR_DELETED',
      entityType: 'VENDOR',
      entityId: vendorId,
      previousValue: target.vendorName
    });
  }
}

// 6. PURCHASE ORDER OPERATIONS
export async function savePurchaseOrder(po: Partial<PurchaseOrder>, user?: UserProfile): Promise<PurchaseOrder> {
  const now = new Date().toISOString();
  const isNew = !po.poId;
  const poId = po.poId || `PO-${Date.now()}`;
  const poNumber = po.poNumber?.trim() || `PO/FS/${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(2)}/${Math.floor(100 + Math.random() * 900)}`;

  // Recalculate totals
  const items = (po.items || []).map((it, idx) => {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unitPrice) || 0;
    const taxRate = Number(it.taxRate) || 18;
    const base = qty * price;
    const taxAmt = Math.round((base * taxRate) / 100);
    return {
      ...it,
      itemId: it.itemId || `POI-${idx + 1}`,
      quantity: qty,
      unitPrice: price,
      taxRate,
      taxAmount: taxAmt,
      totalAmount: base + taxAmt,
      receivedQuantity: Number(it.receivedQuantity) || 0
    };
  });

  const subTotal = items.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);
  const taxTotal = items.reduce((sum, it) => sum + it.taxAmount, 0);
  const grandTotal = subTotal + taxTotal;

  const cleanPO: PurchaseOrder = {
    poId,
    poNumber,
    poDate: po.poDate || now.split('T')[0],
    vendorId: po.vendorId || '',
    vendorName: po.vendorName || '',
    status: po.status || 'PO_GENERATED',
    items,
    subTotal,
    taxTotal,
    grandTotal,
    linkedSalesOrderIds: po.linkedSalesOrderIds || [],
    linkedCatalogueIds: po.linkedCatalogueIds || [],
    notes: po.notes || '',
    deliveryInfo: po.deliveryInfo || 'Central Warehouse, Funscholar Hub',
    termsAndConditions: po.termsAndConditions || 'Payment within 30 days after inspection and GRN signoff.',
    createdBy: po.createdBy || user?.email || 'admin@funscholar.com',
    createdByName: po.createdByName || user?.name || 'Procurement Lead',
    sentAt: po.sentAt,
    createdAt: isNew ? now : (po.createdAt || now),
    updatedAt: now
  };

  const idx = memoryPurchaseOrders.findIndex(p => p.poId === poId);
  if (idx !== -1) {
    memoryPurchaseOrders[idx] = cleanPO;
  } else {
    memoryPurchaseOrders.unshift(cleanPO);
  }

  saveStorage(STORAGE_KEYS.PURCHASE_ORDERS, memoryPurchaseOrders);
  await syncDocToFirestore('purchaseOrders', poId, cleanPO);

  if (user) {
    await writeActivityLog({
      userId: user.userId,
      userName: user.name,
      action: isNew ? 'PO_CREATED' : 'PO_UPDATED',
      entityType: 'PURCHASE_ORDER',
      entityId: poId,
      newValue: `${cleanPO.poNumber} (${cleanPO.vendorName}) - ₹${cleanPO.grandTotal.toLocaleString('en-IN')}`
    });
  }

  return cleanPO;
}

export async function markPurchaseOrderSent(poId: string, user?: UserProfile): Promise<void> {
  const poIdx = memoryPurchaseOrders.findIndex(p => p.poId === poId);
  if (poIdx === -1) throw new Error(`PO ${poId} not found`);

  const now = new Date().toISOString();
  const po = memoryPurchaseOrders[poIdx];
  po.status = 'PO_SENT';
  po.sentAt = now;
  po.updatedAt = now;

  memoryPurchaseOrders[poIdx] = po;
  saveStorage(STORAGE_KEYS.PURCHASE_ORDERS, memoryPurchaseOrders);
  await syncDocToFirestore('purchaseOrders', poId, { status: 'PO_SENT', sentAt: now, updatedAt: now });

  if (user) {
    await writeActivityLog({
      userId: user.userId,
      userName: user.name,
      action: 'PO_SENT_TO_VENDOR',
      entityType: 'PURCHASE_ORDER',
      entityId: poId,
      newValue: `${po.poNumber} sent to ${po.vendorName}`
    });
  }
}

export async function receiveGoodsForPurchaseOrder(params: {
  poId: string;
  receipts: Array<{ materialId: string; receivedQty: number }>;
  grnNumber?: string;
  invoiceNumber?: string;
  notes?: string;
  user?: UserProfile;
}): Promise<void> {
  const { poId, receipts, grnNumber, invoiceNumber, notes, user } = params;
  const poIdx = memoryPurchaseOrders.findIndex(p => p.poId === poId);
  if (poIdx === -1) throw new Error(`PO ${poId} not found`);

  const po = memoryPurchaseOrders[poIdx];
  const now = new Date().toISOString();
  const refCode = grnNumber || invoiceNumber || po.poNumber;

  let allCompleted = true;
  let anyReceived = false;

  for (const item of po.items) {
    const rcv = receipts.find(r => r.materialId === item.materialId);
    const addedQty = rcv ? Math.max(0, Number(rcv.receivedQty) || 0) : 0;

    if (addedQty > 0) {
      anyReceived = true;
      item.receivedQuantity = (item.receivedQuantity || 0) + addedQty;

      // Update physical inventory for this material
      const matIdx = memoryMaterials.findIndex(m => m.materialId === item.materialId);
      if (matIdx !== -1) {
        const mat = memoryMaterials[matIdx];
        const oldStock = mat.currentStock;
        const newStock = oldStock + addedQty;
        mat.currentStock = newStock;
        mat.updatedAt = now;
        memoryMaterials[matIdx] = mat;
        syncDocToFirestore('materials', mat.materialId, { currentStock: newStock, updatedAt: now });

        // Record stock movement (ledger)
        const mov: StockMovement = {
          movementId: `MOV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          date: now,
          timestamp: now,
          materialId: mat.materialId,
          materialName: mat.name,
          quantity: addedQty,
          type: 'IN',
          movementType: 'IN',
          movementReason: 'PURCHASE_RECEIVED',
          reason: 'PURCHASE_RECEIVED',
          reference: refCode,
          purchaseOrderId: po.poId,
          user: user?.name || 'Goods Receiving Officer',
          userName: user?.name || 'Goods Receiving Officer',
          notes: notes || `Goods receipt from PO ${po.poNumber} (${po.vendorName}). Added +${addedQty} ${mat.unit}`
        };
        memoryStockMovements.unshift(mov);
        syncDocToFirestore('stockMovements', mov.movementId, mov);
      }
    }

    if ((item.receivedQuantity || 0) < item.quantity) {
      allCompleted = false;
    }
  }

  if (anyReceived) {
    po.status = allCompleted ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
    po.updatedAt = now;
    memoryPurchaseOrders[poIdx] = po;

    saveStorage(STORAGE_KEYS.PURCHASE_ORDERS, memoryPurchaseOrders);
    saveStorage(STORAGE_KEYS.MATERIALS, memoryMaterials);
    saveStorage(STORAGE_KEYS.STOCK_MOVEMENTS, memoryStockMovements);

    await syncDocToFirestore('purchaseOrders', poId, po);

    if (user) {
      await writeActivityLog({
        userId: user.userId,
        userName: user.name,
        action: 'GOODS_RECEIVED',
        entityType: 'PURCHASE_ORDER',
        entityId: poId,
        newValue: `${po.poNumber} (${po.status}) via ref ${refCode}`
      });
    }
  }
}

export async function cancelPurchaseOrder(poId: string, reason?: string, user?: UserProfile): Promise<void> {
  const poIdx = memoryPurchaseOrders.findIndex(p => p.poId === poId);
  if (poIdx === -1) throw new Error(`PO ${poId} not found`);

  const po = memoryPurchaseOrders[poIdx];
  const now = new Date().toISOString();
  po.status = 'CANCELLED';
  po.notes = po.notes ? `${po.notes} | Cancelled: ${reason || 'No reason specified'}` : `Cancelled: ${reason || 'No reason specified'}`;
  po.updatedAt = now;

  memoryPurchaseOrders[poIdx] = po;
  saveStorage(STORAGE_KEYS.PURCHASE_ORDERS, memoryPurchaseOrders);
  await syncDocToFirestore('purchaseOrders', poId, { status: 'CANCELLED', notes: po.notes, updatedAt: now });

  if (user) {
    await writeActivityLog({
      userId: user.userId,
      userName: user.name,
      action: 'PO_CANCELLED',
      entityType: 'PURCHASE_ORDER',
      entityId: poId,
      newValue: reason || 'Cancelled by user'
    });
  }
}

// 7. SALES ORDER DISPATCH & PHYSICAL INVENTORY DEDUCTION
export async function deductInventoryForOrder(order: Order, user: UserProfile): Promise<void> {
  // Prevent double deduction
  const alreadyDeducted = memoryStockMovements.some(
    m => m.movementReason === 'SALES_ORDER_DISPATCHED' && (m.orderId === order.orderId || m.reference === order.orderNumber)
  );
  if (alreadyDeducted) {
    return;
  }

  const matchedCat = matchOrderToCatalogue(order, memoryCatalogues);
  const catItems = matchedCat?.items || (matchedCat as any)?.bomItems;
  if (!matchedCat || !catItems || catItems.length === 0) {
    return;
  }

  const orderQty = Math.max(
    1,
    Number(order.packageQuantity || order.quantity || (order.items && order.items[0]?.quantity) || 1)
  );
  const flattened = flattenBOM(catItems, orderQty);
  const now = new Date().toISOString();
  const refCode = order.contractNumber || order.purchaseOrderNumber || order.orderNumber;

  let anyChanged = false;

  for (const [matId, reqItem] of flattened.entries()) {
    const matIdx = memoryMaterials.findIndex(m => m.materialId === matId);
    if (matIdx !== -1) {
      const mat = memoryMaterials[matIdx];
      const deductQty = reqItem.quantity;
      const oldStock = mat.currentStock;
      const newStock = Math.max(0, oldStock - deductQty);

      mat.currentStock = newStock;
      mat.updatedAt = now;
      memoryMaterials[matIdx] = mat;
      anyChanged = true;

      syncDocToFirestore('materials', mat.materialId, { currentStock: newStock, updatedAt: now });

      const mov: StockMovement = {
        movementId: `MOV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        date: now,
        timestamp: now,
        materialId: mat.materialId,
        materialName: mat.name,
        quantity: deductQty,
        type: 'OUT',
        movementType: 'OUT',
        movementReason: 'SALES_ORDER_DISPATCHED',
        reason: 'SALES_ORDER_DISPATCHED',
        reference: refCode,
        orderId: order.orderId,
        user: user.name,
        userName: user.name,
        notes: `Deducted on dispatch of order ${order.orderNumber} to ${order.schoolName}`
      };

      memoryStockMovements.unshift(mov);
      syncDocToFirestore('stockMovements', mov.movementId, mov);
    }
  }

  if (anyChanged) {
    saveStorage(STORAGE_KEYS.MATERIALS, memoryMaterials);
    saveStorage(STORAGE_KEYS.STOCK_MOVEMENTS, memoryStockMovements);
  }
}


