import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Receipt, Wallet, Building2, TrendingUp, ChevronDown } from 'lucide-react';
import { CommissionPayment } from '../../types';
import { subscribeToRealtimeCommissionPayments } from '../../services/dataService';
import { CurrencyFormatter } from '../common/CurrencyFormatter';

interface TransactionDetailsPageProps {
  onBack: () => void;
}

const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  ONLINE_TRANSFER: 'Online Transfer',
  NEFT: 'NEFT'
};

interface SchoolGroup {
  schoolId: string;
  schoolName: string;
  payments: CommissionPayment[];
  totalPaid: number;
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
  const [expandedSchoolId, setExpandedSchoolId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToRealtimeCommissionPayments((data) => {
      setPayments(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const totalPaid = payments.reduce((sum, p) => sum + (p.commissionAmount || 0), 0);

  // Grouped by school, most-recently-paid school first, each school's own
  // payments kept in the already-newest-first order the subscription hands
  // them in.
  const schoolGroups: SchoolGroup[] = useMemo(() => {
    const map = new Map<string, SchoolGroup>();
    payments.forEach((p) => {
      const existing = map.get(p.schoolId);
      if (existing) {
        existing.payments.push(p);
        existing.totalPaid += p.commissionAmount || 0;
      } else {
        map.set(p.schoolId, {
          schoolId: p.schoolId,
          schoolName: p.schoolName,
          payments: [p],
          totalPaid: p.commissionAmount || 0
        });
      }
    });
    return Array.from(map.values());
  }, [payments]);

  // Auto-expand the only group, or the first one, once data arrives - so a
  // school's history is visible immediately rather than needing a click.
  useEffect(() => {
    if (!expandedSchoolId && schoolGroups.length > 0) {
      setExpandedSchoolId(schoolGroups[0].schoolId);
    }
  }, [schoolGroups, expandedSchoolId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <div className="p-4 border-b border-slate-900">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
      </div>

      <div className="flex-1 flex items-start justify-center px-6 py-8">
        <div className="w-full max-w-5xl space-y-6">
          {/* Hero header */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Receipt className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100">Transaction Details of Commissions Paid</h1>
              <p className="text-xs text-slate-500">
                {loading ? 'Loading…' : `${payments.length} payment${payments.length === 1 ? '' : 's'} recorded`}
              </p>
            </div>
          </div>

          {/* Summary stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-slate-500 uppercase tracking-wide">Total Paid</div>
                <CurrencyFormatter amount={totalPaid} showDecimals className="text-lg font-bold text-slate-100" />
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-sky-500/15 border border-sky-500/40 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-sky-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-slate-500 uppercase tracking-wide">Payments Recorded</div>
                <div className="text-lg font-bold text-slate-100">{payments.length}</div>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-slate-500 uppercase tracking-wide">Schools Paid</div>
                <div className="text-lg font-bold text-slate-100">{schoolGroups.length}</div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
              <p className="text-xs text-slate-500">Loading…</p>
            </div>
          ) : schoolGroups.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center space-y-2">
              <Receipt className="w-6 h-6 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500">No commission payments recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide px-1">
                School-wise Payment History
              </h2>
              {schoolGroups.map((group) => {
                const isExpanded = expandedSchoolId === group.schoolId;
                const latestPayment = group.payments[0];
                return (
                  <div
                    key={group.schoolId}
                    className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl shadow-black/20"
                  >
                    {/* School summary row - click to expand/collapse */}
                    <button
                      type="button"
                      onClick={() => setExpandedSchoolId(isExpanded ? null : group.schoolId)}
                      className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                        {group.schoolName.trim().charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-100 truncate">{group.schoolName}</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {latestPayment.isDirectPayment ? 'Direct Payment to School' : latestPayment.agentName} · {group.payments.length} payment{group.payments.length === 1 ? '' : 's'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wide">Total Paid</div>
                        <CurrencyFormatter amount={group.totalPaid} showDecimals className="text-base font-bold text-emerald-400" />
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {/* Individual payments for this school */}
                    {isExpanded && (
                      <div className="border-t border-slate-800 overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-800/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                              <th className="px-4 py-2.5 w-12">#</th>
                              <th className="px-4 py-2.5">Mode</th>
                              <th className="px-4 py-2.5">Reference</th>
                              <th className="px-4 py-2.5">Amount</th>
                              <th className="px-4 py-2.5">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/80">
                            {group.payments.map((p, idx) => (
                              <tr key={p.commissionPaymentId} className="hover:bg-slate-800/40 transition-colors">
                                <td className="px-4 py-3 font-mono text-slate-500 align-middle">{idx + 1}</td>
                                <td className="px-4 py-3 align-middle">
                                  <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-300 whitespace-nowrap">
                                    {PAYMENT_MODE_LABELS[p.paymentMode] || p.paymentMode}
                                  </span>
                                </td>
                                <td className="px-4 py-3 align-middle text-slate-400 font-mono text-[11px]">
                                  {p.transactionUtrPfmsRef || p.upiTransactionRef || p.transactionRefNumber || p.neftUtrNumber || '—'}
                                </td>
                                <td className="px-4 py-3 align-middle">
                                  <CurrencyFormatter amount={p.commissionAmount} showDecimals className="text-emerald-400 font-bold" />
                                </td>
                                <td className="px-4 py-3 align-middle text-slate-400 whitespace-nowrap">
                                  {new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
