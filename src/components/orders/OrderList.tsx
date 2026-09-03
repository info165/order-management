import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  Plus,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Truck,
  CreditCard,
  RotateCcw,
  CheckSquare,
  Square,
  AlertCircle
} from 'lucide-react';
import { Order, OrderStatus, PaymentStatus, DispatchStatus, UserProfile } from '../../types';
import { CurrencyFormatter } from '../common/CurrencyFormatter';
import { StatusBadge } from '../common/StatusBadge';
import { TrackingLink } from '../common/TrackingLink';
import { exportOrdersToExcel, exportOrdersToCSV } from '../../services/importExportService';

interface OrderListProps {
  orders: Order[];
  currentUser: UserProfile;
  onSelectOrder: (order: Order) => void;
  onOpenNewOrder: () => void;
  onOpenImport: () => void;
  onDeleteOrder: (orderId: string) => void;
  onBatchStatusUpdate: (orderIds: string[], newStatus: OrderStatus) => void;
}

export const OrderList: React.FC<OrderListProps> = ({
  orders,
  currentUser,
  onSelectOrder,
  onOpenNewOrder,
  onOpenImport,
  onDeleteOrder,
  onBatchStatusUpdate
}) => {
  const isAgent = currentUser.role === 'AGENT';
  const isAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN';

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchoolType, setSelectedSchoolType] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('ALL');
  const [selectedDispatchStatus, setSelectedDispatchStatus] = useState<string>('ALL');
  const [selectedAgent, setSelectedAgent] = useState('ALL');
  const [selectedFY, setSelectedFY] = useState('ALL');
  const [filterOverdueDelivery, setFilterOverdueDelivery] = useState(false);
  const [filterOverduePayment, setFilterOverduePayment] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Pagination & Selection
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchTargetStatus, setBatchTargetStatus] = useState<OrderStatus>('READY_FOR_DISPATCH');

  // Filter options lookup
  const categories = useMemo(() => Array.from(new Set(orders.map(o => o.category))).filter(Boolean), [orders]);
  const schoolTypes = ['Kendriya Vidyalaya', 'Jawahar Navodaya Vidyalaya', 'PM SHRI School', 'State Government School'];
  const agents = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach(o => {
      if (o.agentId && o.agentName) map.set(o.agentId, o.agentName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [orders]);

  const todayStr = new Date().toISOString().split('T')[0];

  // Filtering Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.isDeleted) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          o.orderId.toLowerCase().includes(q) ||
          o.orderNumber.toLowerCase().includes(q) ||
          o.schoolName.toLowerCase().includes(q) ||
          (o.schoolCode && o.schoolCode.toLowerCase().includes(q)) ||
          o.agentName.toLowerCase().includes(q) ||
          o.category.toLowerCase().includes(q) ||
          (o.purchaseOrderNumber && o.purchaseOrderNumber.toLowerCase().includes(q)) ||
          (o.invoiceNumber && o.invoiceNumber.toLowerCase().includes(q)) ||
          (o.docketNumber && o.docketNumber.toLowerCase().includes(q)) ||
          (o.courierName && o.courierName.toLowerCase().includes(q));
        if (!match) return false;
      }

      if (selectedSchoolType !== 'ALL' && o.schoolType !== selectedSchoolType) return false;
      if (selectedCategory !== 'ALL' && o.category !== selectedCategory) return false;
      if (selectedStatus !== 'ALL' && o.status !== selectedStatus) return false;
      if (selectedPaymentStatus !== 'ALL' && o.paymentStatus !== selectedPaymentStatus) return false;
      if (selectedDispatchStatus !== 'ALL' && o.dispatchStatus !== selectedDispatchStatus) return false;
      if (!isAgent && selectedAgent !== 'ALL' && o.agentId !== selectedAgent) return false;
      if (selectedFY !== 'ALL' && o.financialYear !== selectedFY) return false;

      if (filterOverdueDelivery) {
        const isOverdue =
          o.expectedDeliveryDate &&
          o.expectedDeliveryDate < todayStr &&
          o.deliveryStatus !== 'Delivered' &&
          o.status !== 'DELIVERED' &&
          o.status !== 'CANCELLED';
        if (!isOverdue) return false;
      }

      if (filterOverduePayment) {
        const isOverdue =
          o.expectedPaymentDate &&
          o.expectedPaymentDate < todayStr &&
          o.paymentStatus !== 'PAID' &&
          o.status !== 'CANCELLED';
        if (!isOverdue) return false;
      }

      return true;
    });
  }, [
    orders,
    searchQuery,
    selectedSchoolType,
    selectedCategory,
    selectedStatus,
    selectedPaymentStatus,
    selectedDispatchStatus,
    selectedAgent,
    selectedFY,
    filterOverdueDelivery,
    filterOverduePayment,
    isAgent,
    todayStr
  ]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSchoolType('ALL');
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
    setSelectedPaymentStatus('ALL');
    setSelectedDispatchStatus('ALL');
    setSelectedAgent('ALL');
    setSelectedFY('ALL');
    setFilterOverdueDelivery(false);
    setFilterOverduePayment(false);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedSchoolType !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedPaymentStatus !== 'ALL' ||
    selectedDispatchStatus !== 'ALL' ||
    selectedAgent !== 'ALL' ||
    selectedFY !== 'ALL' ||
    filterOverdueDelivery ||
    filterOverduePayment;

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Bulk Selection handling
  const handleSelectAllOnPage = () => {
    const pageIds = paginatedOrders.map(o => o.orderId);
    const allSelected = pageIds.every(id => selectedOrderIds.includes(id));
    if (allSelected) {
      setSelectedOrderIds(selectedOrderIds.filter(id => !pageIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedOrderIds, ...pageIds]));
      setSelectedOrderIds(merged);
    }
  };

  const handleToggleSelectOrder = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedOrderIds.includes(orderId)) {
      setSelectedOrderIds(selectedOrderIds.filter(id => id !== orderId));
    } else {
      setSelectedOrderIds([...selectedOrderIds, orderId]);
    }
  };

  // Export handlers
  const handleExportExcel = () => {
    const exportData = selectedOrderIds.length > 0
      ? orders.filter(o => selectedOrderIds.includes(o.orderId))
      : filteredOrders;
    exportOrdersToExcel(exportData, `GovSchool_Orders_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportCSV = () => {
    const exportData = selectedOrderIds.length > 0
      ? orders.filter(o => selectedOrderIds.includes(o.orderId))
      : filteredOrders;
    exportOrdersToCSV(exportData, `GovSchool_Orders_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-4">
      {/* Header & Primary Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{isAgent ? 'My Assigned School Orders' : 'Central Order Registry'}</span>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAgent
              ? 'Real-time order statuses, logistics tracking, and delivery confirmations for your allocated schools.'
              : 'Complete lifecycle management of Kendriya Vidyalaya, Navodaya Vidyalaya, and PM SHRI procurement orders.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Export button */}
          <div className="inline-flex rounded-lg shadow-sm border border-slate-300 overflow-hidden text-xs">
            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-white hover:bg-slate-50 text-slate-700 font-medium px-3 py-1.5 flex items-center gap-1.5 border-r border-slate-300 transition-colors"
              title="Export displayed orders to Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="bg-white hover:bg-slate-50 text-slate-700 font-medium px-2 py-1.5 transition-colors"
              title="Export as CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>

          {!isAgent && (
            <>
              <button
                type="button"
                onClick={onOpenImport}
                className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg border border-slate-300 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Import Sheet</span>
              </button>

              <button
                type="button"
                onClick={onOpenNewOrder}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Order</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Multi-Parameter Filter Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          {/* Search bar inside filter */}
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search School, PO, Docket, ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
            />
          </div>

          {/* School System filter */}
          <div>
            <select
              value={selectedSchoolType}
              onChange={(e) => {
                setSelectedSchoolType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-medium"
            >
              <option value="ALL">All School Types (KV/JNV)</option>
              {schoolTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-medium"
            >
              <option value="ALL">All Categories / Labs</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Order Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-medium"
            >
              <option value="ALL">All Order Statuses</option>
              <option value="PO_RECEIVED">PO Received</option>
              <option value="PROCESSING">Processing</option>
              <option value="READY_FOR_DISPATCH">Ready for Dispatch</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CLOSED">Closed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Payment Status */}
          <div>
            <select
              value={selectedPaymentStatus}
              onChange={(e) => {
                setSelectedPaymentStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-medium"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="PAID">Paid in Full</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAYMENT_PENDING">Payment Pending</option>
              <option value="INVOICE_GENERATED">Invoice Generated</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Row (Agent, FY, Overdue Badges) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Agent filter - Admin only */}
            {!isAgent && (
              <div className="flex items-center gap-1 text-slate-600">
                <span className="text-[11px] font-medium text-slate-400">Agent:</span>
                <select
                  value={selectedAgent}
                  onChange={(e) => {
                    setSelectedAgent(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none"
                >
                  <option value="ALL">All Regional Agents</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Financial Year */}
            <div className="flex items-center gap-1 text-slate-600">
              <span className="text-[11px] font-medium text-slate-400">FY:</span>
              <select
                value={selectedFY}
                onChange={(e) => {
                  setSelectedFY(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none"
              >
                <option value="ALL">All Years</option>
                <option value="2026-27">2026-27</option>
                <option value="2025-26">2025-26</option>
                <option value="2024-25">2024-25</option>
              </select>
            </div>

            {/* Overdue quick toggles */}
            <button
              type="button"
              onClick={() => setFilterOverdueDelivery(!filterOverdueDelivery)}
              className={`px-2 py-1 rounded border transition-colors flex items-center gap-1 ${
                filterOverdueDelivery
                  ? 'bg-rose-100 text-rose-800 border-rose-300 font-semibold'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <AlertCircle className="w-3 h-3 text-rose-600" />
              <span>Overdue Delivery</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterOverduePayment(!filterOverduePayment)}
              className={`px-2 py-1 rounded border transition-colors flex items-center gap-1 ${
                filterOverduePayment
                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <AlertCircle className="w-3 h-3 text-amber-600" />
              <span>Overdue Payment</span>
            </button>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Batch Action Bar if items are selected */}
      {selectedOrderIds.length > 0 && !isAgent && (
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-amber-400">
              {selectedOrderIds.length} {selectedOrderIds.length === 1 ? 'order' : 'orders'} selected
            </span>
            <span className="text-slate-400">|</span>
            <button
              type="button"
              onClick={() => setBatchModalOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-2.5 py-1 rounded transition-colors"
            >
              Update Status in Bulk
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-2.5 py-1 rounded transition-colors border border-slate-700"
            >
              Export Selected
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSelectedOrderIds([])}
            className="text-slate-400 hover:text-white"
          >
            Deselect All
          </button>
        </div>
      )}

      {/* Main Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 select-none">
              <tr>
                {!isAgent && (
                  <th className="px-3 py-3 w-8 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAllOnPage}
                      className="text-slate-500 hover:text-slate-800"
                      title="Select all on this page"
                    >
                      {paginatedOrders.length > 0 && paginatedOrders.every(o => selectedOrderIds.includes(o.orderId)) ? (
                        <CheckSquare className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                )}
                <th className="px-4 py-3">Order / Contract</th>
                <th className="px-4 py-3">School Name</th>
                <th className="px-4 py-3">Category</th>
                {!isAgent && <th className="px-4 py-3">Assigned Agent</th>}
                <th className="px-4 py-3 text-right">Value (₹)</th>
                <th className="px-4 py-3">Order Status</th>
                <th className="px-4 py-3">Dispatch & Courier</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <Search className="w-5 h-5" />
                      </div>
                      <div className="font-semibold text-slate-800">No orders match your filter criteria</div>
                      <p className="text-xs text-slate-500">
                        Try clearing or modifying your filter parameters to view other purchase orders.
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-2 text-xs font-semibold text-amber-700 hover:text-amber-800 underline"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const isSelected = selectedOrderIds.includes(order.orderId);
                  const isDeliveryOverdue =
                    order.expectedDeliveryDate &&
                    order.expectedDeliveryDate < todayStr &&
                    order.deliveryStatus !== 'Delivered' &&
                    order.status !== 'DELIVERED' &&
                    order.status !== 'CANCELLED';

                  return (
                    <tr
                      key={order.orderId}
                      onClick={() => onSelectOrder(order)}
                      className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                        isSelected ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      {!isAgent && (
                        <td className="px-3 py-3 text-center" onClick={(e) => handleToggleSelectOrder(order.orderId, e)}>
                          <button type="button" className="text-slate-400 hover:text-slate-700">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-amber-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="px-4 py-3 font-mono">
                        <div className="font-semibold text-slate-900">{order.orderId}</div>
                        <div className="text-[11px] text-slate-500">{order.orderNumber}</div>
                        <div className="text-[10px] text-slate-400">{order.financialYear}</div>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <div className="font-semibold text-slate-800 truncate" title={order.schoolName}>
                          {order.schoolName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {order.schoolType} {order.state ? `• ${order.state}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-[150px] truncate" title={order.category}>
                        {order.category}
                      </td>
                      {!isAgent && (
                        <td className="px-4 py-3 text-slate-700">
                          <div className="font-medium text-slate-900">{order.agentName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{order.agentCode}</div>
                        </td>
                      )}
                      <td className="px-4 py-3 text-right font-mono">
                        <div className="font-semibold text-slate-900">
                          <CurrencyFormatter amount={order.orderValue} />
                        </div>
                        {order.grossOrderValue && (
                          <div className="text-[10px] text-slate-400">
                            Incl GST: <CurrencyFormatter amount={order.grossOrderValue} />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} type="order" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <TrackingLink courierName={order.courierName} docketNumber={order.docketNumber} />
                          {isDeliveryOverdue && (
                            <div className="text-[10px] text-rose-600 font-medium flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>Overdue</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <StatusBadge status={order.paymentStatus} type="payment" />
                          {order.paymentStatus !== 'PAID' && (
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              Due: <CurrencyFormatter amount={order.amountPending ?? order.orderValue} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectOrder(order)}
                            className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="View full order details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete order ${order.orderId}?`)) {
                                  onDeleteOrder(order.orderId);
                                }
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete order"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded border border-slate-200 bg-white font-medium focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-slate-400">
              Showing {filteredOrders.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} -{' '}
              {Math.min(currentPage * pageSize, filteredOrders.length)} of {filteredOrders.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-slate-700 px-2 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Status Update Modal */}
      {batchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Batch Update Order Status</h3>
              <p className="text-xs text-slate-500 mt-1">
                You are updating the status for {selectedOrderIds.length} selected orders simultaneously.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select New Status</label>
              <select
                value={batchTargetStatus}
                onChange={(e) => setBatchTargetStatus(e.target.value as OrderStatus)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="PO_RECEIVED">PO Received</option>
                <option value="PROCESSING">Processing</option>
                <option value="READY_FOR_DISPATCH">Ready for Dispatch</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CLOSED">Closed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBatchModalOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onBatchStatusUpdate(selectedOrderIds, batchTargetStatus);
                  setSelectedOrderIds([]);
                  setBatchModalOpen(false);
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-sm"
              >
                Confirm Batch Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
