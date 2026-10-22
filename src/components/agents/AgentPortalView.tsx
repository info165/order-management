import React, { useState, useMemo } from 'react';
import {
  Building2,
  TrendingUp,
  CreditCard,
  Truck,
  FileText,
  Search,
  Filter,
  Eye,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  PackageCheck,
  CalendarDays,
  Tag
} from 'lucide-react';
import { Order, UserProfile, School } from '../../types';
import { CurrencyFormatter } from '../common/CurrencyFormatter';
import { TrackingLink } from '../common/TrackingLink';
import { StatusBadge } from '../common/StatusBadge';
import {
  countByFinancialYear,
  filterByFinancialYear,
  latestFinancialYear,
  listFinancialYears
} from '../../utils/financialYearFilter';

interface AgentPortalViewProps {
  orders: Order[];
  currentUser: UserProfile;
  onSelectOrder: (order: Order) => void;
  onOpenNewOrder?: () => void;
}

export const AgentPortalView: React.FC<AgentPortalViewProps> = ({
  orders,
  currentUser,
  onSelectOrder
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'orders' | 'schools' | 'commissions'>('orders');

  // Filter orders strictly for this agent
  const agentOrders = useMemo(() => {
    return orders.filter(o => {
      if (currentUser.agentId && o.agentId === currentUser.agentId) return true;
      if (currentUser.agentCode && o.agentCode === currentUser.agentCode) return true;
      if (currentUser.name && o.agentName.toLowerCase() === currentUser.name.toLowerCase()) return true;
      return false;
    });
  }, [orders, currentUser]);

  // Financial-year view. Until the partner picks a year it follows the newest
  // year they have orders in (so it opens on the current year, like the main
  // registry, without a year being hard-coded); 'ALL' shows every year.
  const [fyChoice, setFyChoice] = useState<string | null>(null);
  const fyYears = useMemo(() => listFinancialYears(agentOrders), [agentOrders]);
  const fyCounts = useMemo(() => countByFinancialYear(agentOrders), [agentOrders]);
  const selectedFY = fyChoice ?? latestFinancialYear(agentOrders);
  const yearOrders = useMemo(() => filterByFinancialYear(agentOrders, selectedFY), [agentOrders, selectedFY]);

  // Cancelled orders stay in the list (marked cancelled) but, like the Orders
  // Registry, nothing was actually bought, so they don't count toward the cards.
  // Recomputed live off each order's current status.
  const countedOrders = useMemo(() => yearOrders.filter(o => o.status !== 'CANCELLED'), [yearOrders]);
  const cancelledInView = yearOrders.length - countedOrders.length;
  const schoolsInView = useMemo(() => new Set(countedOrders.map(o => o.schoolName)).size, [countedOrders]);

  // If for some reason the agent has zero orders (e.g. newly registered), provide a clear empty state.
  // The summary cards follow the selected financial year.
  const totalBookedValue = countedOrders.reduce((sum, o) => sum + (o.orderValue || 0), 0);
  const totalCollected = countedOrders.reduce((sum, o) => sum + (o.amountReceived || 0), 0);
  const totalPending = countedOrders.reduce((sum, o) => sum + (o.amountPending ?? Math.max(0, (o.orderValue || 0) - (o.amountReceived || 0))), 0);

  // Schools unique to this agent
  const mySchools = useMemo(() => {
    const map = new Map<string, { schoolName: string; state: string; district?: string; orderCount: number; totalValue: number }>();
    agentOrders.forEach(o => {
      const key = o.schoolName;
      if (!map.has(key)) {
        map.set(key, {
          schoolName: o.schoolName,
          state: o.state || 'Assigned State',
          district: o.district,
          orderCount: 1,
          totalValue: o.orderValue
        });
      } else {
        const item = map.get(key)!;
        item.orderCount += 1;
        item.totalValue += o.orderValue;
      }
    });
    return Array.from(map.values());
  }, [agentOrders]);

  // Filtered orders for table
  const displayOrders = useMemo(() => {
    return yearOrders.filter(o => {
      const matchStatus = statusFilter === 'ALL' || o.orderStatus === statusFilter;
      const cleanQ = searchQuery.toLowerCase();
      const matchSearch =
        o.orderId.toLowerCase().includes(cleanQ) ||
        o.schoolName.toLowerCase().includes(cleanQ) ||
        (o.docketNumber && o.docketNumber.toLowerCase().includes(cleanQ)) ||
        (o.category && o.category.toLowerCase().includes(cleanQ));
      return matchStatus && matchSearch;
    });
  }, [yearOrders, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Agent KPI Metrics (the partner's own identity card sits at the right end of this row).
          Desktop/tablet only - the compact mobile version below replaces it. */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">My Regional Orders</span>
            <FileText className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{countedOrders.length}</div>
          <div className="text-[11px] text-slate-500">
            Across {schoolsInView} institutional schools
          </div>
          {cancelledInView > 0 && (
            <div className="text-[10px] font-medium text-rose-600">
              {cancelledInView} cancelled · not counted
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Booked Order Value</span>
            <TrendingUp className="w-4 h-4 text-slate-700" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            ₹{totalBookedValue.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">GST Inclusive Value</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Collected From Schools</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700 font-mono">
            ₹{totalCollected.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-amber-600 font-medium">
            Pending: ₹{totalPending.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Partner identity card */}
        <div className="relative overflow-hidden rounded-xl border border-amber-900/40 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950 p-4 text-white shadow-sm flex flex-col justify-between">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/15 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <span className="font-semibold uppercase tracking-[0.18em] text-[10px] text-amber-300/80">Partner</span>
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Active
            </span>
          </div>
          <div className="relative mt-3 flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-lg font-bold text-white shadow-md shadow-amber-500/30 ring-1 ring-white/20">
              {currentUser.name?.charAt(0)?.toUpperCase() || 'P'}
            </span>
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-base font-semibold tracking-tight text-white">{currentUser.name}</h1>
              <span className="mt-1 inline-block rounded-md bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300 ring-1 ring-amber-400/30">
                {currentUser.agentCode || currentUser.agentId || 'AGENT'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Compact mobile-only KPI tiles - same 4 pieces of information (order
          count/schools, booked value, collected/pending, partner identity)
          as the desktop cards above, just in a tighter 2x2 grid with
          smaller padding and fewer secondary lines, since this stacked
          grid of full-size cards was taking up a lot of vertical space on
          a phone. Reuses the exact same values, nothing recomputed. */}
      <div className="sm:hidden grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wide text-[9px]">Orders</span>
            <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          </div>
          <div className="text-lg font-black text-slate-900 leading-tight">{countedOrders.length}</div>
          <div className="text-[9.5px] text-slate-500 truncate">{schoolsInView} schools</div>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wide text-[9px]">Booked</span>
            <TrendingUp className="w-3.5 h-3.5 text-slate-700 shrink-0" />
          </div>
          <div className="text-sm font-black text-slate-900 font-mono leading-tight truncate">
            ₹{totalBookedValue.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="font-semibold uppercase tracking-wide text-[9px]">Collected</span>
            <CreditCard className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          </div>
          <div className="text-sm font-black text-emerald-700 font-mono leading-tight truncate">
            ₹{totalCollected.toLocaleString('en-IN')}
          </div>
          <div className="text-[9px] text-amber-600 font-medium truncate">Due ₹{totalPending.toLocaleString('en-IN')}</div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-amber-900/40 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950 p-2.5 text-white shadow-sm">
          <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-amber-500/15 blur-xl" />
          <div className="relative flex items-center gap-2 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-sm font-bold text-white shadow-sm ring-1 ring-white/20">
              {currentUser.name?.charAt(0)?.toUpperCase() || 'P'}
            </span>
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-xs font-semibold text-white">{currentUser.name}</h1>
              <span className="font-mono text-[9px] font-bold text-amber-300">
                {currentUser.agentCode || currentUser.agentId || 'AGENT'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Orders / My Schools / Commission Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden text-xs">
        <div className="border-b border-slate-200 px-4 pt-3 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`pb-3 px-2 font-bold text-xs border-b-2 transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'border-amber-500 text-amber-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Territory Orders ({yearOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('schools')}
              className={`pb-3 px-2 font-bold text-xs border-b-2 transition-all cursor-pointer ${
                activeTab === 'schools'
                  ? 'border-amber-500 text-amber-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              My Schools Directory ({mySchools.length})
            </button>
          </div>

          <span className="text-[11px] font-mono text-slate-500 pb-3 hidden sm:inline">
            Logged In: {currentUser.email}
          </span>
        </div>

        {/* TAB 1: TERRITORY ORDERS */}
        {activeTab === 'orders' && (
          <div>
            {/* Financial year: one segment per year the partner has orders in, with
                how many, plus "All FY". The cards above and the list below follow it.
                Desktop/tablet only; the compact mobile version below replaces it. */}
            <div className="hidden sm:flex px-4 pt-4 pb-3 border-b border-slate-100 bg-white flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-slate-400 text-xs font-semibold flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" /> Financial Year:
              </span>
              <div
                role="tablist"
                aria-label="Financial year"
                className="inline-flex items-center gap-0.5 rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200/70"
              >
                {[
                  ...fyYears.map(y => ({ id: y, label: y, count: fyCounts[y] || 0 })),
                  { id: 'ALL', label: 'All FY', count: agentOrders.length }
                ].map(opt => {
                  const active = selectedFY === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setFyChoice(opt.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? 'bg-white text-amber-900 shadow-sm ring-1 ring-amber-300/70'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                          active ? 'bg-amber-500/15 text-amber-800' : 'bg-slate-200/80 text-slate-500'
                        }`}
                      >
                        {opt.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Compact mobile-only FY + Search strip, replacing the two
                spacious bordered sections above/below (each with its own
                p-4/py-4 padding and a "Financial Year:" label line) which
                took up a lot of vertical space stacked together on a phone.
                Reuses the exact same state and handlers as the desktop
                versions (fyYears, fyCounts, selectedFY, setFyChoice,
                agentOrders.length, searchQuery, setSearchQuery) - just
                tighter, pill-styled like the rest of this app's mobile
                views for a consistent premium look. */}
            <div className="sm:hidden px-3 pt-3 pb-2.5 space-y-2 bg-white border-b border-slate-100">
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  ...fyYears.map(y => ({ id: y, label: y, count: fyCounts[y] || 0 })),
                  { id: 'ALL', label: 'All FY', count: agentOrders.length }
                ].map(opt => {
                  const active = selectedFY === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFyChoice(opt.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                        active
                          ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 shadow-sm'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <span className={`rounded-full px-1.5 py-0.5 font-mono text-[9.5px] font-bold ${
                        active ? 'bg-white/30 text-slate-950' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {opt.count}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Order ID, School, Docket..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-medium"
                />
              </div>
            </div>

            {/* Search & Status Filters - desktop/tablet only; compact mobile
                version above replaces it. */}
            <div className="hidden sm:flex p-4 border-b border-slate-200 flex-col md:flex-row items-center justify-between gap-3 bg-white">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Order ID, School, Docket..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />
              </div>

              {/* Hidden on mobile only - desktop keeps the full Status filter
                  row (flex-wrap, unchanged from before: every button stays
                  visible instead of being cut off). Mobile just shows every
                  status (statusFilter stays at its current/default "ALL"
                  value; there's simply no control to change it from here). */}
              <div className="hidden sm:flex items-center gap-2 w-full md:w-auto flex-wrap">
                <span className="text-slate-400 text-xs font-semibold mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Status:
                </span>
                {[
                  { id: 'ALL', label: 'All My Orders' },
                  { id: 'NEW_ORDER', label: 'New' },
                  { id: 'UNDER_PROCESSING', label: 'Processing' },
                  { id: 'DISPATCHED', label: 'Dispatched' },
                  { id: 'DELIVERED', label: 'Delivered' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      statusFilter === tab.id
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders Table - desktop/tablet only; the 8 columns here don't
                fit a phone screen (this is what was overflowing/cut off).
                The premium mobile card list below replaces it under sm,
                reusing the exact same displayOrders data and onSelectOrder
                callback, styled the same way as the main Order Registry's
                own mobile card list for consistency. */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Order ID & Date</th>
                    <th className="px-4 py-3">GeM Contract Number</th>
                    <th className="px-4 py-3">School / KV Institution</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Order Value</th>
                    <th className="px-4 py-3">Dispatch & Docket</th>
                    <th className="px-4 py-3">Payment Realization</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {displayOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        No orders found in your regional territory for this filter.
                      </td>
                    </tr>
                  ) : (
                    displayOrders.map(order => (
                      <tr key={order.orderId} className="hover:bg-amber-50/30 transition-colors">
                        <td className="px-4 py-3 font-mono">
                          <div className="font-bold text-amber-900">{order.orderId}</div>
                          <div className="text-[10px] text-slate-400">{order.orderDate}</div>
                        </td>

                        <td className="px-4 py-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                          {order.contractNumber || order.orderNumber || order.purchaseOrderNumber || '—'}
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{order.schoolName}</div>
                          <div className="text-[10px] text-slate-500">
                            {order.district ? `${order.district}, ` : ''}{order.state || 'General'}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                            {order.category || 'Supplies'}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          ₹{order.orderValue.toLocaleString('en-IN')}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {/* A cancelled order is only marked cancelled on its main status, so
                                its dispatch status still reads NOT_READY - show it as cancelled
                                here instead, like the Orders Registry does. */}
                            {order.status === 'CANCELLED' ? (
                              <StatusBadge status="CANCELLED" type="order" compact />
                            ) : (
                              <span className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                                order.dispatchStatus === 'DELIVERED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                order.dispatchStatus === 'DISPATCHED' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                                order.dispatchStatus === 'PARTIALLY_DISPATCHED' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                order.dispatchStatus === 'IN_TRANSIT' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {order.dispatchStatus || 'PENDING'}
                              </span>
                            )}
                          </div>
                          {order.docketNumber && (
                            <div className="mt-1 flex items-center gap-1.5">
                              <TrackingLink courierName={order.courierName} docketNumber={order.docketNumber} compact />
                              <span className="text-[10px] font-mono text-slate-500">({order.courierName || 'Courier'})</span>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {order.status === 'CANCELLED' ? (
                              <StatusBadge status="CANCELLED" type="payment" compact />
                            ) : (
                              <span className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                                order.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                order.paymentStatus === 'PARTIALLY_PAID' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                'bg-rose-50 text-rose-800 border-rose-200'
                              }`}>
                                {order.paymentStatus === 'PAID' ? 'RECEIVED' : order.paymentStatus === 'PARTIALLY_PAID' ? 'PARTIAL' : 'PENDING'}
                              </span>
                            )}
                          </div>
                          {order.status !== 'CANCELLED' && (
                            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                              Rec: ₹{(order.amountReceived || 0).toLocaleString('en-IN')}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => onSelectOrder(order)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-amber-100 text-amber-900 font-semibold rounded-md text-[11px] flex items-center gap-1 mx-auto transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile-only card list - same visual pattern as the main Order
                Registry's own mobile cards (numbered badge, status + price
                stacked top-right, school name on its own line, category as
                a yellow-highlighter chip). Tapping a card opens the same
                order detail as the desktop table's View button, via the
                exact same onSelectOrder callback. Reuses displayOrders,
                already filtered by the same search/status/FY state the
                table uses - no new data, no new reads. */}
            <div className="sm:hidden p-3 space-y-2">
              {displayOrders.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500">
                  <div className="font-bold text-slate-800 text-sm">
                    No orders found in your regional territory for this filter.
                  </div>
                </div>
              ) : (
                displayOrders.map((order, idx) => (
                  <button
                    key={order.orderId}
                    type="button"
                    onClick={() => onSelectOrder(order)}
                    className="w-full text-left rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-xs cursor-pointer hover:border-amber-300 hover:bg-amber-50/40 active:bg-amber-50/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span
                        className="inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-md bg-slate-100 text-slate-900 font-bold text-xs font-mono border border-slate-200/90 shrink-0 mt-0.5"
                        title={`Order ${idx + 1}`}
                      >
                        {idx + 1}
                      </span>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {order.status === 'CANCELLED' ? (
                          <StatusBadge status="CANCELLED" type="order" compact />
                        ) : (
                          <span className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                            order.dispatchStatus === 'DELIVERED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            order.dispatchStatus === 'DISPATCHED' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                            order.dispatchStatus === 'PARTIALLY_DISPATCHED' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                            order.dispatchStatus === 'IN_TRANSIT' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {order.dispatchStatus || 'PENDING'}
                          </span>
                        )}
                        {order.status === 'CANCELLED' ? (
                          <span className="text-[11px] font-bold text-rose-600">CANCELLED</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gradient-to-r from-slate-800 to-slate-700 shadow-sm ring-1 ring-slate-600/40">
                            <CurrencyFormatter
                              amount={order.orderValue}
                              className="text-sm font-extrabold text-white tracking-tight"
                            />
                          </span>
                        )}
                        {/* PAID badge - Agent Portal mobile cards only, right
                            under the price, only for orders whose payment is
                            fully received. Stacks in the same compact
                            top-right column as everything above it, so the
                            card grows by one small pill, not a new row/
                            section - the page layout stays exactly as fixed
                            as it was. */}
                        {order.status !== 'CANCELLED' && order.paymentStatus === 'PAID' && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[9px] font-extrabold tracking-wide shadow-sm ring-1 ring-emerald-700/30">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            PAID
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="font-semibold text-sm text-slate-900 leading-snug break-words">
                      {order.schoolName}
                    </div>
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-1 rounded-lg bg-yellow-300 border border-yellow-400 text-slate-900 text-[11px] font-bold break-words shadow-sm">
                      <Tag className="w-3 h-3 shrink-0 text-amber-800" />
                      {order.category || 'Supplies'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MY SCHOOLS DIRECTORY */}
        {activeTab === 'schools' && (
          <div className="p-4 space-y-4">
            <div className="text-xs text-slate-500">
              List of government schools and institutions in your territory that have placed orders with you.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {mySchools.map(sch => (
                <div key={sch.schoolName} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-slate-900 text-xs">{sch.schoolName}</div>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-800 font-mono text-[10px] font-bold shrink-0">
                      {sch.orderCount} Orders
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{sch.district ? `${sch.district}, ` : ''}{sch.state}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Total Booked:</span>
                    <span className="font-mono font-bold text-slate-900">₹{sch.totalValue.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
