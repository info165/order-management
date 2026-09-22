import React from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title?: string;
  recordName?: string;
  recordType?: string;
  warningDetails?: string;
  confirmText?: string;
  isDeleting?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<Props> = ({
  isOpen,
  title = 'Delete Record',
  recordName,
  recordType,
  warningDetails,
  confirmText = 'Delete',
  isDeleting = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        {/* Header banner */}
        <div className="px-6 pt-6 pb-4 flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3
                id="delete-dialog-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                {title}
              </h3>
              <button
                type="button"
                onClick={onCancel}
                disabled={isDeleting}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Required specific prompt */}
            <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
              Are you sure you want to delete this record?
            </p>

            {recordName && (
              <div className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs">
                {recordType && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                    {recordType}
                  </span>
                )}
                <span className="font-semibold text-slate-900 dark:text-white truncate block">
                  {recordName}
                </span>
              </div>
            )}

            <p className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {warningDetails || 'This action will permanently delete this inventory record. Existing Sales Orders and historical order registries remain completely untouched and preserved.'}
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
