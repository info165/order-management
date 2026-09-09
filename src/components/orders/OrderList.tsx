import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  Plus,
  Trash2,
  Eye,
  RotateCcw,
  CheckSquare,
  Square,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns,
  UserCheck
} from 'lucide-react';
import { Order, OrderStatus, PaymentStatus, DispatchStatus, UserProfile, Agent } from '../../types';
import { CurrencyFormatter } from '../common/CurrencyFormatter';
import { StatusBadge } from '../common/StatusBadge';
import { TrackingLink } from '../common/TrackingLink';
import { exportOrdersToExcel, exportOrdersToCSV } from '../../services/importExportService';
import { clearAllOrders, clearAllPastDataAndResyncWithSheet, getAgents, bulkUpdateOrderAgent } from '../../services/dataService';
import { ColumnFilterPopover, NumericFilterValue } from './ColumnFilterPopover';
import { useColumnResize } from './useColumnResize';

interface OrderListProps {
  orders: Order[];
  currentUser: UserProfile;
  onSelectOrder: (order: Order) => void;
  onOpenNewOrder: () => void;
  onOpenImport: () => void;
  onDeleteOrder: (orderId: string) => void;
  onBatchStatusUpdate: (orderIds: string[], newStatus: OrderStatus) => void;
  onOrdersUpdated?: () => void;
  initialFilterCategory?: string;
}

export const OrderList: React.FC<OrderListProps> = ({
  orders,
  currentUser,
  onSelectOrder,
  onOpenNewOrder,
  onOpenImport,
  onDeleteOrder,
  onBatchStatusUpdate,
  onOrdersUpdated,
  initialFilterCategory
}) => {
  const isAgent = currentUser.role === 'AGENT';
  const isAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN';

  // Column Resizing Hook
  const { widths, resizingCol, startResize, resetWidths } = useColumnResize();

  // Active open popover tracking
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  // Global search & quick filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOverdueDelivery, setFilterOverdueDelivery] = useState(false);
  const [filterOverduePayment, setFilterOverduePayment] = useState(false);
  const [selectedFY, setSelectedFY] = useState('ALL');

  // Excel / Google Sheets Column Filters state
  const [colContractSearch, setColContractSearch] = useState('');
  const [colSelectedSchools, setColSelectedSchools] = useState<string[]>([]);
  const [colSelectedCategories, setColSelectedCategories] = useState<string[]>([]);
  const [colSelectedAgents, setColSelectedAgents] = useState<string[]>([]);
  const [colValueFilter, setColValueFilter] = useState<NumericFilterValue>({ mode: 'ANY' });
  const [colSelectedCompanies, setColSelectedCompanies] = useState<string[]>([]);
  const [colSelectedStatuses, setColSelectedStatuses] = useState<string[]>([]);
  const [colSelectedDispatchStatuses, setColSelectedDispatchStatuses] = useState<string[]>([]);
  const [colSelectedPaymentStatuses, setColSelectedPaymentStatuses] = useState<string[]>([]);

  // Sorting state - default to SL. NO. ascending (1, 2, 3...)
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>({ key: 'serialNumber', direction: 'asc' });

  // Row selection state
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchTargetStatus, setBatchTargetStatus] = useState<OrderStatus>('READY_FOR_DISPATCH');
  const [isResetting, setIsResetting] = useState(false);

  const canManageOrders = !isAgent && (isAdmin || currentUser.role === 'DATA_ENTRY_OPERATOR' || currentUser.role === 'ACCOUNTS' || currentUser.role === 'DISPATCH');
  // Matches the database's actual create permission (firestore.rules' isAdminOrOps()):
  // only Admin/Super Admin/Data Entry can create orders. Accounts and Dispatch can view
  // and update specific fields on existing orders, but not create new ones - showing
  // them a "New Order"/"Upload Excel" button that always fails silently in the
  // background would be misleading.
  const canCreateOrders = isAdmin || currentUser.role === 'DATA_ENTRY_OPERATOR';

  // Bulk Agent Reassignment state
  const [agentsList, setAgentsList] = useState<Agent[]>([]);
  const [bulkSelectedAgentId, setBulkSelectedAgentId] = useState('');
  const [isApplyingBulkAgent, setIsApplyingBulkAgent] = useState(false);
  const [bulkAgentMessage, setBulkAgentMessage] = useState<string | null>(null);

  React.useEffect(() => {
    getAgents().then(setAgentsList).catch(console.error);
  }, []);

  const handleApplyBulkAgent = async () => {
    if (!bulkSelectedAgentId || selectedOrderIds.length === 0) return;
    setIsApplyingBulkAgent(true);
    setBulkAgentMessage(null);
    try {
      // Respects selection strictly: applies ONLY to the selected order IDs
      await bulkUpdateOrderAgent(selectedOrderIds, bulkSelectedAgentId, currentUser);

      // Notify parent to refresh data immediately without requiring a manual page refresh
      if (onOrdersUpdated) {
        onOrdersUpdated();
      }

      const count = selectedOrderIds.length;
      setSelectedOrderIds([]);
      setBulkSelectedAgentId('');
      setBulkAgentMessage(`Assigned ${count} order(s) to agent!`);
      setTimeout(() => setBulkAgentMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to bulk reassign agent.');
    } finally {
      setIsApplyingBulkAgent(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Options lists for multi-select popovers
  const schoolOptions = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach(o => {
      if (o.schoolName) {
        counts.set(o.schoolName, (counts.get(o.schoolName) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ value: name, label: name, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [orders]);

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach(o => {
      if (o.category) {
        counts.set(o.category, (counts.get(o.category) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ value: name, label: name, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [orders]);

  const agentOptions = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    orders.forEach(o => {
      const id = o.agentId || 'AGT-DIRECT';
      const name = o.agentName || 'In-House / Direct';
      const existing = counts.get(id);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(id, { name, count: 1 });
      }
    });
    return Array.from(counts.entries())
      .map(([id, info]) => ({ value: id, label: info.name, count: info.count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [orders]);

  const companyOptions = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach(o => {
      const comp = o.company || 'FIPL';
      counts.set(comp, (counts.get(comp) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([comp, count]) => ({ value: comp, label: comp, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [orders]);

  const statusOptions = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach(o => {
      counts.set(o.status, (counts.get(o.status) || 0) + 1);
    });
    return [
      { value: 'PO_RECEIVED', label: 'PO Received' },
      { value: 'PROCESSING', label: 'Processing' },
      { value: 'READY_FOR_DISPATCH', label: 'Ready for Dispatch' },
      { value: 'DISPATCHED', label: 'Dispatched' },
      { value: 'DELIVERED', label: 'Delivered' },
      { value: 'CLOSED', label: 'Closed' },
      { value: 'CANCELLED', label: 'Cancelled' }
    ].map(opt => ({ ...opt, count: counts.get(opt.value) || 0 }));
  }, [orders]);

  const dispatchOptions = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach(o => {
      counts.set(o.dispatchStatus, (counts.get(o.dispatchStatus) || 0) + 1);
    });
    return [
      { value: 'NOT_READY', label: 'Not Ready' },
      { value: 'PACKED', label: 'Packed' },
      { value: 'DISPATCHED', label: 'Dispatched' },
      { value: 'DELIVERED', label: 'Delivered' }
    ].map(opt => ({ ...opt, count: counts.get(opt.value) || 0 }));
  }, [orders]);

  const paymentOptions = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach(o => {
      counts.set(o.paymentStatus, (counts.get(o.paymentStatus) || 0) + 1);
    });
    return [
      { value: 'PAID', label: 'Paid in Full' },
      { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
      { value: 'PAYMENT_PENDING', label: 'Payment Pending' },
      { value: 'INVOICE_GENERATED', label: 'Invoice Generated' }
    ].map(opt => ({ ...opt, count: counts.get(opt.value) || 0 }));
  }, [orders]);

  // Handle Sort Toggles - Always defaults to SL. NO. ascending
  const handleSort = (columnKey: string) => {
    setSortConfig(prev => {
      if (!prev || prev.key !== columnKey) {
        return { key: columnKey, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key: columnKey, direction: 'desc' };
      }
      // Return to default SL. NO. ascending order
      return { key: 'serialNumber', direction: 'asc' };
    });
  };

  // Filter Active States for Badges
  const isContractFiltered = colContractSearch.trim().length > 0;
  const isSchoolFiltered = colSelectedSchools.length > 0;
  const isCategoryFiltered = colSelectedCategories.length > 0;
  const isAgentFiltered = colSelectedAgents.length > 0;
  const isValueFiltered = colValueFilter.mode !== 'ANY';
  const isCompanyFiltered = colSelectedCompanies.length > 0;
  const isStatusFiltered = colSelectedStatuses.length > 0;
  const isDispatchFiltered = colSelectedDispatchStatuses.length > 0;
  const isPaymentFiltered = colSelectedPaymentStatuses.length > 0;

  const hasAnyFilterActive =
    searchQuery.trim() !== '' ||
    filterOverdueDelivery ||
    filterOverduePayment ||
    selectedFY !== 'ALL' ||
    isContractFiltered ||
    isSchoolFiltered ||
    isCategoryFiltered ||
    isAgentFiltered ||
    isValueFiltered ||
    isCompanyFiltered ||
    isStatusFiltered ||
    isDispatchFiltered ||
    isPaymentFiltered;

  // Clear all filters
  const handleResetAllFilters = () => {
    setSearchQuery('');
    setFilterOverdueDelivery(false);
    setFilterOverduePayment(false);
    setSelectedFY('ALL');
    setColContractSearch('');
    setColSelectedSchools([]);
    setColSelectedCategories([]);
    setColSelectedAgents([]);
    setColValueFilter({ mode: 'ANY' });
    setColSelectedCompanies([]);
    setColSelectedStatuses([]);
    setColSelectedDispatchStatuses([]);
    setColSelectedPaymentStatuses([]);
    setSortConfig({ key: 'serialNumber', direction: 'asc' });
  };

  // Core Filtering Pipeline
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.isDeleted) return false;

      // Global text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const contractStr = (o.contractNumber || o.purchaseOrderNumber || o.orderNumber || '').toLowerCase();
        const match =
          (o.serialNumber !== undefined && String(o.serialNumber).includes(q)) ||
          contractStr.includes(q) ||
          o.orderId.toLowerCase().includes(q) ||
          o.schoolName.toLowerCase().includes(q) ||
          (o.company && o.company.toLowerCase().includes(q)) ||
          (o.agentName && o.agentName.toLowerCase().includes(q)) ||
          (o.category && o.category.toLowerCase().includes(q)) ||
          (o.docketNumber && o.docketNumber.toLowerCase().includes(q)) ||
          (o.courierName && o.courierName.toLowerCase().includes(q));
        if (!match) return false;
      }

      // Financial year
      if (selectedFY !== 'ALL' && o.financialYear !== selectedFY) return false;

      // Overdue delivery
      if (filterOverdueDelivery) {
        const isOverdue =
          o.expectedDeliveryDate &&
          o.expectedDeliveryDate < todayStr &&
          o.deliveryStatus !== 'Delivered' &&
          o.status !== 'DELIVERED' &&
          o.status !== 'CANCELLED';
        if (!isOverdue) return false;
      }

      // Overdue payment
      if (filterOverduePayment) {
        const isOverdue =
          o.expectedPaymentDate &&
          o.expectedPaymentDate < todayStr &&
          o.paymentStatus !== 'PAID' &&
          o.status !== 'CANCELLED';
        if (!isOverdue) return false;
      }

      // Column: Contract text search
      if (isContractFiltered) {
        const term = colContractSearch.toLowerCase().trim();
        const contractStr = (o.contractNumber || o.purchaseOrderNumber || o.orderNumber || '').toLowerCase();
        const serialStr = o.serialNumber !== undefined ? String(o.serialNumber) : '';
        if (!contractStr.includes(term) && !serialStr.includes(term)) {
          return false;
        }
      }

      // Column: Schools multi-select
      if (isSchoolFiltered && !colSelectedSchools.includes(o.schoolName)) {
        return false;
      }

      // Column: Categories multi-select
      if (isCategoryFiltered && !colSelectedCategories.includes(o.category)) {
        return false;
      }

      // Column: Agents multi-select
      if (!isAgent && isAgentFiltered && !colSelectedAgents.includes(o.agentId || 'AGT-DIRECT')) {
        return false;
      }

      // Column: Companies multi-select
      if (isCompanyFiltered && !colSelectedCompanies.includes(o.company || 'FIPL')) {
        return false;
      }

      // Column: Order Statuses multi-select
      if (isStatusFiltered && !colSelectedStatuses.includes(o.status)) {
        return false;
      }

      // Column: Dispatch Statuses multi-select
      if (isDispatchFiltered && !colSelectedDispatchStatuses.includes(o.dispatchStatus)) {
        return false;
      }

      // Column: Payment Statuses multi-select
      if (isPaymentFiltered && !colSelectedPaymentStatuses.includes(o.paymentStatus)) {
        return false;
      }

      // Column: Value numeric filter
      if (colValueFilter.mode !== 'ANY') {
        const val = o.orderValue;
        const min = colValueFilter.min ?? 0;
        const max = colValueFilter.max ?? Infinity;

        if (colValueFilter.mode === 'GT' && val < min) return false;
        if (colValueFilter.mode === 'LT' && val > max) return false;
        if (colValueFilter.mode === 'BETWEEN' && (val < min || val > max)) return false;
        if (colValueFilter.mode === 'EQ' && val !== min) return false;
      }

      return true;
    });
  }, [
    orders,
    searchQuery,
    selectedFY,
    filterOverdueDelivery,
    filterOverduePayment,
    todayStr,
    isContractFiltered,
    colContractSearch,
    isSchoolFiltered,
    colSelectedSchools,
    isCategoryFiltered,
    colSelectedCategories,
    isAgentFiltered,
    colSelectedAgents,
    isCompanyFiltered,
    colSelectedCompanies,
    isStatusFiltered,
    colSelectedStatuses,
    isDispatchFiltered,
    colSelectedDispatchStatuses,
    isPaymentFiltered,
    colSelectedPaymentStatuses,
    colValueFilter,
    isAgent
  ]);

  // Core Sorting Pipeline - Defaults strictly to SL. NO. ascending (1, 2, 3...)
  const sortedOrders = useMemo(() => {
    if (!sortConfig) {
      return [...filteredOrders].sort((a, b) => (a.serialNumber || 0) - (b.serialNumber || 0));
    }

    const { key, direction } = sortConfig;
    const factor = direction === 'asc' ? 1 : -1;

    return [...filteredOrders].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (key) {
        case 'serialNumber':
          valA = a.serialNumber !== undefined && a.serialNumber !== null ? a.serialNumber : Infinity;
          valB = b.serialNumber !== undefined && b.serialNumber !== null ? b.serialNumber : Infinity;
          return (valA - valB) * factor;

        case 'contract':
          valA = (a.contractNumber || a.purchaseOrderNumber || a.orderNumber || '').toLowerCase();
          valB = (b.contractNumber || b.purchaseOrderNumber || b.orderNumber || '').toLowerCase();
          break;

        case 'schoolName':
          valA = a.schoolName.toLowerCase();
          valB = b.schoolName.toLowerCase();
          break;

        case 'category':
          valA = (a.category || '').toLowerCase();
          valB = (b.category || '').toLowerCase();
          break;

        case 'agent':
          valA = (a.agentName || '').toLowerCase();
          valB = (b.agentName || '').toLowerCase();
          break;

        case 'orderValue':
          valA = a.orderValue;
          valB = b.orderValue;
          return (valA - valB) * factor;

        case 'company':
          valA = (a.company || '').toLowerCase();
          valB = (b.company || '').toLowerCase();
          break;

        case 'status':
          valA = a.status;
          valB = b.status;
          break;

        case 'dispatch':
          valA = a.dispatchStatus;
          valB = b.dispatchStatus;
          break;

        case 'payment':
          valA = a.paymentStatus;
          valB = b.paymentStatus;
          break;

        default:
          return 0;
      }

      if (valA < valB) return -1 * factor;
      if (valA > valB) return 1 * factor;
      return 0;
    });
  }, [filteredOrders, sortConfig]);

  // Calculated Metrics for Spreadsheet Status Bar
  const totalDisplayValue = useMemo(() => {
    return sortedOrders.reduce((acc, o) => acc + (o.orderValue || 0), 0);
  }, [sortedOrders]);

  const avgDisplayValue = useMemo(() => {
    if (sortedOrders.length === 0) return 0;
    return Math.round(totalDisplayValue / sortedOrders.length);
  }, [sortedOrders, totalDisplayValue]);

  const selectedValueSum = useMemo(() => {
    return orders
      .filter(o => selectedOrderIds.includes(o.orderId))
      .reduce((acc, o) => acc + (o.orderValue || 0), 0);
  }, [orders, selectedOrderIds]);

  // Selection handlers
  const handleSelectAll = () => {
    const allIds = sortedOrders.map(o => o.orderId);
    const allSelected = allIds.length > 0 && allIds.every(id => selectedOrderIds.includes(id));
    if (allSelected) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(allIds);
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
      : sortedOrders;
    exportOrdersToExcel(exportData, `GovSchool_Orders_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportCSV = () => {
    const exportData = selectedOrderIds.length > 0
      ? orders.filter(o => selectedOrderIds.includes(o.orderId))
      : sortedOrders;
    exportOrdersToCSV(exportData, `GovSchool_Orders_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleClearAllData = async () => {
    const ok = window.confirm('Are you sure you want to CLEAR all past order records? The dashboard will be emptied so you can upload your Excel sheet.');
    if (!ok) return;
    setIsResetting(true);
    try {
      await clearAllOrders(currentUser);
      if (onOrdersUpdated) {
        onOrdersUpdated();
      }
    } catch (err: any) {
      alert('Error clearing orders: ' + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetTo121Sheet = async () => {
    const ok = window.confirm('Reset the dashboard to the 122 orders parsed from the master sheet?');
    if (!ok) return;
    setIsResetting(true);
    try {
      const res = await clearAllPastDataAndResyncWithSheet(currentUser);
      if (onOrdersUpdated) {
        onOrdersUpdated();
      }
      alert(`Loaded ${res.count} orders directly from the sheet!`);
    } catch (err: any) {
      alert('Error syncing sheet: ' + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  // Helper to render sort icon in column header
  const renderSortIndicator = (key: string) => {
    if (sortConfig?.key !== key) {
      return <ArrowUpDown className="w-2.5 h-2.5 text-slate-300 group-hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-amber-600 font-bold" />
    ) : (
      <ArrowDown className="w-3 h-3 text-amber-600 font-bold" />
    );
  };

  return (
    <div className="space-y-2.5 w-full">
      {/* Top Spreadsheet Operations Toolbar */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Universal Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Instant search: School, Contract #, S.No, Partner, Company, Docket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-medium"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 justify-between md:justify-end flex-wrap">
            {/* Quick Metrics Badge */}
            <span className="text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 shrink-0">
              {sortedOrders.length} of {orders.length} Orders
            </span>

            {/* Export Buttons */}
            <div className="inline-flex rounded-lg shadow-2xs border border-slate-300 overflow-hidden text-xs shrink-0">
              <button
                type="button"
                onClick={handleExportExcel}
                className="bg-white hover:bg-slate-50 text-slate-700 font-semibold px-2.5 py-1.5 flex items-center gap-1.5 border-r border-slate-200 transition-colors"
                title="Export currently displayed rows to Excel"
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

            {/* Reset Column Widths */}
            <button
              type="button"
              onClick={resetWidths}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors shrink-0"
              title="Reset column widths to default layout"
            >
              <Columns className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Widths</span>
            </button>

            {canCreateOrders && (
              <>
                {isAdmin && (
                  <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs shrink-0">
                    <button
                      type="button"
                      onClick={handleClearAllData}
                      disabled={isResetting}
                      className="bg-white hover:bg-rose-50 text-rose-700 font-medium px-2.5 py-1.5 flex items-center gap-1 border-r border-slate-200 transition-colors"
                      title="Clear orders to upload a fresh spreadsheet"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Clear</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetTo121Sheet}
                      disabled={isResetting}
                      className="bg-white hover:bg-slate-50 text-slate-700 font-medium px-2.5 py-1.5 flex items-center gap-1 transition-colors"
                      title="Reload initial master sheet (122 orders)"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Sheet (122)</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={onOpenImport}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-300 transition-colors shrink-0 shadow-2xs"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Upload Excel</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenNewOrder}
                  className="inline-flex items-center gap-1 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg shadow-xs transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Order</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Secondary Filter & Spreadsheet Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Financial Year selector */}
            <div className="flex items-center gap-1 text-slate-600">
              <span className="text-[11px] font-medium text-slate-400">FY:</span>
              <select
                value={selectedFY}
                onChange={(e) => setSelectedFY(e.target.value)}
                className="px-2 py-1 rounded border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none"
              >
                <option value="ALL">All FY</option>
                <option value="2026-27">2026-27</option>
                <option value="2025-26">2025-26</option>
                <option value="2024-25">2024-25</option>
              </select>
            </div>

            {/* Quick School selector */}
            <div className="flex items-center gap-1 text-slate-600">
              <span className="text-[11px] font-medium text-slate-400">School:</span>
              <select
                value={colSelectedSchools.length === 1 ? colSelectedSchools[0] : (colSelectedSchools.length > 1 ? 'MULTIPLE' : 'ALL')}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'ALL') setColSelectedSchools([]);
                  else if (val !== 'MULTIPLE') setColSelectedSchools([val]);
                }}
                className="px-2 py-1 rounded border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none max-w-[190px] truncate"
              >
                <option value="ALL">All Schools ({schoolOptions.length})</option>
                {colSelectedSchools.length > 1 && (
                  <option value="MULTIPLE">Selected ({colSelectedSchools.length} schools)</option>
                )}
                {schoolOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} ({opt.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Status selector */}
            <div className="flex items-center gap-1 text-slate-600">
              <span className="text-[11px] font-medium text-slate-400">Status:</span>
              <select
                value={colSelectedStatuses.length === 1 ? colSelectedStatuses[0] : (colSelectedStatuses.length > 1 ? 'MULTIPLE' : 'ALL')}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'ALL') setColSelectedStatuses([]);
                  else if (val !== 'MULTIPLE') setColSelectedStatuses([val]);
                }}
                className="px-2 py-1 rounded border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                {colSelectedStatuses.length > 1 && (
                  <option value="MULTIPLE">Selected ({colSelectedStatuses.length})</option>
                )}
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} ({opt.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Overdue quick toggles */}
            <button
              type="button"
              onClick={() => setFilterOverdueDelivery(!filterOverdueDelivery)}
              className={`px-2 py-1 rounded border transition-colors flex items-center gap-1 text-xs ${
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
              className={`px-2 py-1 rounded border transition-colors flex items-center gap-1 text-xs ${
                filterOverduePayment
                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <AlertCircle className="w-3 h-3 text-amber-600" />
              <span>Overdue Payment</span>
            </button>
          </div>

          {/* Clear all active filters indicator */}
          {hasAnyFilterActive && (
            <button
              type="button"
              onClick={handleResetAllFilters}
              className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear all filters ({[
                searchQuery ? 'Search' : null,
                isContractFiltered ? 'Contract' : null,
                isSchoolFiltered ? 'School' : null,
                isCategoryFiltered ? 'Category' : null,
                isAgentFiltered ? 'Partner' : null,
                isValueFiltered ? 'Value' : null,
                isCompanyFiltered ? 'Company' : null,
                isStatusFiltered ? 'Status' : null,
                isDispatchFiltered ? 'Dispatch' : null,
                isPaymentFiltered ? 'Payment' : null,
                filterOverdueDelivery ? 'Overdue Delivery' : null,
                filterOverduePayment ? 'Overdue Payment' : null,
                selectedFY !== 'ALL' ? 'FY' : null
              ].filter(Boolean).length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Batch Action Floating Bar if items selected */}
      {selectedOrderIds.length > 0 && !isAgent && (
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150 shadow-lg border border-slate-800">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-amber-400 whitespace-nowrap">
              {selectedOrderIds.length} {selectedOrderIds.length === 1 ? 'Order' : 'Orders'} Selected
            </span>

            {/* Bulk Change Partner Control */}
            {canManageOrders && (
              <>
                <span className="text-slate-600 hidden sm:inline">|</span>
                <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700">
                  <select
                    value={bulkSelectedAgentId}
                    onChange={(e) => setBulkSelectedAgentId(e.target.value)}
                    className="bg-slate-900 text-white text-xs px-2 py-1 rounded-md border border-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                    disabled={isApplyingBulkAgent}
                    title="Select Partner for Bulk Reassignment"
                  >
                    <option value="">Change Partner...</option>
                    <option value="AGT-DIRECT">Direct</option>
                    {agentsList.filter(agt => agt.agentId !== 'AGT-DIRECT').map(agt => (
                      <option key={agt.agentId} value={agt.agentId}>
                        {agt.name} ({agt.agentCode})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleApplyBulkAgent}
                    disabled={!bulkSelectedAgentId || isApplyingBulkAgent}
                    className={`font-bold px-3 py-1 rounded-md transition-colors flex items-center gap-1 text-xs ${
                      bulkSelectedAgentId && !isApplyingBulkAgent
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-xs'
                        : 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'
                    }`}
                  >
                    {isApplyingBulkAgent ? (
                      <>
                        <span className="w-3 h-3 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                        <span>Applying...</span>
                      </>
                    ) : (
                      <span>Apply</span>
                    )}
                  </button>
                </div>
              </>
            )}

            <span className="text-slate-600 hidden sm:inline">|</span>

            <button
              type="button"
              onClick={() => setBatchModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-2.5 py-1 rounded-lg transition-colors border border-slate-700 cursor-pointer"
            >
              Update Status
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-2.5 py-1 rounded-lg transition-colors border border-slate-700 cursor-pointer"
            >
              Export Selected
            </button>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {bulkAgentMessage && (
              <span className="text-emerald-400 font-medium text-xs animate-in fade-in">
                {bulkAgentMessage}
              </span>
            )}
            <button
              type="button"
              onClick={() => setSelectedOrderIds([])}
              className="text-slate-400 hover:text-white font-medium cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Main Continuous Spreadsheet Viewport with Sticky Header & Resizable Columns */}
      <div className="relative border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-230px)] min-h-[400px]">
          <table className="w-full text-left text-xs border-collapse table-fixed">
            {/* Sticky Header Row */}
            <thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-xs border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px] select-none shadow-2xs">
              <tr>
                {/* 1. Select Checkbox Column */}
                {!isAgent && (
                  <th
                    style={{ width: widths.select, minWidth: widths.select }}
                    className="px-2 py-2.5 text-center relative border-r border-slate-200/60 bg-slate-100"
                  >
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-slate-500 hover:text-slate-800 flex items-center justify-center mx-auto"
                      title={sortedOrders.length > 0 && sortedOrders.every(o => selectedOrderIds.includes(o.orderId)) ? "Deselect all" : "Select all displayed orders"}
                    >
                      {sortedOrders.length > 0 && sortedOrders.every(o => selectedOrderIds.includes(o.orderId)) ? (
                        <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  </th>
                )}

                {/* 2. SL. NO. Column (Independent) */}
                <th
                  style={{ width: widths.serialNumber, minWidth: widths.serialNumber }}
                  className="px-2 py-2.5 text-center relative border-r border-slate-200/60 bg-slate-100 group"
                >
                  <div
                    onClick={() => handleSort('serialNumber')}
                    className="flex items-center justify-center gap-1 cursor-pointer hover:text-slate-950"
                    title="Sort by Serial Number"
                  >
                    <span>Sl. No.</span>
                    {renderSortIndicator('serialNumber')}
                  </div>
                  {/* Column Resize Handle */}
                  <div
                    onMouseDown={(e) => startResize('serialNumber', e)}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-400 z-10 transition-colors"
                    title="Drag to resize column"
                  />
                </th>

                {/* 3. S.NO. / CONTRACT Column */}
                <th
                  style={{ width: widths.contract, minWidth: widths.contract }}
                  className="px-2.5 py-2.5 relative border-r border-slate-200/60 bg-slate-100 group"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div
                      onClick={() => handleSort('contract')}
                      className="flex items-center gap-1 cursor-pointer hover:text-slate-950 truncate"
                      title="Sort by Contract / GeM Order Number"
                    >
                      <span>S.No. / Contract</span>
                      {renderSortIndicator('contract')}
                    </div>
                    <ColumnFilterPopover
                      columnId="contract"
                      title="Contract / Order"
                      filterType="text"
                      isActive={isContractFiltered}
                      isOpen={openPopoverId === 'contract'}
                      onOpenToggle={() => setOpenPopoverId(prev => prev === 'contract' ? null : 'contract')}
                      onClose={() => setOpenPopoverId(null)}
                      textValue={colContractSearch}
                      onTextChange={setColContractSearch}
                      sortDirection={sortConfig?.key === 'contract' ? sortConfig.direction : null}
                      onSortChange={(dir) => {
                        if (!dir) setSortConfig(null);
                        else setSortConfig({ key: 'contract', direction: dir });
                      }}
                      onClearFilter={() => setColContractSearch('')}
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResize('contract', e)}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-400 z-10 transition-colors"
                    title="Drag to resize column"
                  />
                </th>

                {/* 4. SCHOOL NAME Column (Wrapped, Fully Readable) */}
                <th
                  style={{ width: widths.schoolName, minWidth: widths.schoolName }}
                  className="px-3 py-2.5 relative border-r border-slate-200/60 bg-slate-100 group"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div
                      onClick={() => handleSort('schoolName')}
                      className="flex items-center gap-1 cursor-pointer hover:text-slate-950"
                      title="Sort by School Name"
                    >
                      <span>School Name</span>
                      {renderSortIndicator('schoolName')}
                    </div>
                    <ColumnFilterPopover
                      columnId="schoolName"
                      title="School Name"
                      filterType="multi-select"
                      isActive={isSchoolFiltered}
                      isOpen={openPopoverId === 'schoolName'}
                      onOpenToggle={() => setOpenPopoverId(prev => prev === 'schoolName' ? null : 'schoolName')}
                      onClose={() => setOpenPopoverId(null)}
                      options={schoolOptions}
                      selectedValues={colSelectedSchools}
                      onMultiSelectChange={setColSelectedSchools}
                      sortDirection={sortConfig?.key === 'schoolName' ? sortConfig.direction : null}
                      onSortChange={(dir) => {
                        if (!dir) setSortConfig(null);
                        else setSortConfig({ key: 'schoolName', direction: dir });
                      }}
                      onClearFilter={() => setColSelectedSchools([])}
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResize('schoolName', e)}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-400 z-10 transition-colors"
                    title="Drag to resize column"
                  />
                </th>

                {/* 5. CATEGORY Column */}
                <th
                  style={{ width: widths.category, minWidth: widths.category }}
                  className="px-2.5 py-2.5 relative border-r border-slate-200/60 bg-slate-100 group"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div
                      onClick={() => handleSort('category')}
                      className="flex items-center gap-1 cursor-pointer hover:text-slate-950 truncate"
                      title="Sort by Category"
                    >
                      <span>Category</span>
                      {renderSortIndicator('category')}
                    </div>
                    <ColumnFilterPopover
                      columnId="category"
                      title="Category"
                      filterType="multi-select"
                      isActive={isCategoryFiltered}
                      isOpen={openPopoverId === 'category'}
                      onOpenToggle={() => setOpenPopoverId(prev => prev === 'category' ? null : 'category')}
                      onClose={() => setOpenPopoverId(null)}
                      options={categoryOptions}
                      selectedValues={colSelectedCategories}
                      onMultiSelectChange={setColSelectedCategories}
                      sortDirection={sortConfig?.key === 'category' ? sortConfig.direction : null}
                      onSortChange={(dir) => {
                        if (!dir) setSortConfig(null);
                        else setSortConfig({ key: 'category', direction: dir });
                      }}
                      onClearFilter={() => setColSelectedCategories([])}
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResize('category', e)}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-400 z-10 transition-colors"
                    title="Drag to resize column"
                  />
                </th>

                {/* 6. AGENT Column (if not agent role) */}
                {!isAgent && (
                  <th
                    style={{ width: widths.agent, minWidth: widths.agent }}
                    className="px-2.5 py-2.5 relative border-r border-slate-200/60 bg-slate-100 group"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div
                        onClick={() => handleSort('agent')}
                        className="flex items-center gap-1 cursor-pointer hover:text-slate-950 truncate"
                        title="Sort by Regional Partner"
                      >
                        <span>Partner</span>
                        {renderSortIndicator('agent')}
                      </div>
                      <ColumnFilterPopover
                        columnId="agent"
                        title="Regional Partner"
                        filterType="multi-select"
                        isActive={isAgentFiltered}
                        isOpen={openPopoverId === 'agent'}
                        onOpenToggle={() => setOpenPopoverId(prev => prev === 'agent' ? null : 'agent')}
                        onClose={() => setOpenPopoverId(null)}
                        options={agentOptions}
                        selectedValues={colSelectedAgents}
                        onMultiSelectChange={setColSelectedAgents}
                        sortDirection={sortConfig?.key === 'agent' ? sortConfig.direction : null}
                        onSortChange={(dir) => {
                          if (!dir) setSortConfig(null);
                          else setSortConfig({ key: 'agent', direction: dir });
                        }}
                        onClearFilter={() => setColSelectedAgents([])}
                      />
                    </div>
                    <div
                      onMouseDown={(e) => startResize('agent', e)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-400 z-10 transition-colors"
                      title="Drag to resize column"
                    />
                  </th>
                )}

                {/* 7. VALUE (₹) Column (Right-Aligned, GST-Inclusive) */}
                <th
                  style={{ width: widths.orderValue, minWidth: widths.orderValue }}
                  className="px-2.5 py-2.5 relative border-r border-slate-200/60 bg-slate-100 group text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <div
                      onClick={() => handleSort('orderValue')}
                      className="flex items-center gap-1 cursor-pointer hover:text-slate-950 font-bold"
                      title="Sort by Order Value"
                    >
                      <span>Value (₹)</span>
                      {renderSortIndicator('orderValue')}
                    </div>
                    <ColumnFilterPopover
                      columnId="orderValue"
                      title="Order Value (₹)"
                      filterType="numeric"
                      isActive={isValueFiltered}
                      isOpen={openPopoverId === 'orderValue'}
                      onOpenToggle={() => setOpenPopoverId(prev => prev === 'orderValue' ? null : 'orderValue')}
                      onClose={() => setOpenPopoverId(null)}
                      numericValue={colValueFilter}
                      onNumericChange={setColValueFilter}
                      sortDirection={sortConfig?.key === 'orderValue' ? sortConfig.direction : null}
                      onSortChange={(dir) => {
                        if (!dir) setSortConfig(null);
                        else setSortConfig({ key: 'orderValue', direction: dir });
                      }}
                      onClearFilter={() => setColValueFilter({ mode: 'ANY' })}
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResize('orderValue', e)}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-400 z-10 transition-colors"
                    title="Drag to resize column"
                  />
                </th>

                {/* 8. COMPANY Column */}
                <th
                  style={{ width: widths.company, minWidth: widths.company }}
                  className="px-2.5 py-2.5 relative border-r border-slate-200/60 bg-slate-100 group"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div
                      onClick={() => handleSort('company')}
                      className="flex items-center gap-1 cursor-pointer hover:text-slate-950 truncate"
                      title="Sort by Billing Company"
                    >
                      <span>Company</span>
                      {renderSortIndicator('company')}
                    </div>
                    <ColumnFilterPopover
                      columnId="company"
                      title="Company"
                      filterType="multi-select"
                      isActive={isCompanyFiltered}
                      isOpen={openPopoverId === 'company'}
                      onOpenToggle={() => setOpenPopoverId(prev => prev === 'company' ? null : 'company')}
                      onClose={() => setOpenPopoverId(null)}
                      options={companyOptions}
                      selectedValues={colSelectedCompanies}
                      onMultiSelectChange={setColSelectedCompanies}
                      sortDirection={sortConfig?.key === 'company' ? sortConfig.direction : null}
                      onSortChange={(dir) => {
                        if (!dir) setSortConfig(null);
                        else setSortConfig({ key: 'company', direction: dir });
                      }}
                      onClearFilter={() => setColSelectedCompanies([])}
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResize('company', e)}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-400 z-10 transition-colors"
                    title="Drag to resize column"
                  />
                </th>

                {/* 9. STATUS Column */}
                <th
                  style={{ width: widths.status, minWidth: widths.status }}
                  className="px-2.5 py-2.5 relative border-r border-slate-200/60 bg-slate-100 group"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 cursor-pointer hover:text-slate-950 truncate"
                      title="Sort by Status"
                    >
                      <span>Status</span>
                      {renderSortIndicator('status')}
                    </div>
                    <ColumnFilterPopover
                      columnId="status"
                      title="Order Status"
                      filterType="multi-select"
                      isActive={isStatusFiltered}
                      isOpen={openPopoverId === 'status'}
                      onOpenToggle={() => setOpenPopoverId(prev => prev === 'status' ? null : 'status')}
                      onClose={() => setOpenPopoverId(null)}
                      options={statusOptions}
                      selectedValues={colSelectedStatuses}
                      onMultiSelectChange={setColSelectedStatuses}
                      sortDirection={sortConfig?.key === 'status' ? sortConfig.direction : null}
                      onSortChange={(dir) => {
                        if (!dir) setSortConfig(null);
                        else setSortConfig({ key: 'status', direction: dir });
                      }}
                      onClearFilter={() => setColSelectedStatuses([])}
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResize('status', e)}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-400 z-10 transition-colors"
                    title="Drag to resize column"
                  />
                </th>

                {/* 10. DISPATCH & COURIER Column */}
                <th
                  style={{ width: widths.dispatch, minWidth: widths.dispatch }}
                  className="px-2.5 py-2.5 relative border-r border-slate-200/60 bg-slate-100 group"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div
                      onClick={() => handleSort('dispatch')}
                      className="flex items-center gap-1 cursor-pointer hover:text-slate-950 truncate"
                      title="Sort by Dispatch Status"
                    >
                      <span>Dispatch &amp; Courier</span>
                      {renderSortIndicator('dispatch')}
                    </div>
                    <ColumnFilterPopover
                      columnId="dispatch"
                      title="Dispatch"
                      filterType="multi-select"
                      isActive={isDispatchFiltered}
                      isOpen={openPopoverId === 'dispatch'}
                      onOpenToggle={() => setOpenPopoverId(prev => prev === 'dispatch' ? null : 'dispatch')}
                      onClose={() => setOpenPopoverId(null)}
                      options={dispatchOptions}
                      selectedValues={colSelectedDispatchStatuses}
                      onMultiSelectChange={setColSelectedDispatchStatuses}
                      sortDirection={sortConfig?.key === 'dispatch' ? sortConfig.direction : null}
                      onSortChange={(dir) => {
                        if (!dir) setSortConfig(null);
                        else setSortConfig({ key: 'dispatch', direction: dir });
                      }}
                      onClearFilter={() => setColSelectedDispatchStatuses([])}
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResize('dispatch', e)}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-400 z-10 transition-colors"
                    title="Drag to resize column"
                  />
                </th>

                {/* 11. PAYMENT Column */}
                <th
                  style={{ width: widths.payment, minWidth: widths.payment }}
                  className="px-2.5 py-2.5 relative border-r border-slate-200/60 bg-slate-100 group"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div
                      onClick={() => handleSort('payment')}
                      className="flex items-center gap-1 cursor-pointer hover:text-slate-950 truncate"
                      title="Sort by Payment Status"
                    >
                      <span>Payment</span>
                      {renderSortIndicator('payment')}
                    </div>
                    <ColumnFilterPopover
                      columnId="payment"
                      title="Payment"
                      filterType="multi-select"
                      isActive={isPaymentFiltered}
                      isOpen={openPopoverId === 'payment'}
                      onOpenToggle={() => setOpenPopoverId(prev => prev === 'payment' ? null : 'payment')}
                      onClose={() => setOpenPopoverId(null)}
                      options={paymentOptions}
                      selectedValues={colSelectedPaymentStatuses}
                      onMultiSelectChange={setColSelectedPaymentStatuses}
                      sortDirection={sortConfig?.key === 'payment' ? sortConfig.direction : null}
                      onSortChange={(dir) => {
                        if (!dir) setSortConfig(null);
                        else setSortConfig({ key: 'payment', direction: dir });
                      }}
                      onClearFilter={() => setColSelectedPaymentStatuses([])}
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResize('payment', e)}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-400 z-10 transition-colors"
                    title="Drag to resize column"
                  />
                </th>

                {/* 12. ACTION Column */}
                <th
                  style={{ width: widths.action, minWidth: widths.action }}
                  className="px-2 py-2.5 text-right w-14 bg-slate-100"
                >
                  Action
                </th>
              </tr>
            </thead>

            {/* Continuous Spreadsheet Rows (All Orders, Zero Pagination Limit) */}
            <tbody className="divide-y divide-slate-100">
              {sortedOrders.length === 0 ? (
                <tr>
                  <td colSpan={isAgent ? 11 : 12} className="py-16 text-center text-slate-500 bg-white">
                    <div className="max-w-md mx-auto space-y-2.5">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <Search className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-slate-800 text-sm">No orders match your filter criteria</div>
                      <p className="text-xs text-slate-500">
                        Try adjusting or clearing your column filters to display matching orders from the registry.
                      </p>
                      {hasAnyFilterActive && (
                        <button
                          type="button"
                          onClick={handleResetAllFilters}
                          className="mt-3 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition-colors"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedOrders.map((order, idx) => {
                  const isSelected = selectedOrderIds.includes(order.orderId);
                  // Always number by position in the current (already-sorted, non-deleted)
                  // list rather than the order's stored serialNumber field - that field is
                  // only used to preserve creation order for sorting; using it for display
                  // would leave a gap (e.g. ...120, 121, 123...) whenever an order in between
                  // gets deleted. Position-based numbering stays gap-free automatically.
                  const serialNum = idx + 1;
                  const contractId = order.contractNumber || order.purchaseOrderNumber || order.orderNumber;
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
                      className={`hover:bg-amber-50/40 cursor-pointer transition-colors border-b border-slate-100 ${
                        isSelected ? 'bg-amber-50/60' : idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                      }`}
                    >
                      {/* Checkbox */}
                      {!isAgent && (
                        <td
                          style={{ width: widths.select }}
                          className="px-2 py-2 text-center align-middle border-r border-slate-100"
                          onClick={(e) => handleToggleSelectOrder(order.orderId, e)}
                        >
                          <button type="button" className="text-slate-400 hover:text-slate-700 flex items-center justify-center mx-auto">
                            {isSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-300" />
                            )}
                          </button>
                        </td>
                      )}

                      {/* SL. NO. (Distinct, Independent Sequential Field) */}
                      <td
                        style={{ width: widths.serialNumber }}
                        className="px-2 py-2 text-center align-middle border-r border-slate-100 whitespace-nowrap"
                      >
                        <span
                          className="inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-md bg-slate-100 text-slate-900 font-bold text-xs font-mono border border-slate-200/90 shadow-2xs"
                          title={`Serial No. ${serialNum}`}
                        >
                          {serialNum}
                        </span>
                      </td>

                      {/* S.NO. / CONTRACT */}
                      <td
                        style={{ width: widths.contract }}
                        className="px-2.5 py-2 align-middle border-r border-slate-100"
                      >
                        <div className="font-mono font-bold text-slate-900 text-xs break-all leading-snug" title={contractId}>
                          {contractId}
                        </div>
                        <div className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                          {order.financialYear || '2026-27'}
                        </div>
                      </td>

                      {/* SCHOOL NAME (Multiline Wrapping, Full Visibility, No Truncation) */}
                      <td
                        style={{ width: widths.schoolName }}
                        className="px-3 py-2 align-middle border-r border-slate-100"
                      >
                        <div
                          className="font-semibold text-slate-900 text-xs whitespace-normal break-words leading-relaxed"
                          title={order.schoolName}
                        >
                          {order.schoolName}
                        </div>
                        {order.district && order.state && (
                          <div className="text-[10.5px] text-slate-500 mt-0.5 whitespace-normal break-words leading-tight">
                            {order.district}, {order.state}
                          </div>
                        )}
                      </td>

                      {/* CATEGORY */}
                      <td
                        style={{ width: widths.category }}
                        className="px-2.5 py-2 align-middle border-r border-slate-100"
                      >
                        <div className="text-slate-800 text-xs whitespace-normal break-words leading-tight font-medium" title={order.category}>
                          {order.category}
                        </div>
                      </td>

                      {/* AGENT */}
                      {!isAgent && (
                        <td
                          style={{ width: widths.agent }}
                          className="px-2.5 py-2 align-middle border-r border-slate-100"
                        >
                          <div className="font-semibold text-slate-900 text-xs whitespace-normal break-words leading-tight" title={order.agentName}>
                            {order.agentName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{order.agentCode}</div>
                        </td>
                      )}

                      {/* VALUE (₹) (Right-Aligned, GST-Inclusive Final Figure) */}
                      <td
                        style={{ width: widths.orderValue }}
                        className="px-3 py-2 text-right font-mono whitespace-nowrap align-middle border-r border-slate-100"
                      >
                        <div className="font-bold text-slate-950 text-xs">
                          <CurrencyFormatter amount={order.orderValue} />
                        </div>
                      </td>

                      {/* COMPANY */}
                      <td
                        style={{ width: widths.company }}
                        className="px-2.5 py-2 align-middle border-r border-slate-100 whitespace-nowrap"
                      >
                        <span className="font-semibold text-slate-700 text-xs block">
                          {order.company || 'FIPL'}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td
                        style={{ width: widths.status }}
                        className="px-2.5 py-2 align-middle border-r border-slate-100 whitespace-nowrap"
                      >
                        <StatusBadge status={order.status} type="order" compact />
                      </td>

                      {/* DISPATCH & COURIER */}
                      <td
                        style={{ width: widths.dispatch }}
                        className="px-2.5 py-2 align-middle border-r border-slate-100 whitespace-nowrap"
                      >
                        <div className="flex items-center gap-1.5">
                          <TrackingLink courierName={order.courierName} docketNumber={order.docketNumber} compact />
                          {isDeliveryOverdue && (
                            <span className="text-[10px] text-rose-600 font-bold flex items-center gap-0.5 shrink-0" title="Delivery Overdue">
                              <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                              <span>Overdue</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* PAYMENT */}
                      <td
                        style={{ width: widths.payment }}
                        className="px-2.5 py-2 align-middle border-r border-slate-100 whitespace-nowrap"
                      >
                        <div className="leading-tight">
                          <StatusBadge status={order.paymentStatus} type="payment" compact />
                          {order.paymentStatus !== 'PAID' && (
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                              Due: <CurrencyFormatter amount={order.amountPending ?? order.orderValue} />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* ACTION */}
                      <td
                        style={{ width: widths.action }}
                        className="px-2 py-2 text-right whitespace-nowrap align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
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
                                if (confirm(`Are you sure you want to delete order ${contractId}?`)) {
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

        {/* Excel / Google Sheets Spreadsheet Footer Bar */}
        <div className="px-4 py-2.5 bg-slate-50/95 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-600 select-none">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <span>Showing:</span>
              <span className="font-mono text-slate-950 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                {sortedOrders.length}
              </span>
              <span>of {orders.length} total orders</span>
            </div>

            {hasAnyFilterActive && (
              <span className="text-amber-800 text-[11px] font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Filtered view active
              </span>
            )}
          </div>

          {/* Real-time Financial Calculations on Displayed Rows */}
          <div className="flex items-center gap-3 sm:gap-5 flex-wrap font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 uppercase font-sans font-semibold text-[10.5px]">Total Value:</span>
              <span className="font-bold text-slate-900">
                ₹{totalDisplayValue.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 uppercase font-sans font-semibold text-[10.5px]">Avg Order:</span>
              <span className="font-semibold text-slate-700">
                ₹{avgDisplayValue.toLocaleString('en-IN')}
              </span>
            </div>

            {selectedOrderIds.length > 0 && (
              <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <span className="font-sans font-semibold text-[10.5px]">Selected ({selectedOrderIds.length}):</span>
                <span className="font-bold">₹{selectedValueSum.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Batch Status Update Modal */}
      {batchModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Batch Update Status</h3>
              <button
                type="button"
                onClick={() => setBatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Update status for <span className="font-bold text-slate-900">{selectedOrderIds.length}</span> selected orders at once.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Order Status</label>
              <select
                value={batchTargetStatus}
                onChange={(e) => setBatchTargetStatus(e.target.value as OrderStatus)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
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
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
