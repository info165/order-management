import React from 'react';
import { Wallet } from 'lucide-react';
import type { CommissionPayment } from '../../types';
import { CurrencyFormatter } from '../common/CurrencyFormatter';
import { summarizeSchoolCommission } from '../../utils/commissionSummary';

interface SchoolCommissionPanelProps {
  payments: CommissionPayment[];
  schoolId?: string;
  schoolName: string;
}

const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  ONLINE_TRANSFER: 'Online Transfer',
  NEFT: 'NEFT'
};

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// Read-only strip above the CB order list: the commission payments already
// recorded for the one school in view, and their total - the same records
// and the same "real payments only" rule as the Transaction Details table.
// Styled as a dark card (like the CB page itself) so it stands apart from
// the white order table beneath it.
export const SchoolCommissionPanel: React.FC<SchoolCommissionPanelProps> = ({ payments, schoolId, schoolName }) => {
  const { rows, totalPaid, draftCount } = summarizeSchoolCommission(payments, schoolId, schoolName);

  return (
    <div className="relative mb-3 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950 px-5 py-4 text-xs text-slate-100 shadow-lg shadow-slate-900/25">
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-amber-500/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl" />

      <div className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30 ring-1 ring-white/20">
            <Wallet className="w-4 h-4" />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/90">Commission paid</div>
            <div className="truncate text-sm font-semibold text-white">{schoolName}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 px-4 py-2 ring-1 ring-emerald-400/30">
          <div className="leading-tight text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/80">Total paid till now</div>
            <div className="text-[10px] text-slate-400">
              {rows.length} {rows.length === 1 ? 'payment' : 'payments'}{draftCount > 0 ? ` · ${draftCount} draft not counted` : ''}
            </div>
          </div>
          <CurrencyFormatter amount={totalPaid} showDecimals className="text-xl font-bold text-emerald-300" />
        </div>
      </div>

      {rows.length > 0 ? (
        <table className="relative mt-3 w-full text-left">
          <colgroup>
            <col className="w-36" />
            <col className="w-36" />
            <col className="w-36" />
            <col />
            <col className="w-32" />
          </colgroup>
          <thead className="text-[10px] uppercase tracking-wider text-slate-400">
            <tr className="border-b border-slate-700/70">
              <th className="py-1.5 pr-3 font-semibold">Date</th>
              <th className="py-1.5 pr-3 font-semibold text-right">Amount</th>
              <th className="py-1.5 pr-3 font-semibold">Mode</th>
              <th className="py-1.5 pr-3 font-semibold">Paid to</th>
              <th className="py-1.5 font-semibold text-right">Orders covered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map(p => (
              <tr key={p.commissionPaymentId} className="hover:bg-white/[0.03] transition-colors">
                <td className="py-2 pr-3 font-mono text-slate-200 whitespace-nowrap">{formatDate(p.paymentDate)}</td>
                <td className="py-2 pr-3 text-right whitespace-nowrap">
                  <CurrencyFormatter amount={Math.round((p.commissionAmount || 0) * 100) / 100} showDecimals className="font-bold text-emerald-300" />
                </td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-200 ring-1 ring-slate-700">
                    {(p.paymentMode && PAYMENT_MODE_LABELS[p.paymentMode]) || p.paymentMode || '—'}
                  </span>
                </td>
                <td className="py-2 pr-3 text-slate-200 truncate max-w-[220px]">{p.isDirectPayment ? 'Direct to school' : (p.agentName || '—')}</td>
                <td className="py-2 text-right font-mono text-[11px] text-slate-400 whitespace-nowrap">{p.orderIds.length} {p.orderIds.length === 1 ? 'order' : 'orders'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="relative mt-2 text-slate-400">No commission payment recorded for this school yet.</p>
      )}
    </div>
  );
};
