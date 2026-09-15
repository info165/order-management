import React, { useEffect, useState } from 'react';
import { ArrowLeft, Receipt } from 'lucide-react';
import { CommissionPayment } from '../../types';
import { subscribeToRealtimeCommissionPayments } from '../../services/dataService';
import { CurrencyFormatter } from '../common/CurrencyFormatter';

interface TransactionDetailsPageProps {
  onBack: () => void;
}

// Reached only from the CB page's "Transaction Details" link - a history of
// commissions paid across every school/partner, not scoped to any one
// school's selection (that's what CommissionCalculationPage is for). Backed
// by the same commissionPayments records "Mark as Paid" writes there, live
// via subscribeToRealtimeCommissionPayments so a payment appears here the
// moment it's recorded, with no refresh needed.
export const TransactionDetailsPage: React.FC<TransactionDetailsPageProps> = ({ onBack }) => {
  const [payments, setPayments] = useState<CommissionPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToRealtimeCommissionPayments((data) => {
      setPayments(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

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
            <p className="text-xs text-slate-500">
              {loading ? 'Loading…' : `${payments.length} payment${payments.length === 1 ? '' : 's'} recorded`}
            </p>
          </div>

          {loading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
              <p className="text-xs text-slate-500">Loading…</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-1">
              <Receipt className="w-5 h-5 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500">No commission payments recorded yet.</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[2.5rem_1fr_auto_auto] gap-3 px-4 py-2.5 bg-slate-800/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                <span>#</span>
                <span>School</span>
                <span>Amount</span>
                <span>Date</span>
              </div>
              <div className="divide-y divide-slate-800">
                {payments.map((p, idx) => (
                  <div
                    key={p.commissionPaymentId}
                    className="grid grid-cols-[2.5rem_1fr_auto_auto] gap-3 px-4 py-3 items-center text-xs"
                  >
                    <span className="font-mono text-slate-500">{idx + 1}</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-100 truncate">{p.schoolName}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {p.isDirectPayment ? 'Direct Payment to School' : p.agentName}
                      </div>
                    </div>
                    <CurrencyFormatter amount={p.commissionAmount} showDecimals className="text-emerald-400 font-semibold shrink-0" />
                    <span className="text-slate-400 shrink-0">
                      {new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
