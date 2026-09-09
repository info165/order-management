import React, { useState, useMemo } from 'react';
import {
  Users,
  Building2,
  TrendingUp,
  CreditCard,
  Truck,
  FileText,
  Search,
  Filter,
  Eye,
  PlusCircle,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  Award,
  PackageCheck
} from 'lucide-react';
import { Order, UserProfile, School } from '../../types';
import { CurrencyFormatter } from '../common/CurrencyFormatter';

interface AgentPortalViewProps {
  orders: Order[];
  currentUser: UserProfile;
  onSelectOrder: (order: Order) => void;
  onOpenNewOrder?: () => void;
}

export const AgentPortalView: React.FC<AgentPortalViewProps> = ({
  orders,
  currentUser,
  onSelectOrder,
  onOpenNewOrder
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

  // If for some reason the agent has zero orders (e.g. newly registered), provide a clear empty state
  const totalBookedValue = agentOrders.reduce((sum, o) => sum + (o.orderValue || 0), 0);
  const totalCollected = agentOrders.reduce((sum, o) => sum + (o.amountReceived || 0), 0);
  const totalPending = agentOrders.reduce((sum, o) => sum + (o.amountPending ?? Math.max(0, (o.orderValue || 0) - (o.amountReceived || 0))), 0);
  
  // Calculate commission (default 8.0% or 10.0%)
  const commissionRate = 8.0;
  const commissionEarned = Math.round(totalCollected * (commissionRate / 100));
  const commissionPotential = Math.round(totalBookedValue * (commissionRate / 100));

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
    return agentOrders.filter(o => {
      const matchStatus = statusFilter === 'ALL' || o.orderStatus === statusFilter;
      const cleanQ = searchQuery.toLowerCase();
      const matchSearch =
        o.orderId.toLowerCase().includes(cleanQ) ||
        o.schoolName.toLowerCase().includes(cleanQ) ||
        (o.docketNumber && o.docketNumber.toLowerCase().includes(cleanQ)) ||
        (o.category && o.category.toLowerCase().includes(cleanQ));
      return matchStatus && matchSearch;
    });
  }, [agentOrders, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner - Scoped Regional Agent Workspace */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-950 text-white p-6 rounded-2xl border border-amber-800/60 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30">
              <Users className="w-3.5 h-3.5" />
              <span>Field Partner Workspace • Dedicated Regional View</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>{currentUser.name}</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold">
                {currentUser.agentCode || currentUser.agentId || 'AGENT'}
              </span>
            </h1>
            <p className="text-xs text-slate-300 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-400" />
                <span>Territory: <strong className="text-white">{currentUser.state || 'Assigned Region'}</strong></span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Award className="w-3 h-3 text-amber-400" />
                <span>Commission Rate: <strong className="text-white">{commissionRate}%</strong> on collections</span>
              </span>
            </p>
          </div>

          {onOpenNewOrder && (
            <button
              type="button"
              onClick={onOpenNewOrder}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer transition-all self-start md:self-center"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit Regional PO / Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Agent KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">My Regional Orders</span>
            <FileText className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{agentOrders.length}</div>
          <div className="text-[11px] text-slate-500">
            Across {mySchools.length} institutional schools
          </div>
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

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1 bg-gradient-to-br from-amber-50/50 to-white">
          <div className="flex items-center justify-between text-amber-800">
            <span className="font-bold uppercase tracking-wider text-[10px]">My Realized Commission</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-900 font-mono">
            ₹{commissionEarned.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-500">
            Potential upon full realization: ₹{commissionPotential.toLocaleString('en-IN')}
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
              Territory Orders ({agentOrders.length})
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
            {/* Search & Status Filters */}
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 bg-white">
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

              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
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

            {/* Orders Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Order ID & Date</th>
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
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
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
                            <span className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                              order.dispatchStatus === 'DELIVERED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              order.dispatchStatus === 'DISPATCHED' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                              order.dispatchStatus === 'IN_TRANSIT' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                              'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {order.dispatchStatus || 'PENDING'}
                            </span>
                          </div>
                          {order.docketNumber && (
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                              Doc: {order.docketNumber} ({order.courierName || 'Courier'})
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                              order.paymentStatus === 'FULL_PAID' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              order.paymentStatus === 'PARTIAL_PAID' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                              'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                              {order.paymentStatus === 'FULL_PAID' ? 'RECEIVED' : order.paymentStatus === 'PARTIAL_PAID' ? 'PARTIAL' : 'PENDING'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                            Rec: ₹{(order.amountReceived || 0).toLocaleString('en-IN')}
                          </div>
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
