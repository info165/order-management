import React, { useState } from 'react';
import { StockMovement, MovementType, MovementReason, UserProfile } from '../../types';
import { deleteStockMovement, clearAllStockMovements } from '../../services/dataService';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Filter,
  Calendar,
  Layers,
  FileSpreadsheet,
  FileText,
  User,
  SlidersHorizontal,
  Trash2,
  RotateCcw
} from 'lucide-react';

interface Props {
  movements: StockMovement[];
  currentUser?: UserProfile;
  onRefresh?: () => void;
}

export const StockMovementLedger: React.FC<Props> = ({ movements, currentUser, onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | MovementType>('ALL');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');

  // Deletion modals state
  const [deleteTarget, setDeleteTarget] = useState<StockMovement | null>(null);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteStockMovement(deleteTarget.movementId, currentUser);
      setDeleteTarget(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete stock movement record.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmClearAll = async () => {
    setIsDeleting(true);
    try {
      await clearAllStockMovements(currentUser);
      setIsClearAllOpen(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to clear stock movement ledger.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredMovements = movements.filter(m => {
    const q = searchQuery.toLowerCase();
    const movType = m.movementType || m.type || 'IN';
    const movReason = m.reason || m.movementReason || 'STOCK_ADJUSTMENT';
    const movUser = m.userName || m.user || '';

    const matchesSearch =
      (m.materialName || '').toLowerCase().includes(q) ||
      (m.sku || '').toLowerCase().includes(q) ||
      (m.reference || '').toLowerCase().includes(q) ||
      (m.notes || '').toLowerCase().includes(q) ||
      movUser.toLowerCase().includes(q);

    const matchesType = typeFilter === 'ALL' || movType === typeFilter;
    const matchesReason = reasonFilter === 'ALL' || movReason === reasonFilter;

    return matchesSearch && matchesType && matchesReason;
  });

  const getReasonLabel = (reason?: MovementReason | string) => {
    if (!reason) return 'Stock Adjustment';
    switch (reason) {
      case 'OPENING_STOCK':
        return 'Opening Stock';
      case 'PURCHASE_RECEIVED':
        return 'Vendor Purchase Received';
      case 'SALES_ORDER_DISPATCHED':
        return 'Sales Order Dispatched';
      case 'DAMAGED_SCRAP':
        return 'Damaged / Scrap';
      case 'STOCK_ADJUSTMENT':
        return 'Physical Stock Count';
      case 'RETURN_FROM_CUSTOMER':
        return 'Customer Return';
      default:
        return typeof reason === 'string' ? reason.replace(/_/g, ' ') : 'Stock Adjustment';
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Material Name', 'SKU', 'Type', 'Quantity', 'Reason', 'Reference', 'User', 'Notes'];
    const rows = filteredMovements.map(m => {
      const movTime = m.timestamp || m.date || new Date().toISOString();
      const movType = m.movementType || m.type || 'IN';
      const movReason = m.reason || m.movementReason || 'STOCK_ADJUSTMENT';
      const movUser = m.userName || m.user || '';
      return [
        new Date(movTime).toLocaleString(),
        `"${(m.materialName || '').replace(/"/g, '""')}"`,
        m.sku || '—',
        movType,
        m.quantity,
        movReason,
        `"${(m.reference || '').replace(/"/g, '""')}"`,
        `"${movUser.replace(/"/g, '""')}"`,
        `"${(m.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Funscholar_Stock_Movement_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-amber-500" />
            <span>Stock Movement Audit Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete, immutable audit log of all inbound vendor receipts, dispatch deductions, and physical adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {movements.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClearAllOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-800 transition-all cursor-pointer shrink-0"
              title="Clear all stock movement records"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Ledger</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 shadow-xs transition-all cursor-pointer shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export Ledger to CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search material, SKU, ref, user..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Reason Filter */}
          <select
            value={reasonFilter}
            onChange={e => setReasonFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">All Movement Reasons</option>
            <option value="PURCHASE_RECEIVED">Vendor Purchase Received</option>
            <option value="SALES_ORDER_DISPATCHED">Sales Order Dispatched</option>
            <option value="STOCK_ADJUSTMENT">Stock Adjustment / Count</option>
            <option value="OPENING_STOCK">Opening Stock</option>
            <option value="DAMAGED_SCRAP">Damaged / Scrap</option>
            <option value="RETURN_FROM_CUSTOMER">Customer Return</option>
          </select>

          {/* Type Filter Buttons */}
          <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                typeFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All ({movements.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('IN')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                typeFilter === 'IN'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Inward</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('OUT')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                typeFilter === 'OUT'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Outward</span>
            </button>
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Material & SKU</th>
                <th className="py-3 px-4 text-center">Movement</th>
                <th className="py-3 px-4 text-center">Quantity</th>
                <th className="py-3 px-4">Reason & Context</th>
                <th className="py-3 px-4">Reference Document</th>
                <th className="py-3 px-4">Logged By</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No stock movement records found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredMovements.map(m => {
                  const isIn = (m.movementType || m.type) === 'IN';
                  const movTime = m.timestamp || m.date || new Date().toISOString();
                  const dateStr = new Date(movTime).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });
                  const timeStr = new Date(movTime).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr
                      key={m.movementId}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {dateStr}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{timeStr}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {m.materialName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">{m.sku}</div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            isIn
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isIn ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          <span>{m.movementType || m.type || 'IN'}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-black text-sm ${
                            isIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isIn ? '+' : '-'}{Math.abs(m.quantity)}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {getReasonLabel(m.reason || m.movementReason)}
                        </div>
                        {m.notes && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {m.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {m.reference || '—'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{m.userName || m.user || 'System Auto'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(m)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Stock Entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Single Entry Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Stock Ledger Entry"
        recordName={deleteTarget ? `${deleteTarget.materialName} (${deleteTarget.movementType || deleteTarget.type}: ${deleteTarget.quantity})` : undefined}
        recordType="Stock Entry"
        warningDetails="Deleting this stock audit entry will permanently remove it from the ledger history. Live Sales Orders and Order Registry entries remain untouched."
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Clear All Ledger Entries Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isClearAllOpen}
        title="Clear Entire Stock Movement Ledger"
        recordName={`All ${movements.length} Stock Ledger Entries`}
        recordType="Ledger Records"
        warningDetails="Are you sure you want to delete ALL inventory stock movement records? All material definitions, catalogue BOMs, and Sales Orders will remain 100% intact."
        confirmText="Yes, Clear All"
        isDeleting={isDeleting}
        onConfirm={handleConfirmClearAll}
        onCancel={() => setIsClearAllOpen(false)}
      />
    </div>
  );
};
