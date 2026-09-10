/**
 * Core TypeScript Definitions for Government School Order Management & Agent Portal
 */

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'DATA_ENTRY_OPERATOR' | 'ACCOUNTS' | 'DISPATCH' | 'AGENT';

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  phone?: string;
  role: UserRole;
  agentId?: string; // Links to Agent if role is AGENT
  agentCode?: string;
  state?: string;
  isActive: boolean;
  issuedBy?: string; // Super Admin who issued credentials
  issuedAt?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  mustChangePassword?: boolean;
  // The Firebase Authentication UID for this account, once a real session has
  // been established for it. Firestore's security rules key role lookups off
  // request.auth.uid, so this is also mirrored as the doc ID at users/{uid}.
  firebaseUid?: string;
}

export interface IssuedCredential {
  userId: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  role: UserRole;
  agentId?: string;
  agentCode?: string;
  state?: string;
  phone?: string;
  isActive: boolean;
  issuedBy: string;
  issuedAt: string;
  notes?: string;
}

export interface Agent {
  agentId: string;
  agentCode: string; // e.g., AGT-0001
  name: string;
  email: string;
  phone: string;
  state?: string;
  companyName?: string;
  address?: string;
  isActive: boolean;
  userId?: string;
  notes?: string;
  commissionRate?: number; // Optional internal commission percentage
  commissionPercentage?: number;
  createdAt: string;
  updatedAt: string;
}

export type SchoolType = 'Kendriya Vidyalaya' | 'Jawahar Navodaya Vidyalaya' | 'PM SHRI School' | 'Government School' | 'State Model School' | 'Other';

export interface School {
  schoolId: string;
  schoolName: string;
  schoolType: SchoolType;
  schoolCode?: string;
  udiseCode?: string;
  address?: string;
  city?: string;
  district?: string;
  state: string;
  pinCode?: string;
  pincode?: string;
  principalName?: string;
  contactPerson?: string;
  phone?: string;
  contactPhone?: string;
  email?: string;
  region?: string;
  status?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  productId: string;
  name: string;
  category: string;
  subcategory?: string;
  description?: string;
  sku?: string;
  hsnCode?: string;
  unit?: string;
  defaultPrice?: number;
  standardPrice?: number;
  taxRate?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'PO_PENDING'
  | 'PO_RECEIVED'
  | 'PO_VERIFIED'
  | 'PROCESSING'
  | 'READY_FOR_DISPATCH'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'ON_HOLD';

export type PaymentStatus =
  | 'NOT_INVOICED'
  | 'INVOICE_GENERATED'
  | 'PAYMENT_PENDING'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE';

export type DispatchStatus =
  | 'NOT_READY'
  | 'READY'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'DELIVERED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface OrderItem {
  itemId: string;
  orderId: string;
  productId?: string;
  productName: string;
  category: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // in %
  taxAmount: number;
  totalAmount: number;
}

export interface Order {
  serialNumber?: number; // Independent sequential integer: 1, 2, 3...
  orderId: string; // e.g. ORD-2026-00001
  orderNumber: string;
  financialYear: string; // e.g. "2026-27"
  orderDate: string; // YYYY-MM-DD

  // Agent reference
  agentId: string;
  agentName: string;
  agentCode: string;

  // School reference
  schoolId: string;
  schoolName: string;
  schoolType: SchoolType;
  schoolCode?: string;
  state?: string;
  district?: string;
  schoolAddress?: string;
  principalName?: string;
  schoolContactPhone?: string;
  agentCommissionPercentage?: number;

  // Order categorisation
  orderType: string; // e.g., "GeM Direct", "GeM Bid", "Custom"
  category: string; // e.g., "ATL Lab", "Robotics Kit", "Science Kit"

  // GeM / Purchase Order details
  purchaseOrderNumber: string;
  purchaseOrderDate?: string;
  bidNumber?: string;
  contractNumber?: string;
  company?: string;
  bidSubmissionLastDate?: string;
  l1CompanyPrice?: string;
  l2CompanyPrice?: string;
  l3CompanyPrice?: string;

  // Financials
  orderValue: number;
  taxAmount: number;
  grossOrderValue: number;

  // Statuses
  status: OrderStatus;
  priority?: Priority;

  // Dispatch details
  expectedDispatchDate?: string;
  expectedDeliveryDate?: string;
  dispatchStatus: DispatchStatus;
  deliveryStatus: 'Pending' | 'In Transit' | 'Delivered' | 'Returned';
  actualDeliveryDate?: string;

  // Courier info & Logistics Documents
  courierName?: string; // "Delhivery", "India post", etc.
  docketNumber?: string; // Tracking number
  numberOfBoxes?: number | string;
  dispatchDate?: string;
  gemOrderCopyUrl?: string;
  gemOrderCopyFileName?: string;
  cnCopyUrl?: string; // Consignment Note (CN) / LR attachment
  cnCopyFileName?: string;
  podCopyUrl?: string; // Proof of Delivery (POD) attachment
  podCopyFileName?: string;

  // Invoice, E-Way Bill & Payments
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceStatus?: 'PENDING' | 'UPLOADED' | 'VERIFIED';
  gemInvoiceUrl?: string;
  gemInvoiceFileName?: string;
  ewayBillUrl?: string;
  ewayBillFileName?: string;
  companyInvoiceUrl?: string;
  companyInvoiceFileName?: string;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  amountReceived: number;
  amountPending: number;
  lastPaymentDate?: string;
  expectedPaymentDate?: string;

  // Items
  items?: OrderItem[];

  // Metadata
  createdBy: string;
  createdByName?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;

  // Notes
  internalNotes?: string;
  agentVisibleNotes?: string;
  callingStatus?: string; // Historical sheet call log note

  // Flags
  isArchived?: boolean;
  isDeleted?: boolean;
}

export interface PaymentTransaction {
  paymentId: string;
  orderId: string;
  paymentDate: string;
  amount: number;
  paymentMode: 'NEFT' | 'RTGS' | 'IMPS' | 'Cheque' | 'DD' | 'PFMS' | 'Other';
  transactionReference: string;
  bankReference?: string;
  remarks?: string;
  proofDocumentId?: string;
  createdBy: string;
  createdAt: string;
}

export interface DispatchRecord {
  dispatchId: string;
  orderId: string;
  dispatchDate: string;
  dispatchMode: 'Courier' | 'India Post' | 'Transport' | 'Company Vehicle' | 'Other';
  courierName: string;
  trackingNumber: string;
  lrNumber?: string;
  numberOfBoxes?: number | string;
  dispatchFrom?: string;
  deliveryTo?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  dispatchRemarks?: string;
  dispatchDocumentUrl?: string;
  createdAt: string;
}

export interface DeliveryRecord {
  deliveryId: string;
  orderId: string;
  deliveryDate: string;
  receivedBy: string;
  receiverDesignation?: string;
  deliveryRemarks?: string;
  proofOfDeliveryUrl?: string;
  createdAt: string;
}

export interface OrderDocument {
  documentId: string;
  orderId: string;
  documentType:
    | 'GeM Order Copy'
    | 'Purchase Order'
    | 'Quotation'
    | 'Invoice'
    | 'Dispatch Receipt'
    | 'LR'
    | 'Courier Receipt'
    | 'Delivery Proof'
    | 'Delivery Challan'
    | 'Payment Proof'
    | 'GeM Invoice'
    | 'E-Way Bill'
    | 'Company Tax Invoice'
    | 'Consignment Note (CN)'
    | 'Proof of Delivery (POD)'
    | 'GeM Consignee Receipt (CRAC)'
    | 'Other';
  fileName: string;
  fileUrl: string;
  fileSize?: string;
  uploadedBy: string;
  uploadedAt: string;
  visibleToAgent: boolean;
}

export interface NotificationItem {
  notificationId: string;
  userId: string;
  type: 'ORDER_STATUS' | 'DISPATCH' | 'DELIVERY' | 'PAYMENT' | 'ALERT' | string;
  title: string;
  message: string;
  orderId?: string;
  isRead: boolean;
  priority?: string;
  createdAt: string;
}

export type AppNotification = NotificationItem;

export interface AuditLog {
  logId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  entityType: 'ORDER' | 'PAYMENT' | 'DISPATCH' | 'DOCUMENT' | 'USER' | 'AGENT' | 'SCHOOL' | string;
  entityId: string;
  previousValue?: string;
  newValue?: string;
  changes?: any;
  timestamp: string;
  ipAddress?: string;
}

export interface ActivityLog {
  logId: string;
  userId: string;
  userName: string;
  action: string;
  entityType: 'ORDER' | 'PAYMENT' | 'DISPATCH' | 'DOCUMENT' | 'USER' | 'AGENT' | 'SCHOOL';
  entityId: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
  ipAddress?: string;
}

export interface OrderStatusHistoryItem {
  historyId: string;
  orderId: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  changedBy: string;
  changedByName: string;
  changedAt: string;
  comment?: string;
  visibleToAgent: boolean;
}

export interface SystemSettings {
  orderIdPrefix: string;
  currentFinancialYear: string;
  availableFinancialYears: string[];
  categories: string[];
  schoolTypes: SchoolType[];
  paymentModes: string[];
  dispatchModes: string[];
  couriers: string[];
  companies: string[];
}
