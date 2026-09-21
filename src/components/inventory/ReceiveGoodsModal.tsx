import React, { useState } from 'react';
import { PurchaseOrder, UserProfile } from '../../types';
import { receiveGoodsForPurchaseOrder } from '../../services/dataService';
import { X, PackageCheck, AlertCircle, Calendar, FileText, CheckCircle2 } from 'lucide-react';

interface Props {
  purchaseOrder: PurchaseOrder;
  currentUser?: UserProfile;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReceiveGoodsModal: React.FC<Props> = ({
  purchaseOrder,
  currentUser,
  onClose,
  onSuccess
}) => {
  const [grnNumber, setGrnNumber] = useState<string>(
    `GRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [receivingDate, setReceivingDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [receipts, setReceipts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    purchaseOrder.items.forEach(it => {
      const remaining = Math.max(0, (it.quantity || 0) - (it.receivedQuantity || 0));
      initial[it.materialId] = remaining;
    });
    return initial;
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQtyChange = (materialId: string, val: number, maxAllowed: number) => {
    setReceipts(prev => ({
      ...prev,
      [materialId]: Math.max(0, Math.min(val, maxAllowed))
    }));
  };

  const handleReceiveAll = () => {
    const full: Record<string, number> = {};
    purchaseOrder.items.forEach(it => {
      const remaining = Math.max(0, (it.quantity || 0) - (it.receivedQuantity || 0));
      full[it.materialId] = remaining;
    });
    setReceipts(full);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const receiptList: { materialId: string; receivedQty: number }[] = Object.entries(receipts)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([materialId, qty]) => ({ materialId, receivedQty: Number(qty) }));

    if (receiptList.length === 0) {
      setError('Please enter a received quantity of at least 1 for one or more items.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await receiveGoodsForPurchaseOrder({
        poId: purchaseOrder.poId,
        receipts: receiptList,
        grnNumber: grnNumber.trim(),
        invoiceNumber: invoiceNumber.trim(),
        notes: notes.trim(),
        user: currentUser
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Receive goods error:', err);
      setError(err.message || 'Failed to record goods receipt. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Inward Goods Receipt (GRN)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                PO: <span className="font-semibold text-slate-700 dark:text-slate-200">{purchaseOrder.poNumber}</span> &bull; Vendor: <span className="font-semibold text-slate-700 dark:text-slate-200">{purchaseOrder.vendorName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Inward Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                GRN Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={grnNumber}
                onChange={e => setGrnNumber(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Vendor Challan / Invoice #
              </label>
              <input
                type="text"
                placeholder="e.g. INV-9912 / DC-331"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Receipt Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={receivingDate}
                onChange={e => setReceivingDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Items to Receive Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Items Inward Verification
              </label>
              <button
                type="button"
                onClick={handleReceiveAll}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Fill All Pending</span>
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3">Material & SKU</th>
                    <th className="py-2.5 px-3 text-center">Ordered</th>
                    <th className="py-2.5 px-3 text-center">Prev Rcvd</th>
                    <th className="py-2.5 px-3 text-center">Pending</th>
                    <th className="py-2.5 px-3 text-right">Receive Now</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {purchaseOrder.items.map(it => {
                    const ordered = it.quantity || 0;
                    const prevRcvd = it.receivedQuantity || 0;
                    const remaining = Math.max(0, ordered - prevRcvd);
                    const currentVal = receipts[it.materialId] ?? remaining;

                    return (
                      <tr key={it.itemId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {it.materialName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {it.sku || it.materialId} &bull; {it.unit}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium text-slate-700 dark:text-slate-300">
                          {ordered}
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium text-blue-600 dark:text-blue-400">
                          {prevRcvd}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-amber-600 dark:text-amber-400">
                          {remaining}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            max={remaining}
                            value={currentVal}
                            onChange={e =>
                              handleQtyChange(
                                it.materialId,
                                parseInt(e.target.value) || 0,
                                remaining
                              )
                            }
                            disabled={remaining === 0}
                            className="w-20 px-2.5 py-1 text-xs text-right bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 italic">
              Entering received quantities here will directly increment physical stock and record inward ledger movements.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Receipt Inspection Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Package seal verified, items physically tested and accepted into central store..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Processing Inward...' : 'Confirm Goods Receipt (GRN)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
