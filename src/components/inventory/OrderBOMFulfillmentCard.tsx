import React, { useState, useEffect } from 'react';
import { Order, Catalogue, Material, PurchaseOrder } from '../../types';
import { getCatalogues, getMaterials, getPurchaseOrders } from '../../services/dataService';
import { matchOrderToCatalogue, getOrderProcurementStatus } from '../../utils/bomCalculator';
import { OrderProcurementBadge } from './OrderProcurementBadge';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  PackageCheck,
  ChevronDown,
  ChevronUp,
  Boxes,
  ArrowRight
} from 'lucide-react';

interface Props {
  order: Order;
  onNavigateToProcurement?: () => void;
}

export const OrderBOMFulfillmentCard: React.FC<Props> = ({ order, onNavigateToProcurement }) => {
  const [catalogues, setCatalogues] = useState<Catalogue[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [cats, mats, pos] = await Promise.all([
          getCatalogues(),
          getMaterials(),
          getPurchaseOrders()
        ]);
        if (isMounted) {
          setCatalogues(cats);
          setMaterials(mats);
          setPurchaseOrders(pos);
        }
      } catch (e) {
        console.error('Error fetching BOM details for order:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [order.orderId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs text-slate-400">
        Checking Bill of Materials (BOM) availability...
      </div>
    );
  }

  const matchedCatalogue = matchOrderToCatalogue(order, catalogues);
  const fulfillment = getOrderProcurementStatus(order, matchedCatalogue, materials, purchaseOrders);
  const shortages = fulfillment.items.filter(it => it.shortage > 0);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Catalogue & BOM Material Readiness
              </h4>
              <OrderProcurementBadge status={fulfillment.status} label={fulfillment.label} size="sm" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center flex-wrap gap-x-2 gap-y-1">
              <span>
                Matched Catalogue:{' '}
                <strong className="font-semibold text-slate-800 dark:text-slate-200">
                  {matchedCatalogue ? matchedCatalogue.name : 'No catalogue matched'}
                </strong>
                {matchedCatalogue && ` (${matchedCatalogue.category})`}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 font-mono text-[10px] font-bold">
                Order Multiplier: {order.packageQuantity || order.quantity || 1} Package(s)
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Body */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Status summary banner */}
          {shortages.length === 0 ? (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                All {fulfillment.items.length} BOM components are available in inventory. This order is ready for kit assembly and dispatch packing!
              </span>
            </div>
          ) : (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start justify-between gap-2.5 text-xs text-rose-800 dark:text-rose-300">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">
                    Material Shortage: {shortages.length} component(s) need replenishment
                  </div>
                  <div className="text-[11px] text-rose-700/80 dark:text-rose-400/90 mt-0.5">
                    {shortages.map(s => `${s.materialName} (Short by ${s.shortage} ${s.unit})`).join(', ')}
                  </div>
                </div>
              </div>

              {onNavigateToProcurement && (
                <button
                  type="button"
                  onClick={onNavigateToProcurement}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <span>Procure</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Component list table */}
          {fulfillment.items.length > 0 ? (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-semibold">
                    <th className="py-2 px-3">BOM Component</th>
                    <th className="py-2 px-3 text-center">Required</th>
                    <th className="py-2 px-3 text-center">Stock Available</th>
                    <th className="py-2 px-3 text-center">Shortage</th>
                    <th className="py-2 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {fulfillment.items.map(it => {
                    const hasShort = it.shortage > 0;
                    return (
                      <tr key={it.materialId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {it.materialName}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-700 dark:text-slate-300">
                          {it.requiredQty} {it.unit}
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold text-slate-900 dark:text-white">
                          {it.stockAvailable} {it.unit}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {hasShort ? (
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              -{it.shortage} {it.unit}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {hasShort ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              Shortage
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              In Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-slate-400 text-xs">
              No component breakdown defined for this order's package.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
