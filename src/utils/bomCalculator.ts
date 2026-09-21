import {
  Catalogue,
  BOMItem,
  Material,
  Order,
  PurchaseOrder,
  MaterialRequirement,
  OrderProcurementStatus
} from '../types';

export type MaterialRequirementSummary = MaterialRequirement;

/**
 * Recursively flattens a hierarchical BOM tree into a flat map of materialId -> unitQuantity
 * For example:
 * Robotics Kit
 *   ├── Motor — 4
 *   ├── Sensor — 2
 *   └── Battery Pack (qty 1)
 *        ├── Battery — 2 (yields 1 * 2 = 2 Batteries)
 *        └── Connector — 1 (yields 1 * 1 = 1 Connector)
 */
export function flattenBOM(
  items: BOMItem[],
  multiplier: number = 1
): Map<string, { quantity: number; materialName: string; sku?: string; unit?: string }> {
  const result = new Map<string, { quantity: number; materialName: string; sku?: string; unit?: string }>();

  function traverse(itemList: BOMItem[], currentMultiplier: number) {
    for (const item of (itemList || [])) {
      if (!item) continue;
      const unitQty = Number(item.quantity ?? item.quantityPerCatalogue ?? 1);
      const itemQty = unitQty * currentMultiplier;

      // Record this material itself if materialId is defined
      if (item.materialId) {
        const existing = result.get(item.materialId);
        if (existing) {
          existing.quantity += itemQty;
        } else {
          result.set(item.materialId, {
            quantity: itemQty,
            materialName: item.materialName || (item as any).name || 'Material',
            sku: item.sku,
            unit: item.unit || 'Nos'
          });
        }
      }

      // If item has sub-components or sub-materials, recurse through them
      const subs = (item.subComponents && item.subComponents.length > 0)
        ? item.subComponents
        : (item.subItems && item.subItems.length > 0)
          ? item.subItems
          : [];

      if (subs.length > 0) {
        traverse(subs, itemQty);
      }
    }
  }

  traverse(items || [], multiplier);
  return result;
}

/**
 * Finds the best matching Catalogue for a Sales Order based on catalogueId, category or item name
 */
export function matchOrderToCatalogue(order: Order, catalogues: Catalogue[]): Catalogue | null {
  if (!catalogues || catalogues.length === 0) return null;

  // 1. Direct ID match
  if (order.catalogueId) {
    const found = catalogues.find(c => c.catalogueId === order.catalogueId);
    if (found) return found;
  }

  // 2. Direct Catalogue Name / Code match
  if (order.catalogueName) {
    const nameNorm = order.catalogueName.trim().toLowerCase();
    const found = catalogues.find(
      c =>
        c.name.trim().toLowerCase() === nameNorm ||
        (c.catalogueCode || c.code || '').trim().toLowerCase() === nameNorm
    );
    if (found) return found;
  }

  // 3. Category match from Sales Order (Package / Catalogue name)
  if (order.category) {
    const catNorm = order.category.trim().toLowerCase();

    // 3a. Exact match on Catalogue Name or Code
    const exactNameMatch = catalogues.find(
      c =>
        c.name.trim().toLowerCase() === catNorm ||
        (c.catalogueCode || c.code || '').trim().toLowerCase() === catNorm
    );
    if (exactNameMatch) return exactNameMatch;

    // 3b. Keyword match (salesOrderPkgKeywords)
    const keywordMatch = catalogues.find(c => {
      if (!c.salesOrderPkgKeywords || c.salesOrderPkgKeywords.length === 0) return false;
      return c.salesOrderPkgKeywords.some(kw => {
        const kwNorm = kw.trim().toLowerCase();
        return kwNorm === catNorm || catNorm.includes(kwNorm) || kwNorm.includes(catNorm);
      });
    });
    if (keywordMatch) return keywordMatch;

    // 3c. Exact match on Catalogue Category
    const exactCategoryMatch = catalogues.find(
      c => (c.category || '').trim().toLowerCase() === catNorm
    );
    if (exactCategoryMatch) return exactCategoryMatch;

    // 3d. Partial match on Name or Category
    const partialMatch = catalogues.find(
      c =>
        c.name.trim().toLowerCase().includes(catNorm) ||
        catNorm.includes(c.name.trim().toLowerCase()) ||
        (c.category && (c.category.trim().toLowerCase().includes(catNorm) || catNorm.includes(c.category.trim().toLowerCase())))
    );
    if (partialMatch) return partialMatch;
  }

  // 4. Match against order item name if available
  if (order.items && order.items.length > 0) {
    for (const it of order.items) {
      const itName = (it.productName || it.category || '').toLowerCase();
      if (!itName) continue;
      const match = catalogues.find(
        c => c.name.toLowerCase().includes(itName) || (c.category && c.category.toLowerCase().includes(itName))
      );
      if (match) return match;
    }
  }

  // Fallback to first active catalogue if none matches
  return catalogues.find(c => c.isActive) || catalogues[0] || null;
}

/**
 * Calculates complete inventory and procurement requirements across all materials
 * Supports either (materials, catalogues, orders, purchaseOrders) or (orders, catalogues, materials, purchaseOrders)
 */
export function calculateMaterialRequirements(
  arg1: Material[] | Order[],
  catalogues: Catalogue[],
  arg3: Order[] | Material[],
  purchaseOrders: PurchaseOrder[]
): MaterialRequirement[] {
  let materials: Material[] = [];
  let orders: Order[] = [];

  // Intelligently detect if materials or orders was passed first
  const isFirstMaterials = Array.isArray(arg1) && (
    arg1.length === 0 ||
    'currentStock' in (arg1[0] as any) ||
    'purchasePrice' in (arg1[0] as any) ||
    !('orderNumber' in (arg1[0] as any) || 'orderId' in (arg1[0] as any) || 'financialYear' in (arg1[0] as any))
  );

  if (isFirstMaterials) {
    materials = (arg1 as Material[]) || [];
    orders = (arg3 as Order[]) || [];
  } else {
    orders = (arg1 as Order[]) || [];
    materials = (arg3 as Material[]) || [];
  }

  // Map of materialId -> MaterialRequirement accumulator
  const reqMap = new Map<
    string,
    {
      grossRequired: number;
      reservedStock: number;
      affectedOrderCount: number;
      linkedOrders: MaterialRequirement['linkedOrders'];
      materialName?: string;
      sku?: string;
      unit?: string;
    }
  >();

  // Initialize for all active materials
  for (const mat of (materials || [])) {
    if (!mat || !mat.materialId) continue;
    reqMap.set(mat.materialId, {
      grossRequired: 0,
      reservedStock: 0,
      affectedOrderCount: 0,
      linkedOrders: [],
      materialName: mat.name || (mat as any).materialName,
      sku: mat.sku,
      unit: mat.unit
    });
  }

  // 1. Tally gross requirement and reservation from Sales Orders
  // Cancelled orders are removed from demand automatically
  const activeOrders = (orders || []).filter(
    o => o && !o.isDeleted && o.status !== 'CANCELLED' && o.status !== 'CLOSED'
  );

  for (const order of activeOrders) {
    const matchedCatalogue = matchOrderToCatalogue(order, catalogues);
    const catItems = matchedCatalogue?.items || (matchedCatalogue as any)?.bomItems;
    if (!matchedCatalogue || !catItems || catItems.length === 0) {
      continue;
    }

    // Determine multiplier (packageQuantity or quantity or items[0].quantity, default 1)
    const orderQty = Math.max(
      1,
      Number(order.packageQuantity || order.quantity || (order.items && order.items[0]?.quantity) || 1)
    );
    const flattened = flattenBOM(catItems, orderQty);

    const isDispatched = order.status === 'DISPATCHED' || order.status === 'DELIVERED';
    const isReserved = order.status === 'PROCESSING' || order.status === 'READY_FOR_DISPATCH';

    for (const [matId, reqItem] of flattened.entries()) {
      if (!matId) continue;
      let entry = reqMap.get(matId);
      if (!entry) {
        entry = {
          grossRequired: 0,
          reservedStock: 0,
          affectedOrderCount: 0,
          linkedOrders: [],
          materialName: reqItem.materialName,
          sku: reqItem.sku,
          unit: reqItem.unit
        };
        reqMap.set(matId, entry);
      }

      // If already dispatched, physical stock was already decremented; not in gross pending requirement
      if (!isDispatched) {
        entry.grossRequired += reqItem.quantity;
        entry.affectedOrderCount += 1;
        entry.linkedOrders.push({
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          catalogueName: matchedCatalogue.name,
          requiredQty: reqItem.quantity,
          quantityRequired: reqItem.quantity,
          schoolName: order.schoolName,
          status: order.status,
          orderStatus: order.status
        });

        // If order is packed or ready for dispatch, reserve this stock
        if (isReserved) {
          entry.reservedStock += reqItem.quantity;
        }
      }
    }
  }

  // 2. Tally incoming confirmed Purchase Orders
  const incomingMap = new Map<string, number>();
  const activePOs = (purchaseOrders || []).filter(
    po => po && (po.status === 'PO_GENERATED' || po.status === 'PO_SENT' || po.status === 'PARTIALLY_RECEIVED')
  );

  for (const po of activePOs) {
    if (!po.items) continue;
    for (const it of po.items) {
      if (!it || !it.materialId) continue;
      const remainingIncoming = Math.max(0, (it.quantity || 0) - (it.receivedQuantity || 0));
      incomingMap.set(it.materialId, (incomingMap.get(it.materialId) || 0) + remainingIncoming);
    }
  }

  // 3. Assemble final MaterialRequirement array
  const result: MaterialRequirement[] = [];
  const processedMaterialIds = new Set<string>();

  for (const mat of (materials || [])) {
    if (!mat || !mat.materialId) continue;
    processedMaterialIds.add(mat.materialId);

    const data = reqMap.get(mat.materialId) || {
      grossRequired: 0,
      reservedStock: 0,
      affectedOrderCount: 0,
      linkedOrders: []
    };

    const physicalStock = Number(mat.currentStock) || 0;
    const reservedStock = Math.min(physicalStock, data.reservedStock || 0);
    const availableStock = Math.max(0, physicalStock - reservedStock);
    const incomingPOStock = incomingMap.get(mat.materialId) || 0;

    // Formula from requirement 5:
    // Net Requirement = Gross Requirement - (Physical Stock - Reserved Stock) - Incoming Stock
    const netPurchaseRequirement = Math.max(0, (data.grossRequired || 0) - availableStock - incomingPOStock);
    const estimatedCost = netPurchaseRequirement * (Number(mat.purchasePrice) || 0);
    const matName = mat.name || (mat as any).materialName || data.materialName || 'Unnamed Material';
    const matSku = mat.sku || (mat as any).materialSku || data.sku || '';
    const matUnit = mat.unit || data.unit || 'Nos';

    result.push({
      materialId: mat.materialId,
      materialName: matName,
      sku: matSku,
      unit: matUnit,
      preferredVendorName: mat.preferredVendorName || '',
      preferredVendorId: mat.preferredVendorId || '',
      material: {
        ...mat,
        name: matName,
        sku: matSku,
        unit: matUnit
      },
      grossRequired: data.grossRequired || 0,
      physicalStock,
      currentStock: physicalStock,
      reservedStock,
      availableStock,
      incomingPOStock,
      incomingOnPOs: incomingPOStock,
      netPurchaseRequirement,
      netRequirement: netPurchaseRequirement,
      estimatedCost,
      affectedOrderCount: data.affectedOrderCount || 0,
      orderBreakdown: data.linkedOrders || [],
      linkedOrders: data.linkedOrders || []
    });
  }

  // Also include any BOM materials from active orders not yet present in materials catalog
  for (const [matId, data] of reqMap.entries()) {
    if (processedMaterialIds.has(matId)) continue;

    const incomingPOStock = incomingMap.get(matId) || 0;
    const netPurchaseRequirement = Math.max(0, (data.grossRequired || 0) - incomingPOStock);
    const matName = data.materialName || `Component ${matId}`;
    const matSku = data.sku || matId;
    const matUnit = data.unit || 'Nos';

    result.push({
      materialId: matId,
      materialName: matName,
      sku: matSku,
      unit: matUnit,
      preferredVendorName: '',
      preferredVendorId: '',
      material: {
        materialId: matId,
        sku: matSku,
        name: matName,
        category: 'General',
        unit: matUnit,
        purchasePrice: 0,
        openingInventory: 0,
        currentStock: 0,
        minimumStockLevel: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      grossRequired: data.grossRequired || 0,
      physicalStock: 0,
      currentStock: 0,
      reservedStock: 0,
      availableStock: 0,
      incomingPOStock,
      incomingOnPOs: incomingPOStock,
      netPurchaseRequirement,
      netRequirement: netPurchaseRequirement,
      estimatedCost: 0,
      affectedOrderCount: data.affectedOrderCount || 0,
      orderBreakdown: data.linkedOrders || [],
      linkedOrders: data.linkedOrders || []
    });
  }

  return result;
}

/**
 * Computes the order-level procurement status
 */
export function getOrderProcurementStatus(
  order: Order,
  catalogue: Catalogue | null,
  materials: Material[],
  purchaseOrders: PurchaseOrder[]
): {
  status: OrderProcurementStatus;
  label: string;
  items: Array<{
    materialId: string;
    materialName: string;
    unit: string;
    requiredQty: number;
    allocatedQty: number;
    dispatchedQty: number;
    stockAvailable: number;
    shortage: number;
  }>;
} {
  if (order.status === 'DISPATCHED' || order.status === 'DELIVERED') {
    return {
      status: 'DISPATCHED',
      label: 'Dispatched',
      items: []
    };
  }

  if (order.status === 'CANCELLED' || order.status === 'CLOSED') {
    return {
      status: 'NOT_REQUIRED',
      label: 'Not Required',
      items: []
    };
  }

  const catItems = catalogue?.items || (catalogue as any)?.bomItems;
  if (!catalogue || !catItems || catItems.length === 0) {
    return {
      status: 'NOT_REQUIRED',
      label: 'No BOM Linked',
      items: []
    };
  }

  const orderQty = Math.max(
    1,
    Number(order.packageQuantity || order.quantity || (order.items && order.items[0]?.quantity) || 1)
  );
  const flattened = flattenBOM(catItems, orderQty);
  const isPackedOrReserved = order.status === 'PROCESSING' || order.status === 'READY_FOR_DISPATCH';

  const itemsBreakdown: Array<{
    materialId: string;
    materialName: string;
    unit: string;
    requiredQty: number;
    allocatedQty: number;
    dispatchedQty: number;
    stockAvailable: number;
    shortage: number;
  }> = [];

  let hasShortage = false;
  let hasAnyStock = false;

  for (const [matId, reqItem] of flattened.entries()) {
    const mat = materials.find(m => m.materialId === matId);
    const currentStock = mat ? mat.currentStock : 0;
    const allocated = isPackedOrReserved ? Math.min(reqItem.quantity, currentStock) : 0;
    const shortage = Math.max(0, reqItem.quantity - currentStock);

    if (shortage > 0) hasShortage = true;
    if (currentStock > 0) hasAnyStock = true;

    itemsBreakdown.push({
      materialId: matId,
      materialName: reqItem.materialName,
      unit: reqItem.unit || 'Nos',
      requiredQty: reqItem.quantity,
      allocatedQty: allocated,
      dispatchedQty: 0,
      stockAvailable: currentStock,
      shortage
    });
  }

  if (isPackedOrReserved && !hasShortage) {
    return {
      status: 'READY_TO_PACK',
      label: 'Ready to Pack',
      items: itemsBreakdown
    };
  }

  if (!hasShortage) {
    return {
      status: 'READY_TO_PACK',
      label: 'Stock Available',
      items: itemsBreakdown
    };
  }

  // Check if PO exists for shortages
  const activePOs = purchaseOrders.filter(
    p => p.status === 'PO_GENERATED' || p.status === 'PO_SENT' || p.status === 'PARTIALLY_RECEIVED'
  );
  const isCoveredByPO = activePOs.some(po =>
    po.items.some(poi => itemsBreakdown.some(ib => ib.materialId === poi.materialId && ib.shortage > 0))
  );

  if (isCoveredByPO) {
    return {
      status: 'PO_PLACED',
      label: 'PO Placed with Vendor',
      items: itemsBreakdown
    };
  }

  return {
    status: hasAnyStock ? 'PARTIALLY_RECEIVED' : 'PROCUREMENT_REQUIRED',
    label: hasAnyStock ? 'Partially Ready' : 'Procurement Required',
    items: itemsBreakdown
  };
}
