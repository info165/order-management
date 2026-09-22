/**
 * Inventory, BOM, Procurement & Vendor Master Type Definitions
 */

export interface Material {
  firestoreDocId?: string;  // Explicit Firestore doc ID for delete and sync reliability
  materialId: string;       // e.g. "MAT-001"
  sku: string;              // e.g. "SKU-MTR-01"
  name: string;             // e.g. "High-Torque DC Geared Motor 12V"
  category: string;         // e.g. "Motors & Actuators", "Sensors", "Controllers", "Structural", "Consumables"
  description?: string;
  unit: string;             // "Nos", "Sets", "Pcs", "Meters", "Kg"
  imageUrl?: string;        // URL or base64 preview
  preferredVendorId?: string;
  preferredVendorName?: string;
  alternativeVendorIds?: string[];
  purchasePrice: number;    // Estimated/standard purchase cost per unit (INR)
  sellingPrice?: number;    // Reference price
  openingInventory: number; // Initial opening stock
  currentStock: number;     // Physical stock in warehouse
  minimumStockLevel: number;// Minimum safety reorder threshold
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BOMItem {
  id?: string;               // Unique row ID
  itemId?: string;           // Alias for id
  materialId: string;       // References Material.materialId
  materialName?: string;    // Denormalized for fast display
  sku?: string;
  unit?: string;
  quantity?: number;        // Required units per parent unit
  quantityPerCatalogue?: number; // Alias for quantity
  unitCostOverride?: number;
  subComponents?: BOMItem[];// Hierarchical nested sub-materials/components
  subItems?: BOMItem[];     // Alias for subComponents
}

export interface Catalogue {
  firestoreDocId?: string;
  catalogueId: string;      // e.g. "CAT-ATL-01"
  catalogueCode?: string;   // e.g. "ATL-PKG-A"
  code?: string;            // Alias for catalogueCode
  name: string;             // e.g. "Robotics & AI Kit Package"
  category: string;         // Matches Order.category, e.g. "ATL Lab", "Robotics Kit", "Composite Skill Lab"
  description?: string;
  salesOrderPkgKeywords?: string[];
  standardPrice?: number;
  totalBomCost?: number;
  items: BOMItem[];         // Hierarchical Bill of Materials
  bomItems?: BOMItem[];     // Alias for items
  isCustomCatalogue?: boolean; // Marked as bespoke / custom catalogue
  customDetails?: string;   // Specific custom requirements, component adjustments or instructions
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  firestoreDocId?: string;
  vendorId: string;         // e.g. "VEN-001"
  vendorCode: string;       // e.g. "VND-TECH-01"
  vendorName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city?: string;
  state?: string;
  gstNumber: string;
  materialsSupplied?: string[]; // Array of materialIds
  suppliedMaterialIds?: string[]; // Alias for materialsSupplied
  paymentTerms?: string;    // e.g. "Net 30", "100% Against Delivery"
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type POStatus =
  | 'DRAFT'
  | 'PO_GENERATED'
  | 'PO_SENT'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export interface PurchaseOrderItem {
  itemId: string;
  materialId: string;
  materialName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;          // in % (e.g. 18%)
  taxPercent?: number;       // Alias for taxRate
  taxAmount?: number;
  lineTotal?: number;        // Line total inclusive of tax
  totalAmount?: number;
  receivedQuantity: number; // Received so far
}

export type POItem = PurchaseOrderItem;

export interface PurchaseOrder {
  firestoreDocId?: string;
  poId: string;             // e.g. "PO-2026-0001"
  poNumber: string;         // Display number e.g. "PO/FS/26-27/001"
  poDate: string;           // YYYY-MM-DD
  expectedDeliveryDate?: string;
  deliveryDate?: string;
  vendorId: string;
  vendorName: string;
  status: POStatus;
  items: PurchaseOrderItem[];
  subtotal?: number;
  subTotal?: number;
  taxTotal: number;
  grandTotal: number;
  deliveryAddress?: string;
  deliveryInfo?: string;
  paymentTerms?: string;
  termsAndConditions?: string;
  linkedSalesOrderIds?: string[]; // Order IDs that triggered this procurement requirement
  linkedCatalogueIds?: string[];  // Catalogues requiring these items
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  sentAt?: string;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type MovementType = 'IN' | 'OUT';

export type MovementReason =
  | 'OPENING_STOCK'
  | 'PURCHASE_RECEIVED'
  | 'SALES_ORDER_RESERVED'
  | 'SALES_ORDER_DISPATCHED'
  | 'MANUAL_ADJUSTMENT'
  | 'STOCK_ADJUSTMENT'
  | 'RETURN'
  | 'RETURN_FROM_CUSTOMER'
  | 'DAMAGED'
  | 'DAMAGED_SCRAP'
  | 'TRANSFER';

export interface StockMovement {
  firestoreDocId?: string;
  movementId: string;
  date?: string;             // ISO datetime
  timestamp?: string;        // ISO datetime
  materialId: string;
  materialName: string;
  sku?: string;
  quantity: number;
  type?: MovementType;
  movementType?: MovementType;
  movementReason?: MovementReason;
  reason?: MovementReason;
  reference: string;        // PO number, Order Number, GeM Contract ID
  orderId?: string;
  poId?: string;
  purchaseOrderId?: string;
  user?: string;
  userName?: string;
  notes?: string;
}

export interface MaterialRequirement {
  materialId: string;
  materialName?: string;
  sku?: string;
  unit?: string;
  preferredVendorName?: string;
  preferredVendorId?: string;
  material: Material;
  grossRequired: number;     // Total required by active sales orders
  physicalStock: number;     // Current warehouse stock
  currentStock?: number;     // Alias for physicalStock
  reservedStock: number;     // Allocated to in-process / ready orders
  availableStock: number;    // physicalStock - reservedStock
  incomingPOStock: number;   // On confirmed POs (PO_GENERATED, PO_SENT, PARTIALLY_RECEIVED)
  incomingOnPOs?: number;    // Alias for incomingPOStock
  netPurchaseRequirement: number; // Math.max(0, grossRequired - (physicalStock - reservedStock) - incomingPOStock)
  netRequirement?: number;   // Alias for netPurchaseRequirement
  estimatedCost?: number;
  affectedOrderCount: number;
  orderBreakdown?: Array<{
    orderId: string;
    orderNumber: string;
    catalogueName: string;
    requiredQty: number;
    quantityRequired?: number;
    schoolName: string;
    status: string;
    orderStatus?: string;
  }>;
  linkedOrders: Array<{
    orderId: string;
    orderNumber: string;
    catalogueName: string;
    requiredQty: number;
    quantityRequired?: number;
    schoolName: string;
    status: string;
    orderStatus?: string;
  }>;
}

export type OrderProcurementStatus =
  | 'NOT_REQUIRED'
  | 'PROCUREMENT_REQUIRED'
  | 'PO_PLACED'
  | 'PARTIALLY_RECEIVED'
  | 'READY_TO_PACK'
  | 'PACKED'
  | 'DISPATCHED';
