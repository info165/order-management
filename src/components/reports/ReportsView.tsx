import React, { useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  FileSpreadsheet,
  PieChart,
  Truck,
  CreditCard,
  Building,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Order, UserProfile } from '../../types';
import { CurrencyFormatter } from '../common/CurrencyFormatter';
import { exportOrdersToExcel } from '../../services/importExportService';

interface ReportsViewProps {
  orders: Order[];
  currentUser: UserProfile;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ orders, currentUser }) => {
  const isAgent = currentUser.role === 'AGENT';

  // Overall calculations
  const totalValue = useMemo(() => orders.reduce((acc, o) => acc + o.orderValue, 0), [orders]);
  const grossValue = useMemo(() => orders.reduce((acc, o) => acc + (o.grossOrderValue || o.totalAmount || o.orderValue), 0), [orders]);
  const totalReceived = useMemo(() => orders.reduce((acc, o) => acc + (o.amountReceived || 0), 0), [orders]);
  const totalPending = useMemo(() => orders.reduce((acc, o) => acc + (o.amountPending ?? Math.max(0, o.orderValue - (o.amountReceived || 0))), 0), [orders]);

  // State-wise Breakdown
  const stateSummary = useMemo(() => {
    const map: { [state: string]: { count: number; value: number; received: number; pending: number } } = {};
    orders.forEach(o => {
      const st = o.state || 'Other State';
      if (!map[st]) map[st] = { count: 0, value: 0, received: 0, pending: 0 };
      map[st].count += 1;
      map[st].value += o.orderValue;
      map[st].received += (o.amountReceived || 0);
      map[st].pending += (o.amountPending ?? Math.max(0, o.orderValue - (o.amountReceived || 0)));
    });
    return Object.entries(map).sort((a, b) => b[1].value - a[1].value);
  }, [orders]);

  // Courier performance
  const courierSummary = useMemo(() => {
    const map: { [courier: string]: { count: number; delivered: number; inTransit: number } } = {};
    orders.forEach(o => {
      const c = o.courierName || 'Unassigned / Pending';
      if (!map[c]) map[c] = { count: 0, delivered: 0, inTransit: 0 };
      map[c].count += 1;
      if (o.status === 'DELIVERED' || o.deliveryStatus === 'Delivered') {
        map[c].delivered += 1;
      } else if (o.dispatchStatus === 'DISPATCHED') {
        map[c].inTransit += 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [orders]);

  // Category breakdown
  const categorySummary = useMemo(() => {
    const map: { [cat: string]: { count: number; value: number } } = {};
    orders.forEach(o => {
      const c = o.category || 'General';
      if (!map[c]) map[c] = { count: 0, value: 0 };
      map[c].count += 1;
      map[c].value += o.orderValue;
    });
    return Object.entries(map).sort((a, b) => b[1].value - a[1].value);
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-600" />
            <span>Procurement & Logistics Analytics</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-state treasury reconciliation, GeM contract fulfillment, and courier performance metrics
          </p>
        </div>

        <button
          type="button"
          onClick={() => exportOrdersToExcel(orders, `Procurement_Report_${new Date().toISOString().split('T')[0]}.xlsx`)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Export Analytics Report</span>
        </button>
      </div>

      {/* Financial Health Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">Total GeM Contract Value</span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            <CurrencyFormatter amount={totalValue} />
          </div>
          <div className="text-xs text-slate-500">
            Gross with 18% GST: <CurrencyFormatter amount={grossValue} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">Treasury Collections (PFMS / Treasury)</span>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            <CurrencyFormatter amount={totalReceived} />
          </div>
          <div className="text-xs text-emerald-600 font-medium">
            {grossValue > 0 ? `${Math.round((totalReceived / grossValue) * 100)}% realization rate` : '0%'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">Outstanding School Balance</span>
          <div className="text-2xl font-bold font-mono text-amber-700">
            <CurrencyFormatter amount={totalPending} />
          </div>
          <div className="text-xs text-amber-700 font-medium">
            Requires agent & principal billing follow-up
          </div>
        </div>
      </div>

      {/* State-Wise Performance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Building className="w-4 h-4 text-slate-500" />
            <span>State-Wise Procurement & Collection Breakdown</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">{stateSummary.length} states active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">State / Union Territory</th>
                <th className="px-4 py-3 text-center">Orders</th>
                <th className="px-4 py-3 text-right">Order Value (₹)</th>
                <th className="px-4 py-3 text-right">Received (₹)</th>
                <th className="px-4 py-3 text-right">Pending (₹)</th>
                <th className="px-4 py-3 text-center">Collection %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stateSummary.map(([st, data]) => {
                const pct = data.value > 0 ? Math.round((data.received / data.value) * 100) : 0;
                return (
                  <tr key={st} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{st}</td>
                    <td className="px-4 py-3 text-center font-mono text-slate-600">{data.count}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                      <CurrencyFormatter amount={data.value} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700 font-medium">
                      <CurrencyFormatter amount={data.received} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-amber-700 font-medium">
                      <CurrencyFormatter amount={data.pending} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                        pct >= 80 ? 'bg-emerald-100 text-emerald-800' :
                        pct >= 40 ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Courier & Dispatch Logistics Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <Truck className="w-4 h-4 text-purple-600" />
            <span>Courier & Transport Partner Performance</span>
          </h3>

          <div className="space-y-3">
            {courierSummary.map(([courier, stats]) => (
              <div key={courier} className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">{courier}</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {stats.count} total consignments dispatched
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                    {stats.delivered} Delivered
                  </span>
                  <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-200">
                    {stats.inTransit} In Transit
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Product Category Share */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <PieChart className="w-4 h-4 text-emerald-600" />
            <span>Equipment / Lab Package Demand Share</span>
          </h3>

          <div className="space-y-3">
            {categorySummary.map(([cat, data]) => {
              const pct = totalValue > 0 ? Math.round((data.value / totalValue) * 100) : 0;
              return (
                <div key={cat} className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-700 truncate max-w-[220px]">{cat}</span>
                    <span className="font-mono text-slate-500">{pct}% ({data.count} units)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <div className="text-right text-[11px] font-mono text-slate-400">
                    <CurrencyFormatter amount={data.value} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
