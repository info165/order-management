import React, { useMemo } from 'react';
import {
  TrendingUp,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  IndianRupee,
  Users,
  Building,
  ArrowUpRight,
  ChevronRight
} from 'lucide-react';
import { Order, UserProfile } from '../../types';
import { CurrencyFormatter } from '../common/CurrencyFormatter';
import { StatusBadge } from '../common/StatusBadge';
import { TrackingLink } from '../common/TrackingLink';
import { getDisplaySerialNo } from '../../utils/orderDisplay';

interface DashboardProps {
  orders: Order[];
  currentUser: UserProfile;
  onSelectOrder: (order: Order) => void;
  onNavigateToOrdersWithFilter?: (filterKey: string, filterValue: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  orders,
  currentUser,
  onSelectOrder,
  onNavigateToOrdersWithFilter
}) => {
  const isAgent = currentUser.role === 'AGENT';

  // Compute Metrics
  const metrics = useMemo(() => {
    const totalCount = orders.length;
    const totalValue = orders.reduce((acc, o) => acc + (o.grossOrderValue || o.totalAmount || o.orderValue || 0), 0);
    const grossTotal = totalValue;
    const totalReceived = orders.reduce((acc, o) => acc + (o.amountReceived || 0), 0);
    const totalPending = orders.reduce((acc, o) => acc + (o.amountPending ?? Math.max(0, (o.grossOrderValue || o.totalAmount || o.orderValue || 0) - (o.amountReceived || 0))), 0);

    const inTransit = orders.filter(o => o.dispatchStatus === 'DISPATCHED' || o.deliveryStatus === 'In Transit').length;
    const delivered = orders.filter(o => o.status === 'DELIVERED' || o.deliveryStatus === 'Delivered').length;
    const readyForDispatch = orders.filter(o => o.status === 'READY_FOR_DISPATCH').length;

    const todayStr = new Date().toISOString().split('T')[0];

    const overdueDeliveries = orders.filter(o => {
      return (
        o.expectedDeliveryDate &&
        o.expectedDeliveryDate < todayStr &&
        o.deliveryStatus !== 'Delivered' &&
        o.status !== 'DELIVERED' &&
        o.status !== 'CANCELLED'
      );
    });

    const overduePayments = orders.filter(o => {
      return (
        o.expectedPaymentDate &&
        o.expectedPaymentDate < todayStr &&
        o.paymentStatus !== 'PAID' &&
        o.status !== 'CANCELLED'
      );
    });

    // Breakdown by School Type
    const schoolTypeMap: { [key: string]: { count: number; value: number } } = {};
    orders.forEach(o => {
      const type = o.schoolType || 'Government School';
      if (!schoolTypeMap[type]) schoolTypeMap[type] = { count: 0, value: 0 };
      schoolTypeMap[type].count += 1;
      schoolTypeMap[type].value += o.orderValue;
    });

    // Breakdown by Category
    const categoryMap: { [key: string]: { count: number; value: number } } = {};
    orders.forEach(o => {
      const cat = o.category || 'General';
      if (!categoryMap[cat]) categoryMap[cat] = { count: 0, value: 0 };
      categoryMap[cat].count += 1;
      categoryMap[cat].value += o.orderValue;
    });

    // Top Agents by order value
    const agentMap: { [key: string]: { id: string; name: string; count: number; value: number; collected: number } } = {};
    orders.forEach(o => {
      const aId = o.agentId || 'AGT-DIRECT';
      const aName = o.agentName || 'In-House / Direct Tender';
      if (!agentMap[aId]) {
        agentMap[aId] = { id: aId, name: aName, count: 0, value: 0, collected: 0 };
      }
      agentMap[aId].count += 1;
      agentMap[aId].value += o.orderValue;
      agentMap[aId].collected += (o.amountReceived || 0);
    });

    const topAgents = Object.values(agentMap)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      totalCount,
      totalValue,
      grossTotal,
      totalReceived,
      totalPending,
      inTransit,
      delivered,
      readyForDispatch,
      overdueDeliveries,
      overduePayments,
      schoolTypeMap,
      categoryMap,
      topAgents
    };
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            {isAgent ? `Partner Dashboard: ${currentUser.name}` : 'Executive Operations & Order Dashboard'}
            {isAgent && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                {currentUser.agentCode}
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAgent
              ? 'Real-time status of your assigned Kendriya Vidyalaya & Navodaya tenders, dispatches, and school collections.'
              : 'Enterprise overview of KV, JNV & Government school purchase orders, logistics, and treasury collections.'}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
          <span>Active Scope:</span>
          <span className="font-semibold text-slate-800">
            {isAgent ? `My Orders (${metrics.totalCount})` : `All India (${metrics.totalCount} Orders)`}
          </span>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <div
          onClick={() => onNavigateToOrdersWithFilter && onNavigateToOrdersWithFilter('status', 'ALL')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {isAgent ? 'My Orders' : 'Total Orders'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900">{metrics.totalCount}</div>
            <div className="text-xs text-slate-500">
              <CurrencyFormatter amount={metrics.totalValue} />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>{metrics.readyForDispatch} ready to dispatch</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
          </div>
        </div>

        {/* In Transit */}
        <div
          onClick={() => onNavigateToOrdersWithFilter && onNavigateToOrdersWithFilter('dispatchStatus', 'DISPATCHED')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">In Transit</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-purple-700">{metrics.inTransit}</div>
            <div className="text-xs text-purple-600 font-medium">On the road</div>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>Delhivery / Post dockets</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
          </div>
        </div>

        {/* Total Payments Received */}
        <div
          onClick={() => onNavigateToOrdersWithFilter && onNavigateToOrdersWithFilter('paymentStatus', 'PAID')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Payments Collected</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-emerald-700">
              <CurrencyFormatter amount={metrics.totalReceived} />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>
              {metrics.grossTotal > 0
                ? `${Math.round((metrics.totalReceived / metrics.grossTotal) * 100)}% of gross value`
                : '0%'}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
          </div>
        </div>

        {/* Outstanding Balance */}
        <div
          onClick={() => onNavigateToOrdersWithFilter && onNavigateToOrdersWithFilter('paymentStatus', 'PAYMENT_PENDING')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Outstanding Payment</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-amber-700">
              <CurrencyFormatter amount={metrics.totalPending} />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>{metrics.overduePayments.length} overdue invoices</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
          </div>
        </div>
      </div>

      {/* Critical Alerts (Overdue deliveries & overdue payments) */}
      {(metrics.overdueDeliveries.length > 0 || metrics.overduePayments.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Overdue Deliveries Alert */}
          {metrics.overdueDeliveries.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-rose-800 font-semibold text-xs uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Overdue Deliveries ({metrics.overdueDeliveries.length})</span>
                </div>
                <span className="text-[11px] text-rose-600 font-medium">Expected date elapsed</span>
              </div>
              <p className="text-xs text-rose-700 mb-3">
                These consignments have passed their expected delivery milestone without POD confirmation:
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {metrics.overdueDeliveries.slice(0, 4).map(o => (
                  <div
                    key={o.orderId}
                    onClick={() => onSelectOrder(o)}
                    className="bg-white p-2.5 rounded-lg border border-rose-200/80 flex items-center justify-between text-xs hover:shadow-sm cursor-pointer transition-shadow"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">{o.schoolName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>{o.orderNumber}</span>
                        {o.docketNumber && <span>Docket: {o.docketNumber}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-mono text-rose-700 font-medium">
                        Due {o.expectedDeliveryDate}
                      </div>
                      <span className="text-[10px] text-blue-600 hover:underline">Track &gt;</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overdue Payments Alert */}
          {metrics.overduePayments.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs uppercase tracking-wide">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span>Pending Payment Follow-ups ({metrics.overduePayments.length})</span>
                </div>
                <span className="text-[11px] text-amber-700 font-medium">Overdue</span>
              </div>
              <p className="text-xs text-amber-800 mb-3">
                Material was dispatched/delivered but school PFMS/Treasury disbursement is pending:
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {metrics.overduePayments.slice(0, 4).map(o => (
                  <div
                    key={o.orderId}
                    onClick={() => onSelectOrder(o)}
                    className="bg-white p-2.5 rounded-lg border border-amber-200/80 flex items-center justify-between text-xs hover:shadow-sm cursor-pointer transition-shadow"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">{o.schoolName}</div>
                      <div className="text-[11px] text-slate-500">
                        Partner: {o.agentName} | Due: {o.expectedPaymentDate || 'N/A'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-amber-800">
                        <CurrencyFormatter amount={o.amountPending ?? o.orderValue} />
                      </div>
                      <span className="text-[10px] text-amber-700 hover:underline">View Order &gt;</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visual Breakdowns: School Distribution & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* School Types Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-500" />
              <span>Orders by School System</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">KV vs JNV</span>
          </div>

          <div className="space-y-3">
            {Object.entries(metrics.schoolTypeMap).map(([type, rawData]) => {
              const data = rawData as { count: number; value: number };
              const pct = metrics.totalValue > 0 ? Math.round((data.value / metrics.totalValue) * 100) : 0;
              return (
                <div key={type} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{type}</span>
                    <span className="font-mono text-slate-500">
                      {data.count} orders ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        type.includes('JNV') ? 'bg-amber-500' :
                        type.includes('PM SHRI') ? 'bg-purple-600' : 'bg-sky-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-right text-[11px] text-slate-400 font-mono">
                    <CurrencyFormatter amount={data.value} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Product / Lab Categories */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-500" />
              <span>Orders by Equipment / Lab</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Top Categories</span>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {Object.entries(metrics.categoryMap).map(([cat, rawData]) => {
              const data = rawData as { count: number; value: number };
              const pct = metrics.totalValue > 0 ? Math.round((data.value / metrics.totalValue) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700 truncate max-w-[180px]">{cat}</span>
                    <span className="font-mono text-slate-500">{data.count} units</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full"
                      style={{ width: `${Math.max(pct, 5)}%` }}
                    />
                  </div>
                  <div className="text-right text-[11px] text-slate-400 font-mono">
                    <CurrencyFormatter amount={data.value} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Performing Agents (Admin Only) */}
        {!isAgent && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span>Partner Performance</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">By Value</span>
            </div>

            <div className="divide-y divide-slate-100">
              {metrics.topAgents.map((agent, i) => (
                <div key={agent.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-medium text-slate-800">{agent.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{agent.count} orders booked</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-900">
                      <CurrencyFormatter amount={agent.value} />
                    </div>
                    <div className="text-[10px] text-emerald-600 font-mono">
                      Recv: <CurrencyFormatter amount={agent.collected} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agent Quick Reference Card if in Agent View */}
        {isAgent && (
          <div className="bg-amber-50/70 p-5 rounded-xl border border-amber-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-2">
                <Users className="w-4 h-4 text-amber-700" />
                <span>Partner Information & Verification</span>
              </div>
              <p className="text-xs text-amber-800 mb-4">
                You are securely authenticated as an authorized regional partner. All shown orders have been verified against GeM contracts and dispatched directly to your designated Kendriya Vidyalayas and Navodaya Vidyalayas.
              </p>
              <div className="space-y-2 text-xs text-amber-950 font-mono">
                <div className="flex justify-between py-1 border-b border-amber-200">
                  <span>Assigned Territory:</span>
                  <span className="font-bold">{currentUser.state || 'Northeast / Regional'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-amber-200">
                  <span>Contact Number:</span>
                  <span className="font-bold">{currentUser.phone || '+91 98110 00000'}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-amber-200 text-xs text-amber-800">
              For any school invoice disputes or courier damage claims, contact operations at <span className="font-mono font-semibold">info@funscholar.com</span>.
            </div>
          </div>
        )}
      </div>

      {/* Recent Orders Snapshot Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-slate-900">
              {isAgent ? 'My Active Orders' : 'Latest Orders Snapshot'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Click any row to open the complete 360° order management modal</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToOrdersWithFilter && onNavigateToOrdersWithFilter('status', 'ALL')}
            className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
          >
            <span>View all orders</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Order ID / Contract</th>
                <th className="px-4 py-3">School Name</th>
                <th className="px-4 py-3">Category</th>
                {!isAgent && <th className="px-4 py-3">Partner</th>}
                <th className="px-4 py-3 text-right">Value (₹)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Courier / Tracking</th>
                <th className="px-4 py-3">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.slice(0, 7).map((order) => (
                <tr
                  key={order.orderId}
                  onClick={() => onSelectOrder(order)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono font-medium text-slate-900">
                    <div>
                      {!isAgent && getDisplaySerialNo(order, orders)
                        ? `Order No - ${getDisplaySerialNo(order, orders)}`
                        : order.orderId}
                    </div>
                    <div className="text-[11px] text-slate-400">{order.orderNumber}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{order.schoolName}</div>
                    <div className="text-[11px] text-slate-500">{order.schoolType}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-[150px] truncate">
                    {order.category}
                  </td>
                  {!isAgent && (
                    <td className="px-4 py-3 text-slate-600">
                      <div className="font-medium text-slate-800">{order.agentName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{order.agentCode}</div>
                    </td>
                  )}
                  <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                    <CurrencyFormatter amount={order.orderValue} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} type="order" />
                  </td>
                  <td className="px-4 py-3">
                    <TrackingLink courierName={order.courierName} docketNumber={order.docketNumber} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.paymentStatus} type="payment" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
