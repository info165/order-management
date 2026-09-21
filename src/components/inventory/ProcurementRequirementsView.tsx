import React, { useState, useMemo } from 'react';
import { Material, Catalogue, Order, PurchaseOrder, Vendor, UserProfile } from '../../types';
import { calculateMaterialRequirements, MaterialRequirementSummary } from '../../utils/bomCalculator';
import {
  AlertTriangle,
  Search,
  Filter,
  Package,
  ShoppingBag,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  School,
  FileText,
  IndianRupee,
  Layers,
  ArrowRight
} from 'lucide-react';

interface Props {
  materials: Material[];
  catalogues: Catalogue[];
  orders: Order[];
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
  currentUser?: UserProfile;
  onLaunchPOWithMaterials: (vendorId: string, shortageItems: { materialId: string; requiredQty: number }[]) => void;
}

export const ProcurementRequirementsView: React.FC<Props> = ({
  materials,
  catalogues,
  orders,
  purchaseOrders,
  vendors,
  currentUser,
  onLaunchPOWithMaterials
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'SHORTAGE_ONLY'>('SHORTAGE_ONLY');
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>('ALL');
  const [expandedMaterialId, setExpandedMaterialId] = useState<string | null>(null);

  // Calculate live requirements from orders
  const requirements: MaterialRequirementSummary[] = useMemo(() => {
    return calculateMaterialRequirements(orders, catalogues, materials, purchaseOrders);
  }, [orders, catalogues, materials, purchaseOrders]);

  // Filtered requirements
  const filtered = requirements.filter(req => {
    if (!req) return false;
    const q = (searchQuery || '').toLowerCase().trim();
    const matName = (req.materialName || (req as any).name || '').toLowerCase();
    const sku = (req.sku || '').toLowerCase();
    const vendorName = (req.preferredVendorName || '').toLowerCase();

    const matchesSearch =
      !q ||
      matName.includes(q) ||
      sku.includes(q) ||
      vendorName.includes(q);

    const matchesShortage = filterMode === 'ALL' || (req.netRequirement || 0) > 0;

    const matchesVendor =
      selectedVendorFilter === 'ALL' || req.preferredVendorId === selectedVendorFilter;

    return matchesSearch && matchesShortage && matchesVendor;
  });

  const totalShortageItems = requirements.filter(r => (r?.netRequirement || 0) > 0).length;
  const totalEstimatedProcurementCost = requirements.reduce(
    (sum, r) => sum + (r?.estimatedCost || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 text-rose-500" />
            <span>Procurement Requirements & Shortage Analysis</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated material requirements calculation aggregated across active Sales Orders and inventory reserves.
          </p>
        </div>
      </div>

      {/* KPI Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Shortage Materials
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {totalShortageItems}{' '}
              <span className="text-xs font-normal text-slate-400">
                of {materials.length} components
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Est. Net Procurement Spend
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              ₹{totalEstimatedProcurementCost.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Sales Orders Sourced
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {orders.filter(o => o.status !== 'DISPATCHED' && o.status !== 'DELIVERED').length}{' '}
              <span className="text-xs font-normal text-slate-400">in processing</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search material, SKU, vendor..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Vendor Filter */}
          <select
            value={selectedVendorFilter}
            onChange={e => setSelectedVendorFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">All Preferred Vendors</option>
            {vendors.map(v => (
              <option key={v.vendorId} value={v.vendorId}>
                {v.vendorName}
              </option>
            ))}
          </select>

          {/* Shortage Toggle */}
          <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterMode('SHORTAGE_ONLY')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterMode === 'SHORTAGE_ONLY'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Shortages Only ({totalShortageItems})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filterMode === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All Components ({requirements.length})
            </button>
          </div>
        </div>
      </div>

      {/* Requirements Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Material Details</th>
                <th className="py-3 px-4 text-center">Gross Required</th>
                <th className="py-3 px-4 text-center">Physical Stock</th>
                <th className="py-3 px-4 text-center">Reserved / Allocated</th>
                <th className="py-3 px-4 text-center">Incoming (Open POs)</th>
                <th className="py-3 px-4 text-center">Net Requirement</th>
                <th className="py-3 px-4">Preferred Vendor</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No components found matching current filters. All materials are in stock!
                  </td>
                </tr>
              ) : (
                filtered.map(req => {
                  const isShortage = req.netRequirement > 0;
                  const isExpanded = expandedMaterialId === req.materialId;

                  return (
                    <React.Fragment key={req.materialId}>
                      <tr
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                          isShortage ? 'bg-rose-500/5 dark:bg-rose-500/5' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedMaterialId(isExpanded ? null : req.materialId)
                            }
                            className="text-left group cursor-pointer"
                          >
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 group-hover:text-amber-500 transition-colors">
                              {(req.orderBreakdown || []).length > 0 && (
                                <ChevronRight
                                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                                    isExpanded ? 'rotate-90 text-amber-500' : ''
                                  }`}
                                />
                              )}
                              <span>{req.materialName || 'Unnamed Material'}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {req.sku || '—'} &bull; Unit: {req.unit || 'Nos'}
                            </div>
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                          {req.grossRequired || 0} {req.unit || 'Nos'}
                        </td>

                        <td className="py-3.5 px-4 text-center font-medium text-slate-700 dark:text-slate-300">
                          {req.currentStock || 0} {req.unit || 'Nos'}
                        </td>

                        <td className="py-3.5 px-4 text-center font-medium text-amber-600 dark:text-amber-400">
                          {req.reservedStock || 0} {req.unit || 'Nos'}
                        </td>

                        <td className="py-3.5 px-4 text-center font-medium text-blue-600 dark:text-blue-400">
                          {req.incomingOnPOs || 0} {req.unit || 'Nos'}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isShortage ? (
                            <div className="inline-block px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black text-sm border border-rose-500/30">
                              {req.netRequirement || 0} {req.unit || 'Nos'}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Sufficient</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {req.preferredVendorName ? (
                            <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate max-w-[160px] font-medium">
                                {req.preferredVendorName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No vendor mapped</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {isShortage && (
                            <button
                              type="button"
                              onClick={() =>
                                onLaunchPOWithMaterials(req.preferredVendorId || '', [
                                  { materialId: req.materialId, requiredQty: req.netRequirement || 0 }
                                ])
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold text-[11px] shadow-2xs transition-all cursor-pointer"
                            >
                              <ShoppingBag className="w-3 h-3" />
                              <span>Order from Vendor</span>
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Drill-down: Which Orders Require This Material */}
                      {isExpanded && (req.orderBreakdown || []).length > 0 && (
                        <tr className="bg-slate-50/90 dark:bg-slate-800/80">
                          <td colSpan={8} className="p-4 pl-10 border-y border-slate-200 dark:border-slate-700">
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                              <School className="w-4 h-4 text-amber-500" />
                              <span>Sales Orders Requiring "{req.materialName || 'Component'}":</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {(req.orderBreakdown || []).map(ob => (
                                <div
                                  key={ob.orderId}
                                  className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1"
                                >
                                  <div className="flex items-center justify-between font-bold text-xs">
                                    <span className="text-slate-900 dark:text-white">
                                      {ob.orderNumber}
                                    </span>
                                    <span className="text-amber-600 dark:text-amber-400">
                                      Needs {ob.quantityRequired} {req.unit}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                                    {ob.schoolName}
                                  </div>
                                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                                    <span>{ob.catalogueName}</span>
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold">
                                      {ob.orderStatus}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
