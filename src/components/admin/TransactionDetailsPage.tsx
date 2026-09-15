import React from 'react';
import { ArrowLeft, Receipt } from 'lucide-react';

interface TransactionDetailsPageProps {
  onBack: () => void;
}

// Reached only from the CB page's "Transaction Details" link - a history of
// commissions paid across every school/partner, not scoped to any one
// school's selection (that's what CommissionCalculationPage is for).
// Content to be added next.
export const TransactionDetailsPage: React.FC<TransactionDetailsPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <div className="p-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
      </div>

      <div className="flex-1 flex items-start justify-center px-6 pb-6">
        <div className="w-full max-w-2xl space-y-4">
          <div className="text-center space-y-1">
            <h1 className="text-sm font-semibold text-slate-200">Transaction Details of Commissions Paid</h1>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-1">
            <Receipt className="w-5 h-5 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-500">Content to be added next.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
