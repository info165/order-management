import React, { useState, useEffect } from 'react';
import {
  FileEdit,
  PlusCircle,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  Download,
  AlertCircle,
  Eye,
  RefreshCw,
  School as SchoolIcon,
  Package,
  Calendar,
  Layers
} from 'lucide-react';
import { Order, School, Product, Agent } from '../../types';
import { getOrders, getSchools, getProducts, getAgents, createOrder, createSchool } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { NewOrderModal } from '../orders/NewOrderModal';
import { ImportModal } from '../orders/ImportModal';
import { OrderDetailModal } from '../orders/OrderDetailModal';
import { getDisplaySerialNo } from '../../utils/orderDisplay';

export const DataEntryDashboard: React.FC = () => {
  const { currentUser } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordList, schList] = await Promise.all([
        getOrders(currentUser || undefined),
        getSchools()
      ]);
      setOrders(ordList);
      setSchools(schList);
    } catch (e) {
      console.error('Failed to load data entry workspace data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter orders
  const filteredOrders = orders.filter(o => {
    const matchesStatus = statusFilter === 'ALL' || o.orderStatus === statusFilter;
    const cleanQ = searchQuery.toLowerCase();
    const matchesSearch =
      o.orderId.toLowerCase().includes(cleanQ) ||
      o.schoolName.toLowerCase().includes(cleanQ) ||
      o.agentName.toLowerCase().includes(cleanQ) ||
      (o.state && o.state.toLowerCase().includes(cleanQ));
    return matchesStatus && matchesSearch;
  });

  // Calculate Operator Metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const ordersToday = orders.filter(o => o.createdAt.startsWith(todayStr) || o.orderDate.startsWith(todayStr));
  const totalValueEntered = orders.reduce((sum, o) => sum + (o.orderValue || 0), 0);
  const pendingOrders = orders.filter(o => o.orderStatus === 'NEW_ORDER' || o.orderStatus === 'UNDER_PROCESSING');

  return (
    <div className="space-y-6">
      {/* Header Banner - Dedicated Data Entry Operator Workspace */}
      <div className="bg-gradient-to-r from-sky-900 via-slate-900 to-slate-950 text-white p-6 rounded-2xl border border-sky-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold border border-sky-500/30">
              <FileEdit className="w-3.5 h-3.5" />
              <span>Data Entry Workspace • Dedicated Operator View</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Institutional Order Entry & School Registration
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Welcome, <strong className="text-sky-300">{currentUser?.name || 'Operator'}</strong>. 
              Rapidly punch government school purchase orders, register school profiles, or batch upload PO sheets. 
              <span className="text-amber-300 font-medium"> Note: Order values entered are GST-inclusive.</span>
            </p>
          </div>

          {/* Rapid Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOrderModal(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Punch New Order</span>
            </button>

            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Batch Excel Upload</span>
            </button>
          </div>
        </div>
      </div>

      {/* Operator Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Master Orders</span>
            <Layers className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{orders.length}</div>
          <div className="text-[11px] text-slate-500">In system database</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Registered Schools</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{schools.length}</div>
          <div className="text-[11px] text-slate-500">KV & JNV institutions</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-600">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Pending Verification</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700">{pendingOrders.length}</div>
          <div className="text-[11px] text-slate-500">New or processing orders</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Cumulative Value Entered</span>
            <TrendingUp className="w-4 h-4 text-slate-700" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            ₹{totalValueEntered.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-emerald-600 font-medium">GST Inclusive Value</div>
        </div>
      </div>

      {/* Operator Orders Management Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden text-xs">
        {/* Search & Filter Header */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/70">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, School, or Partner..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium bg-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            <span className="text-slate-400 text-xs font-semibold mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            {[
              { id: 'ALL', label: 'All Orders' },
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
                    ? 'bg-sky-900 text-white font-bold'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}

            <button
              type="button"
              onClick={loadData}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600"
              title="Refresh records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Order ID & Date</th>
                <th className="px-4 py-3">School / KV Institution</th>
                <th className="px-4 py-3">Partner / Territory</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Order Value (GST Inc.)</th>
                <th className="px-4 py-3">Order Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No orders found matching your search. Use "Punch New Order" above to enter records.
                  </td>
                </tr>
              ) : (
                filteredOrders.slice(0, 50).map(order => (
                  <tr key={order.orderId} className="hover:bg-sky-50/40 transition-colors">
                    <td className="px-4 py-3 font-mono">
                      <div className="font-bold text-sky-900">
                        {currentUser?.role !== 'AGENT' && getDisplaySerialNo(order, orders)
                          ? `Order No - ${getDisplaySerialNo(order, orders)}`
                          : order.orderId}
                      </div>
                      <div className="text-[10px] text-slate-400">{order.orderDate}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{order.schoolName}</div>
                      <div className="text-[10px] text-slate-500">
                        {order.district ? `${order.district}, ` : ''}{order.state || 'General'}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-slate-800 font-semibold">{order.agentName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{order.agentCode || 'DIRECT'}</div>
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                        {order.category || 'General Supplies'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      ₹{order.orderValue.toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                        order.orderStatus === 'DELIVERED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        order.orderStatus === 'DISPATCHED' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                        order.orderStatus === 'UNDER_PROCESSING' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        order.orderStatus === 'CANCELLED' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                        'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        {order.orderStatus.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-sky-100 text-sky-800 font-semibold rounded-md text-[11px] flex items-center gap-1 mx-auto transition-colors cursor-pointer"
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

        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-slate-500 text-[11px] flex items-center justify-between">
          <span>Showing {Math.min(filteredOrders.length, 50)} of {filteredOrders.length} orders</span>
          <span className="font-mono text-[10px]">Data Entry View • Active Session</span>
        </div>
      </div>

      {/* MODALS */}
      {showOrderModal && currentUser && (
        <NewOrderModal
          currentUser={currentUser}
          onClose={() => setShowOrderModal(false)}
          onOrderCreated={() => {
            setShowOrderModal(false);
            loadData();
          }}
        />
      )}

      {showImportModal && currentUser && (
        <ImportModal
          currentUser={currentUser}
          onClose={() => setShowImportModal(false)}
          onImportComplete={() => {
            setShowImportModal(false);
            loadData();
          }}
        />
      )}

      {selectedOrder && currentUser && (
        <OrderDetailModal
          order={selectedOrder}
          displaySerialNo={
            currentUser?.role !== 'AGENT' ? getDisplaySerialNo(selectedOrder, orders) : undefined
          }
          currentUser={currentUser}
          onClose={() => setSelectedOrder(null)}
          onOrderUpdated={() => {
            loadData();
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
};
