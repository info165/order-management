import React from 'react';
import { Wallet, CalendarDays, Building2, UserRound, CreditCard, ReceiptText } from 'lucide-react';
import type { CommissionPayment, Order } from '../../types';
import { CurrencyFormatter } from '../common/CurrencyFormatter';
import { summarizeSchoolCommission } from '../../utils/commissionSummary';
import { getDisplaySerialNo } from '../../utils/orderDisplay';

interface SchoolCommissionPanelProps {
  payments: CommissionPayment[];
  schoolId?: string;
  schoolName: string;
  // The full, unfiltered order list - used only to look up each covered
  // order's SL. NO. and GeM contract number (same source the table uses).
  orders?: Order[];
}

const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  ONLINE_TRANSFER: 'Online Transfer',
  NEFT: 'NEFT'
};

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// "SL 34 · GEMC-5116…" for an order that still exists; the bare order id for
// one that has since been deleted, so a payment never hides what it covered.
function coveredOrderLabel(orderId: string, orders: Order[]): { key: string; serial: string; contract: string } {
  const o = orders.find(x => x.orderId === orderId);
  if (!o) return { key: orderId, serial: '—', contract: orderId };
  const sl = getDisplaySerialNo(o, orders);
  return { key: orderId, serial: sl !== undefined ? String(sl) : '—', contract: o.contractNumber || o.purchaseOrderNumber || o.orderNumber || orderId };
}

// Read-only strip under the CB order list: the commission payments already
// recorded for the one school in view, and their total - the same records
// and the same "real payments only" rule as the Transaction Details table.
// Styled as a dark card (like the CB page itself) so it stands apart from
// the white order table above it.
export const SchoolCommissionPanel: React.FC<SchoolCommissionPanelProps> = ({ payments, schoolId, schoolName, orders = [] }) => {
  const { rows, totalPaid, draftCount } = summarizeSchoolCommission(payments, schoolId, schoolName);

  return (
    <div className="relative mt-3 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-[#2a1a0a] text-xs text-slate-100 shadow-xl shadow-slate-950/40 ring-1 ring-black/40">
      {/* ambient glows + a faint top highlight line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-amber-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

      {/* header */}
      <div className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 pt-4 pb-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 ring-1 ring-white/25">
            <Wallet className="w-5 h-5 drop-shadow" />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300/90">Commission paid</div>
            <div className="mt-0.5 truncate text-base font-semibold tracking-tight text-white">{schoolName}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl bg-white/[0.04] px-4 py-2.5 ring-1 ring-emerald-400/25 backdrop-blur-sm shadow-inner shadow-emerald-500/10">
          <div className="leading-tight text-right">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200/80">Total paid till now</div>
            <div className="mt-0.5 text-[10.5px] text-slate-400">
              {rows.length} {rows.length === 1 ? 'payment' : 'payments'}{draftCount > 0 ? ` · ${draftCount} draft not counted` : ''}
            </div>
          </div>
          <CurrencyFormatter amount={totalPaid} showDecimals className="text-2xl font-bold tabular-nums tracking-tight text-emerald-300 drop-shadow-[0_0_14px_rgba(52,211,153,0.25)]" />
        </div>
      </div>

      <div className="relative mx-5 h-px bg-gradient-to-r from-white/15 via-white/5 to-transparent" />

      {rows.length > 0 ? (
        <div className="relative px-5 pb-4 pt-2">
          {/* column captions */}
          <div className="hidden sm:grid grid-cols-[9.5rem_11rem_11rem_11rem_1fr] gap-x-6 px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span>Date</span>
            <span className="text-right">Amount</span>
            <span>Mode</span>
            <span>Paid to</span>
            <span>Orders covered <span className="normal-case tracking-normal text-slate-600">(SL · GeM contract)</span></span>
          </div>

          <div className="space-y-1.5">
            {rows.map(p => {
              const covered = p.orderIds.map(id => coveredOrderLabel(id, orders));
              return (
                <div
                  key={p.commissionPaymentId}
                  className="group grid grid-cols-1 sm:grid-cols-[9.5rem_11rem_11rem_11rem_1fr] items-start gap-x-6 gap-y-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-3 transition-colors hover:bg-white/[0.06] hover:border-white/10"
                >
                  <div className="flex items-center gap-2 font-mono text-slate-200 whitespace-nowrap">
                    <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
                    <span>{formatDate(p.paymentDate)}</span>
                  </div>

                  <div className="sm:text-right whitespace-nowrap">
                    <CurrencyFormatter amount={Math.round((p.commissionAmount || 0) * 100) / 100} showDecimals className="text-sm font-bold tabular-nums text-emerald-300" />
                  </div>

                  <div className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-2 rounded-lg bg-slate-800/90 px-3 py-1.5 text-[11.5px] font-medium text-slate-200 ring-1 ring-white/10">
                      <CreditCard className="w-3 h-3 text-slate-400" />
                      {(p.paymentMode && PAYMENT_MODE_LABELS[p.paymentMode]) || p.paymentMode || '—'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-200 truncate">
                    {p.isDirectPayment
                      ? <Building2 className="w-3.5 h-3.5 shrink-0 text-amber-400/90" />
                      : <UserRound className="w-3.5 h-3.5 shrink-0 text-sky-400/90" />}
                    <span className="truncate">{p.isDirectPayment ? 'Direct to school' : (p.agentName || '—')}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {covered.map(c => (
                      <span
                        key={c.key}
                        title={c.key}
                        className="inline-flex items-center overflow-hidden rounded-lg bg-slate-900/80 font-mono text-[11px] ring-1 ring-white/10 transition-colors group-hover:ring-white/15"
                      >
                        <span className="bg-amber-500/15 px-2 py-1 font-bold text-amber-300">SL {c.serial}</span>
                        <span className="px-2 py-1 text-slate-200">{c.contract}</span>
                      </span>
                    ))}
                    <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-500">
                      <ReceiptText className="w-3 h-3" />
                      {covered.length} {covered.length === 1 ? 'order' : 'orders'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="relative px-5 pb-4 pt-3 text-slate-400">No commission payment recorded for this school yet.</p>
      )}
    </div>
  );
};
