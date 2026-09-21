import React, { useState } from 'react';
import { Material, MovementReason, UserProfile } from '../../types';
import { adjustMaterialStock } from '../../services/dataService';
import { X, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  material: Material;
  currentUser?: UserProfile;
  onClose: () => void;
  onSuccess: () => void;
}

export const StockAdjustmentModal: React.FC<Props> = ({
  material,
  currentUser,
  onClose,
  onSuccess
}) => {
  const [adjustmentType, setAdjustmentType] = useState<'ADD' | 'SUBTRACT'>('ADD');
  const [quantity, setQuantity] = useState<number>(10);
  const [reason, setReason] = useState<MovementReason>('STOCK_ADJUSTMENT');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const delta = adjustmentType === 'ADD' ? Math.abs(quantity) : -Math.abs(quantity);
  const projectedStock = Math.max(0, material.currentStock + delta);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('Please enter a valid quantity greater than 0.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await adjustMaterialStock({
        materialId: material.materialId,
        quantityChange: delta,
        reason,
        reference: reference.trim() || 'MANUAL-ADJUSTMENT',
        notes: notes.trim(),
        user: currentUser
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Stock adjustment error:', err);
      setError(err.message || 'Failed to adjust stock. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Adjust Stock Level</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {material.name} ({material.sku})
            </p>
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

          {/* Current vs Projected Stock Preview */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Current Stock
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {material.currentStock}{' '}
                <span className="text-xs font-normal text-slate-500">{material.unit}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-400">
              <ArrowRight className="w-5 h-5" />
            </div>

            <div className="text-right">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Projected New Stock
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {projectedStock}{' '}
                <span className="text-xs font-normal text-slate-500">{material.unit}</span>
              </div>
            </div>
          </div>

          {/* Adjustment Direction */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAdjustmentType('ADD')}
              className={`py-2.5 px-4 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                adjustmentType === 'ADD'
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Add Stock (+)</span>
            </button>

            <button
              type="button"
              onClick={() => setAdjustmentType('SUBTRACT')}
              className={`py-2.5 px-4 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                adjustmentType === 'SUBTRACT'
                  ? 'bg-rose-500/10 border-rose-500 text-rose-700 dark:text-rose-400 ring-2 ring-rose-500/20'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              <span>Reduce Stock (-)</span>
            </button>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Adjustment Quantity ({material.unit}) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
              required
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Adjustment Reason <span className="text-rose-500">*</span>
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value as MovementReason)}
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="STOCK_ADJUSTMENT">Stock Adjustment / Physical Count</option>
              <option value="PURCHASE_RECEIVED">Direct Purchase Receipt</option>
              <option value="DAMAGED_SCRAP">Damaged / Defective / Scrap</option>
              <option value="RETURN_FROM_CUSTOMER">Return from School / Customer</option>
              <option value="OPENING_STOCK">Opening Stock Reconciliation</option>
              <option value="OTHER">Other Reason</option>
            </select>
          </div>

          {/* Reference # */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Reference / Document ID
            </label>
            <input
              type="text"
              placeholder="e.g. AUDIT-2026-Q1 or CHALLAN-449"
              value={reference}
              onChange={e => setReference(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Notes & Remarks
            </label>
            <textarea
              rows={2}
              placeholder="Optional remarks for audit history..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
              className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Recording...' : 'Confirm Stock Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
