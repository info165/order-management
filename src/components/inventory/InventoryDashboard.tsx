import React, { useState, useMemo } from 'react';
import { Material, Catalogue, Vendor, PurchaseOrder, StockMovement, Order, UserProfile } from '../../types';
import { calculateMaterialRequirements } from '../../utils/bomCalculator';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import {
  Package,
  AlertTriangle,
  FileText,
  Boxes,
  TrendingDown,
  ArrowRight,
  Plus,
  SlidersHorizontal,
  IndianRupee,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Building2,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';

interface Props {
  materials: Material[];
  catalogues: Catalogue[];
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  stockMovements: StockMovement[];
  orders: Order[];
  currentUser?: UserProfile;
  onNavigateTab: (tab: string) => void;
  onRefresh: () => void;
  onLaunchPOWithMaterials: (vendorId: string, shortageItems: { materialId: string; requiredQty: number }[]) => void;
}

export const InventoryDashboard: React.FC<Props> = ({
  materials,
  catalogues,
  vendors,
  purchaseOrders,
  stockMovements,
  orders,
  currentUser,
  onNavigateTab,
  onRefresh,
  onLaunchPOWithMaterials
}) => {
  const [adjustingMaterial, setAdjustingMaterial] = useState<Material | null>(null);

  // Requirements calculation
  const requirements = useMemo(() => {
    return calculateMaterialRequirements(orders, catalogues, materials, purchaseOrders);
  }, [orders, catalogues, materials, purchaseOrders]);

  const shortages = requirements.filter(r => r.netRequirement > 0);
  const lowStockMaterials = materials.filter(m => m.currentStock <= m.minimumStockLevel);
  const openPOs = purchaseOrders.filter(
    po => po.status === 'PO_GENERATED' || po.status === 'PO_SENT' || po.status === 'PARTIALLY_RECEIVED'
  );

  const totalInventoryValuation = materials.reduce(
    (sum, m) => sum + (m.currentStock * m.purchasePrice),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-amber-500" />
            <span>Supply Chain & Inventory Executive Overview</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time material replenishment tracking, BOM readiness, and procurement logistics.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTab('requirements')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>View Shortages ({shortages.length})</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('purchase_orders')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Vendor PO</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stock Valuation */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Inventory Valuation</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            ₹{totalInventoryValuation.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span>{materials.length} components registered</span>
          </div>
        </div>

        {/* Shortage Alerts for Orders */}
        <div
          onClick={() => onNavigateTab('requirements')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs cursor-pointer hover:border-rose-400 transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Procurement Shortages</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {shortages.length}{' '}
            <span className="text-xs font-semibold text-slate-400">Items Needed</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>For pending Sales Orders</span>
            <ArrowRight className="w-3 h-3 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Low Stock Warning */}
        <div
          onClick={() => onNavigateTab('materials')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs cursor-pointer hover:border-amber-400 transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Low Stock Reorder Alerts</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-105 transition-transform">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {lowStockMaterials.length}{' '}
            <span className="text-xs font-semibold text-slate-400">At/Below Min</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Needs restocking</span>
            <ArrowRight className="w-3 h-3 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Open Purchase Orders */}
        <div
          onClick={() => onNavigateTab('purchase_orders')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs cursor-pointer hover:border-blue-400 transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Open Purchase Orders</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-105 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">
            {openPOs.length}{' '}
            <span className="text-xs font-semibold text-slate-400">Inbound Supply</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Across {vendors.length} vendors</span>
            <ArrowRight className="w-3 h-3 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Urgent Procurement Shortages & Recent Stock Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Top Materials Requiring Immediate Procurement */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Materials Needing Immediate Procurement</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculated by subtracting available inventory and incoming PO quantities from gross demand.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('requirements')}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[10px] uppercase font-semibold">
                  <th className="py-2.5 px-4">Component</th>
                  <th className="py-2.5 px-3 text-center">Gross Req</th>
                  <th className="py-2.5 px-3 text-center">Stock</th>
                  <th className="py-2.5 px-3 text-center">Shortage</th>
                  <th className="py-2.5 px-3">Vendor</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {shortages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      All sales order material requirements are covered by existing stock or incoming POs!
                    </td>
                  </tr>
                ) : (
                  shortages.slice(0, 5).map(sh => (
                    <tr key={sh.materialId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {sh.materialName || 'Unnamed Material'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{sh.sku || '—'}</div>
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-800 dark:text-slate-200">
                        {sh.grossRequired || 0} {sh.unit || 'Nos'}
                      </td>
                      <td className="py-3 px-3 text-center font-medium text-slate-600 dark:text-slate-400">
                        {sh.currentStock || 0} {sh.unit || 'Nos'}
                      </td>
                      <td className="py-3 px-3 text-center font-black text-rose-600 dark:text-rose-400">
                        {sh.netRequirement || 0} {sh.unit || 'Nos'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        <span className="truncate max-w-[120px] block">
                          {sh.preferredVendorName || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            onLaunchPOWithMaterials(sh.preferredVendorId || '', [
                              { materialId: sh.materialId, requiredQty: sh.netRequirement || 0 }
                            ])
                          }
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[10px] cursor-pointer"
                        >
                          Order
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Recent Stock Ledger Movements */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>Recent Stock Movements</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Live inventory in/out ledger feed.</p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('movements')}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>Ledger</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {stockMovements.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No stock movement transactions recorded yet.
              </div>
            ) : (
              stockMovements.slice(0, 5).map(m => {
                const isIn = (m.movementType || m.type) === 'IN';
                const reasonLabel = (m.reason || m.movementReason || 'STOCK_ADJUSTMENT').replace(/_/g, ' ');
                const movementDate = m.timestamp || m.date || new Date().toISOString();
                return (
                  <div key={m.movementId} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isIn
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {isIn ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {m.materialName || 'Component'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {reasonLabel} &bull; {m.reference || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-sm font-black ${
                          isIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isIn ? '+' : '-'}{Math.abs(m.quantity)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(movementDate).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {adjustingMaterial && (
        <StockAdjustmentModal
          material={adjustingMaterial}
          currentUser={currentUser}
          onClose={() => setAdjustingMaterial(null)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
};
