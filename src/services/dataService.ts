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
  IssuedCredential
} from '../types';
import {
  INITIAL_ORDERS,
  INITIAL_SCHOOLS,
  INITIAL_AGENTS,
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
  INITIAL_USERS
} from '../data/seedData';
import { db } from '../firebase/config';
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
  onSnapshot
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
  PENDING_OTPS: 'govschool_pending_otps_v3'
};

// Immediately purge stale mock cache from previous sessions
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('govschool_') && !key.endsWith('_v3')) {
        localStorage.removeItem(key);
      }
    });
  }
} catch (_) {}

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse from storage', key, e);
  }
  return fallback;
}

function saveStorage<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Failed to save to storage', key, e);
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

// If storage had fewer orders than the master 121 sheet dataset, re-align to master dataset
if (memoryOrders.length === 0 || memoryOrders.length < 50) {
  memoryOrders = sanitizeOrderData([...INITIAL_ORDERS]);
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
    notificationId: 'NOTIF-002',
    userId: 'user_super_admin',
    type: 'PAYMENT',
    title: 'Payment Received',
    message: '₹70,000 payment received for ORD-2026-00014 (KV Aligarh).',
    orderId: 'ORD-2026-00014',
    isRead: false,
    createdAt: '2026-08-30T17:05:00Z'
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

// Helper to push to Firestore in background without blocking UI
async function syncDocToFirestore(collectionName: string, docId: string, data: any) {
  try {
    await setDoc(doc(db, collectionName, docId), data, { merge: true });
  } catch (e) {
    // Non-fatal if offline
  }
}

async function deleteDocFromFirestore(collectionName: string, docId: string) {
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (e) {
    // Non-fatal if offline
  }
}

// Background initialization to seed Firestore once if empty
let isFirestoreSeeded = false;
export async function initializeFirestoreSeed() {
  if (isFirestoreSeeded) return;
  isFirestoreSeeded = true;
  try {
    const ordersSnap = await getDocs(query(collection(db, 'orders'), limit(1)));
    if (ordersSnap.empty) {
      console.log('Seeding initial data to Firestore...');
      await syncAllDataToFirestore();
      console.log('Firestore initial seed completed.');
    }
  } catch (e: any) {
    // Sandboxed or unauthenticated; local memory layer active
    console.log('Local persistent storage active (Firestore offline/permission notice:', e?.message || e, ')');
  }
}

// Explicit sync helper to push all active memory datasets to Cloud Firestore
export async function syncAllDataToFirestore(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    let count = 0;
    for (const order of memoryOrders) {
      await setDoc(doc(db, 'orders', order.orderId), order, { merge: true });
      count++;
    }
    for (const school of memorySchools) {
      await setDoc(doc(db, 'schools', school.schoolId), school, { merge: true });
      count++;
    }
    for (const agent of memoryAgents) {
      await setDoc(doc(db, 'agents', agent.agentId), agent, { merge: true });
      count++;
    }
    for (const product of memoryProducts) {
      await setDoc(doc(db, 'products', product.productId), product, { merge: true });
      count++;
    }
    for (const user of memoryUsers) {
      await setDoc(doc(db, 'users', user.userId), user, { merge: true });
      count++;
    }
    await setDoc(doc(db, 'settings', 'global'), memorySettings, { merge: true });
    return { success: true, count };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.error('Firestore sync error:', errMsg);
    return { success: false, count: 0, error: errMsg };
  }
}

// Clear all past data and re-initialize purely with the 121 real sheet records
export async function clearAllPastDataAndResyncWithSheet(user: UserProfile): Promise<{ success: boolean; count: number; firestoreSynced: boolean; error?: string }> {
  try {
    if (user.role === 'AGENT') throw new Error('Unauthorized');

    // Wipe cached keys
    Object.values(STORAGE_KEYS).forEach(k => {
      try { localStorage.removeItem(k); } catch (_) {}
    });

    memoryOrders = [...INITIAL_ORDERS];
    memorySchools = [...INITIAL_SCHOOLS];
    memoryAgents = [...INITIAL_AGENTS];
    memoryProducts = [...INITIAL_PRODUCTS];

    saveStorage(STORAGE_KEYS.ORDERS, memoryOrders);
    saveStorage(STORAGE_KEYS.SCHOOLS, memorySchools);
    saveStorage(STORAGE_KEYS.AGENTS, memoryAgents);
    saveStorage(STORAGE_KEYS.PRODUCTS, memoryProducts);

    let firestoreSynced = false;
    try {
      const syncRes = await syncAllDataToFirestore();
      firestoreSynced = syncRes.success;
    } catch (e) {
      console.warn('Firestore sync during reset notice:', e);
    }

    await writeActivityLog({
      userId: user.userId,
      userName: user.name,
      action: 'CLEAR_AND_RESET_SHEET',
      entityType: 'ORDER',
      entityId: 'ALL',
      newValue: `Cleared all past data and initialized exactly ${memoryOrders.length} spreadsheet orders`
    });

    return { success: true, count: memoryOrders.length, firestoreSynced };
  } catch (err: any) {
    return { success: false, count: 0, firestoreSynced: false, error: err.message };
  }
}

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
  // Emit current memory orders immediately so there is zero UI delay
  const initial = memoryOrders.filter(o => !o.isDeleted);
  if (user.role === 'AGENT') {
    onUpdate(initial.filter(o => o.agentId === user.agentId));
  } else {
    onUpdate(initial);
  }

  try {
    const ordersCol = collection(db, 'orders');
    const unsubscribe = onSnapshot(
      ordersCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteList: Order[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Order;
            if (data && data.orderId) {
              remoteList.push(data);
            }
          });

          if (remoteList.length > 0) {
            const mergedMap = new Map<string, Order>();
            memoryOrders.forEach(o => mergedMap.set(o.orderId, o));
            remoteList.forEach(o => mergedMap.set(o.orderId, o));

            memoryOrders = sanitizeOrderData(Array.from(mergedMap.values()));
            saveStorage(STORAGE_KEYS.ORDERS, memoryOrders);

            const active = memoryOrders.filter(o => !o.isDeleted);
            if (user.role === 'AGENT') {
              onUpdate(active.filter(o => o.agentId === user.agentId));
            } else {
              onUpdate(active);
            }
          }
        }
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
  let list = [...memoryOrders].filter(o => !o.isDeleted);

  // STRICT AGENT ISOLATION MANDATE:
  // If user is AGENT, they CANNOT see another agent's orders or unassigned orders.
  if (user.role === 'AGENT') {
    list = list.filter(o => o.agentId === user.agentId);
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
    throw new Error('Agents cannot create orders directly. Please contact operations.');
  }

  const currentCount = memoryOrders.length + 1;
  const orderId = `${memorySettings.orderIdPrefix}-${String(currentCount).padStart(5, '0')}`;
  const now = new Date().toISOString();

  const maxSerial = memoryOrders.reduce((max, o) => Math.max(max, o.serialNumber || 0), 0);
  const serialNumber = maxSerial + 1;
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

  memoryOrders = [newOrder, ...memoryOrders];
  saveStorage(STORAGE_KEYS.ORDERS, memoryOrders);
  syncDocToFirestore('orders', orderId, newOrder);

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
  memoryTimelines = [timelineItem, ...memoryTimelines];
  saveStorage(STORAGE_KEYS.TIMELINES, memoryTimelines);

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
    throw new Error('Agents cannot modify order fields.');
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
  saveStorage(STORAGE_KEYS.ORDERS, memoryOrders);
  syncDocToFirestore('orders', orderId, updated);

  // If agent assignment changed, record specific audit log
  if (updates.agentId && updates.agentId !== existing.agentId) {
    await writeActivityLog({
      userId: user.userId,
      userName: user.name,
      action: 'AGENT_REASSIGNED',
      entityType: 'ORDER',
      entityId: orderId,
      previousValue: `Agent: ${existing.agentName} (${existing.agentId})`,
      newValue: `Agent: ${updated.agentName} (${updated.agentId})`
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

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  comment: string,
  visibleToAgent: boolean,
  user: UserProfile
): Promise<void> {
  const order = memoryOrders.find(o => o.orderId === orderId);
  if (!order) throw new Error('Order not found');

  if (user.role === 'AGENT') {
    throw new Error('Agents cannot update order status.');
  }

  const oldStatus = order.status;
  const now = new Date().toISOString();

  // Update order record
  await updateOrder(orderId, { status: newStatus }, user);

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

  memoryTimelines = [historyItem, ...memoryTimelines];
  saveStorage(STORAGE_KEYS.TIMELINES, memoryTimelines);
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
}

export async function softDeleteOrder(orderId: string, user: UserProfile): Promise<void> {
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    throw new Error('Only administrators can delete orders.');
  }
  const idx = memoryOrders.findIndex(o => o.orderId === orderId);
  if (idx !== -1) {
    memoryOrders[idx].isDeleted = true;
    memoryOrders[idx].updatedAt = new Date().toISOString();
    saveStorage(STORAGE_KEYS.ORDERS, memoryOrders);
    syncDocToFirestore('orders', orderId, { isDeleted: true });

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
): Promise<void> {
  if (user.role === 'AGENT') {
    throw new Error('Agents cannot update dispatch records.');
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
  syncDocToFirestore('dispatches', dispatchRecord.dispatchId, dispatchRecord);

  // Update order's quick status
  await updateOrder(
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
  memoryTimelines = [timelineItem, ...memoryTimelines];
  saveStorage(STORAGE_KEYS.TIMELINES, memoryTimelines);

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
}

export async function markDelivered(
  orderId: string,
  deliveryInput: {
    deliveryDate: string;
    receivedBy: string;
    receiverDesignation?: string;
    deliveryRemarks?: string;
    proofOfDeliveryUrl?: string;
  },
  user: UserProfile
): Promise<void> {
  if (user.role === 'AGENT') {
    throw new Error('Agents cannot record delivery completions.');
  }

  const order = memoryOrders.find(o => o.orderId === orderId);
  if (!order) throw new Error('Order not found');

  const deliveryRecord: DeliveryRecord = {
    deliveryId: `DEL-${Date.now()}`,
    orderId,
    deliveryDate: deliveryInput.deliveryDate,
    receivedBy: deliveryInput.receivedBy,
    receiverDesignation: deliveryInput.receiverDesignation,
    deliveryRemarks: deliveryInput.deliveryRemarks,
    proofOfDeliveryUrl: deliveryInput.proofOfDeliveryUrl,
    createdAt: new Date().toISOString()
  };

  memoryDeliveries = [deliveryRecord, ...memoryDeliveries];
  saveStorage(STORAGE_KEYS.DELIVERIES, memoryDeliveries);
  syncDocToFirestore('deliveries', deliveryRecord.deliveryId, deliveryRecord);

  await updateOrder(
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
    comment: `Material successfully delivered and received by ${deliveryInput.receivedBy} (${deliveryInput.receiverDesignation || 'School Representative'}).`,
    visibleToAgent: true
  };
  memoryTimelines = [timelineItem, ...memoryTimelines];
  saveStorage(STORAGE_KEYS.TIMELINES, memoryTimelines);

  // Notify Agent
  if (order.agentId) {
    const agent = memoryAgents.find(a => a.agentId === order.agentId);
    if (agent && agent.userId) {
      await createNotification({
        userId: agent.userId,
        type: 'DELIVERY',
        title: 'Order Delivered to School',
        message: `Order ${orderId} has been confirmed delivered at ${order.schoolName}. Received by: ${deliveryInput.receivedBy}.`,
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
    newValue: `Delivered on ${deliveryInput.deliveryDate}. Received by ${deliveryInput.receivedBy}`
  });
}

// ----------------------------------------------------
// PAYMENTS SERVICE
// ----------------------------------------------------
export async function addPayment(
  paymentInput: Omit<PaymentTransaction, 'paymentId' | 'createdAt'>,
  user: UserProfile
): Promise<PaymentTransaction> {
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
  syncDocToFirestore('payments', paymentId, newPayment);

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

  await updateOrder(
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
  memoryTimelines = [timelineItem, ...memoryTimelines];
  saveStorage(STORAGE_KEYS.TIMELINES, memoryTimelines);

  // Notify Agent
  if (order.agentId) {
    const agent = memoryAgents.find(a => a.agentId === order.agentId);
    if (agent && agent.userId) {
      await createNotification({
        userId: agent.userId,
        type: 'PAYMENT',
        title: 'Payment Received from School',
        message: `₹${paymentInput.amount.toLocaleString('en-IN')} received for ${order.orderId} (${order.schoolName}). Balance: ₹${newPending.toLocaleString('en-IN')}.`,
        orderId: order.orderId
      });
    }
  }

  await writeActivityLog({
    userId: user.userId,
    userName: user.name,
    action: 'PAYMENT_RECORDED',
    entityType: 'PAYMENT',
    entityId: paymentId,
    newValue: `₹${paymentInput.amount.toLocaleString('en-IN')} for order ${order.orderId}`
  });

  return newPayment;
}

export async function getPaymentsForOrder(orderId: string): Promise<PaymentTransaction[]> {
  return memoryPayments.filter(p => p.orderId === orderId);
}

// ----------------------------------------------------
// DOCUMENTS SERVICE
// ----------------------------------------------------
export async function getDocumentsForOrder(orderId: string, user: UserProfile): Promise<OrderDocument[]> {
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
  syncDocToFirestore('documents', documentId, newDoc);

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
    throw new Error('Agents cannot delete documents.');
  }
  memoryDocuments = memoryDocuments.filter(d => d.documentId !== documentId);
  saveStorage(STORAGE_KEYS.DOCUMENTS, memoryDocuments);
}

// ----------------------------------------------------
// TIMELINE SERVICE
// ----------------------------------------------------
export async function getTimelineForOrder(orderId: string, user: UserProfile): Promise<OrderStatusHistoryItem[]> {
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
export async function getSchools(): Promise<School[]> {
  return [...memorySchools];
}

export async function createSchool(schoolInput: Omit<School, 'schoolId' | 'createdAt' | 'updatedAt'>, user: UserProfile): Promise<School> {
  if (user.role === 'AGENT') throw new Error('Agents cannot create schools.');
  const schoolId = `SCH-${String(memorySchools.length + 1).padStart(3, '0')}`;
  const now = new Date().toISOString();
  const newSchool: School = {
    ...schoolInput,
    schoolId,
    createdAt: now,
    updatedAt: now
  };
  memorySchools = [newSchool, ...memorySchools];
  saveStorage(STORAGE_KEYS.SCHOOLS, memorySchools);
  syncDocToFirestore('schools', schoolId, newSchool);

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
  const idx = memorySchools.findIndex(s => s.schoolId === schoolId);
  if (idx === -1) throw new Error('School not found');
  const updated = { ...memorySchools[idx], ...updates, updatedAt: new Date().toISOString() };
  memorySchools[idx] = updated;
  saveStorage(STORAGE_KEYS.SCHOOLS, memorySchools);
  syncDocToFirestore('schools', schoolId, updated);
  return updated;
}

export async function getAgents(): Promise<Agent[]> {
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
  if (idx === -1) throw new Error('Agent not found');
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
  return [...memoryUsers];
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
  syncDocToFirestore('users', userId, newUser);

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
): Promise<void> {
  if (adminUser.role !== 'SUPER_ADMIN') {
    throw new Error('SECURITY POLICY: Password reset can ONLY be performed by the Super Admin.');
  }
  const idx = memoryUsers.findIndex(u => u.userId === userId);
  if (idx === -1) throw new Error('User account not found');

  memoryUsers[idx].password = newPass.trim();
  memoryUsers[idx].updatedAt = new Date().toISOString();
  saveStorage(STORAGE_KEYS.USERS, memoryUsers);
  syncDocToFirestore('users', userId, { password: newPass.trim(), updatedAt: memoryUsers[idx].updatedAt });

  await writeActivityLog({
    userId: adminUser.userId,
    userName: adminUser.name,
    action: 'PASSWORD_RESET',
    entityType: 'USER',
    entityId: userId,
    newValue: `Super Admin reset credentials for ${memoryUsers[idx].email}`
  });
}

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
  syncDocToFirestore('users', userId, updatedUser);

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
  return { ...memorySettings };
}

export async function updateSystemSettings(newSettings: Partial<SystemSettings>, user: UserProfile): Promise<SystemSettings> {
  if (user.role !== 'SUPER_ADMIN') {
    throw new Error('Only Super Admin can adjust system-wide settings.');
  }
  memorySettings = { ...memorySettings, ...newSettings };
  saveStorage(STORAGE_KEYS.SETTINGS, memorySettings);
  syncDocToFirestore('settings', 'global', memorySettings);
  return memorySettings;
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

