import React, { useMemo, useState } from 'react';
import { X, Wallet } from 'lucide-react';
import { Order, PaymentTransaction, UserProfile } from '../../types';
import { addCombinedPayment, editCombinedPayment, computeTdsAmount } from '../../services/dataService';
import { getDisplaySerialNo } from '../../utils/orderDisplay';
import { todayLocalISO } from '../../utils/dateInput';

interface CombinedPaymentModalProps {
  // The orders picked in the Orders Registry (2 or more) - or, when editing,
  // every order the combined payment covers.
  selectedOrders: Order[];
  // Every order - only used to work out each order's display serial number.
  allOrders: Order[];
  currentUser: UserProfile;
  onClose: () => void;
  // Called after a successful save (with the recalculated orders when editing).
  onRecorded: (updatedOrders?: Order[]) => void;
  // Set to edit an EXISTING combined payment instead of recording a new one:
  // the form opens pre-filled with the saved values and shows all its orders.
  editing?: { paymentGroupId: string; rows: PaymentTransaction[] };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

// One school payment that covers several orders (possibly from different
// schools). The person enters the total received and how much of it belongs
// to each order; the shares must add up to the total exactly. Each order then
// gets its own payment record for its share, so every order's balance and
// ledger stay correct - all tied together as one combined payment.
export const CombinedPaymentModal: React.FC<CombinedPaymentModalProps> = ({
  selectedOrders,
  allOrders,
  currentUser,
  onClose,
  onRecorded,
  editing
}) => {
  const editRows = editing?.rows;
  const editTdsRows = (editRows || []).filter(r => r.tdsDeducted && ((r.tdsAmount || 0) > 0 || (r.tdsPercent || 0) > 0));
  const editTdsAsAmount = editTdsRows[0]?.tdsInputMode === 'amount';
  const isEditing = !!editing;

  const [totalInput, setTotalInput] = useState(() =>
    editRows ? String(editRows[0]?.groupTotalAmount ?? round2(editRows.reduce((s, r) => s + r.amount, 0))) : ''
  );
  const [shares, setShares] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    (editRows || []).forEach(r => { init[r.orderId] = String(r.amount); });
    return init;
  });
  const [paymentMode, setPaymentMode] = useState(editRows?.[0]?.paymentMode || 'PFMS');
  const [paymentDate, setPaymentDate] = useState(editRows?.[0]?.paymentDate || todayLocalISO());
  const [reference, setReference] = useState(editRows?.[0]?.transactionReference || '');
  const [bankRef, setBankRef] = useState(editRows?.[0]?.bankReference || '');
  const [remarks, setRemarks] = useState(editRows?.[0]?.remarks || '');
  const [tdsDeducted, setTdsDeducted] = useState(editTdsRows.length > 0);
  const [tdsPercentInput, setTdsPercentInput] = useState(
    editTdsRows.length > 0 && !editTdsAsAmount && editTdsRows[0].tdsPercent ? String(editTdsRows[0].tdsPercent) : ''
  );
  // TDS can be typed as a % or as the TOTAL rupee amount deducted (one at a time).
  const [tdsAmountInput, setTdsAmountInput] = useState(
    editTdsAsAmount ? String(round2(editTdsRows.reduce((s, r) => s + (r.tdsAmount || 0), 0))) : ''
  );
  const [tdsMode, setTdsMode] = useState<'percent' | 'amount'>(editTdsAsAmount ? 'amount' : 'percent');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // True while the Total box holds a number this form filled in itself (from the
  // TDS entry), as opposed to one the person typed - so retyping the TDS
  // re-works the total, but never overwrites a total the person typed.
  const [totalAutoFilled, setTotalAutoFilled] = useState(false);

  // What an order still had pending BEFORE this payment counted. When editing,
  // the order's own saved figures already include this payment's share and TDS,
  // so they are added back - otherwise the order would look paid twice.
  const pendingBeforeThisPayment = (o: Order): number => {
    const payable = o.totalAmount || o.grossOrderValue || o.orderValue || 0;
    const current = o.amountPending ?? Math.max(0, payable - (o.amountReceived || 0));
    const mine = editRows?.find(r => r.orderId === o.orderId);
    return mine ? Math.min(payable, round2(current + mine.amount + (mine.tdsAmount || 0))) : current;
  };

  // Fill the "Share of payment" boxes automatically when TDS is typed.
  //  - If the person already typed the total received: split it between the
  //    orders in proportion to what each still has pending.
  //  - Otherwise: work out what each order needs so that share + TDS exactly
  //    clears its pending balance, and set the total to the sum of those.
  // The person can still change any share by hand afterwards.
  const autoFillShares = (mode: 'percent' | 'amount', pctText: string, amtText: string) => {
    const pendings = selectedOrders.map(pendingBeforeThisPayment);
    const sumPending = round2(pendings.reduce((s, p) => s + p, 0));
    if (!(sumPending > 0)) return;
    const p = Number(pctText);
    const a = round2(Number(amtText) || 0);
    if (mode === 'percent' ? !(p > 0 && p < 100) : !(a > 0)) return;

    const typedTotal = totalAutoFilled ? 0 : round2(Number(totalInput) || 0);
    const next: Record<string, string> = {};
    let allocated = 0;
    let allocatedTds = 0;
    const last = selectedOrders.length - 1;
    for (let i = 0; i < selectedOrders.length; i++) {
      let share: number;
      if (typedTotal > 0) {
        share = i === last ? round2(typedTotal - allocated) : round2((typedTotal * pendings[i]) / sumPending);
      } else if (mode === 'percent') {
        share = round2((pendings[i] * (100 - p)) / 100);
        // Rounding can leave a stray paisa pending; if a neighbouring paisa
        // clears the balance exactly, use that one.
        if (round2(share + computeTdsAmount(share, p)) !== round2(pendings[i])) {
          for (const d of [0.01, -0.01, 0.02, -0.02]) {
            const cand = round2(share + d);
            if (cand > 0 && round2(cand + computeTdsAmount(cand, p)) === round2(pendings[i])) { share = cand; break; }
          }
        }
      } else {
        const tdsPart = i === last ? round2(a - allocatedTds) : round2((a * pendings[i]) / sumPending);
        allocatedTds = round2(allocatedTds + tdsPart);
        share = round2(pendings[i] - tdsPart);
      }
      if (!(share > 0)) return; // can't sensibly fill - leave the boxes as they are
      allocated = round2(allocated + share);
      next[selectedOrders[i].orderId] = String(share);
    }
    setShares(next);
    if (!(typedTotal > 0)) {
      setTotalInput(String(allocated));
      setTotalAutoFilled(true);
    }
  };

  const total = round2(Number(totalInput) || 0);
  const pct = Number(tdsPercentInput);
  const tdsTotalTyped = round2(Number(tdsAmountInput) || 0);
  const tdsValid = !tdsDeducted || (tdsMode === 'amount' ? tdsTotalTyped > 0 : pct > 0 && pct < 100);

  const rows = useMemo(() => {
    const sharesSum = round2(selectedOrders.reduce((s, o) => s + (round2(Number(shares[o.orderId]) || 0)), 0));
    let allocatedTds = 0;
    return selectedOrders.map((o, i) => {
      const payable = o.totalAmount || o.grossOrderValue || o.orderValue || 0;
      const pending = pendingBeforeThisPayment(o);
      const share = round2(Number(shares[o.orderId]) || 0);
      let tds = 0;
      if (tdsDeducted && tdsValid) {
        if (tdsMode === 'amount') {
          // Same split as the service: proportional to shares, last order takes the remainder.
          tds = i === selectedOrders.length - 1
            ? round2(tdsTotalTyped - allocatedTds)
            : (sharesSum > 0 ? round2((tdsTotalTyped * share) / sharesSum) : 0);
          allocatedTds = round2(allocatedTds + tds);
        } else {
          tds = computeTdsAmount(share, pct);
        }
      }
      const pendingAfter = Math.max(0, round2(pending - share - tds));
      return { order: o, payable, pending, share, tds, pendingAfter, over: share > 0 && share + tds > pending + 0.005 };
    });
  }, [selectedOrders, shares, tdsDeducted, tdsValid, tdsMode, tdsTotalTyped, pct]);

  const allocated = round2(rows.reduce((s, r) => s + r.share, 0));
  const remaining = round2(total - allocated);
  const everyShareEntered = rows.every(r => r.share > 0);
  const canSave =
    !isSaving && total > 0 && everyShareEntered && Math.abs(remaining) < 0.005 && reference.trim() !== '' && tdsValid;

  const handleSave = async () => {
    setError(null);
    const anyOver = rows.some(r => r.over);
    const summary = rows
      .map(r => `• ${r.order.contractNumber || r.order.orderNumber || r.order.orderId} (${r.order.schoolName}): ${inr(r.share)}${r.tds > 0 ? ` + TDS ${inr(r.tds)}` : ''}`)
      .join('\n');
    const msg = isEditing
      ? `Save changes to this combined payment (now ${inr(total)} across ${rows.length} orders)?\n\n${summary}` +
        (anyOver ? '\n\nWarning: at least one order is being paid MORE than it has pending.' : '') +
        `\n\nAll ${rows.length} orders are updated together and their balances recalculated. If anything fails, nothing is changed.`
      : `Record a combined payment of ${inr(total)} across ${rows.length} orders?\n\n${summary}` +
        (anyOver ? '\n\nWarning: at least one order is being paid MORE than it has pending.' : '') +
        '\n\nEach order gets its own payment record for its share.';
    if (!confirm(msg)) return;

    setIsSaving(true);
    try {
      const payload = {
        shares: rows.map(r => ({ orderId: r.order.orderId, amount: r.share })),
        totalAmount: total,
        paymentMode,
        paymentDate,
        transactionReference: reference.trim(),
        bankReference: bankRef.trim() || undefined,
        remarks: remarks.trim() || 'Combined payment recorded via portal',
        tdsDeducted,
        tdsPercent: tdsDeducted && tdsMode === 'percent' ? pct : undefined,
        tdsAmount: tdsDeducted && tdsMode === 'amount' ? tdsTotalTyped : undefined,
        tdsInputMode: tdsDeducted ? tdsMode : undefined
      };
      if (editing) {
        const result = await editCombinedPayment(editing.paymentGroupId, payload, currentUser);
        alert(`Combined payment updated on all ${rows.length} orders.`);
        onRecorded(result.orders);
      } else {
        await addCombinedPayment(payload, currentUser);
        alert(`Combined payment of ${inr(total)} recorded across ${rows.length} orders.`);
        onRecorded();
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || (isEditing ? 'Could not update the combined payment.' : 'Could not record the combined payment.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3 sticky top-0 bg-white z-10">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Wallet className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{isEditing ? 'Edit Combined Payment' : 'Record Combined Payment'}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEditing
                  ? `This one payment covers ${rows.length} orders - changing it here updates all of them together. The orders themselves can't be changed here (delete the combined payment and record it again to do that).`
                  : `One payment from the school(s) covering ${rows.length} orders. Enter the total received, then how much belongs to each order.`}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} className="text-slate-400 hover:text-slate-700 disabled:opacity-40">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-xs">
          {/* Payment details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Total amount received (₹)</label>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={totalInput}
                onChange={(e) => { setTotalInput(e.target.value); setTotalAutoFilled(false); }}
                placeholder="e.g. 50000"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="PFMS">PFMS (Public Financial Management System)</option>
                <option value="NEFT">NEFT / Electronic Transfer</option>
                <option value="RTGS">RTGS</option>
                <option value="GeM Portal">GeM Portal Direct Payment</option>
                <option value="Cheque">Treasury Cheque / Demand Draft</option>
                <option value="Cash">Cash / Official Receipt</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Transaction / UTR / PFMS Reference</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. PFMS/2026/09/88129"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Bank Reference (Optional)</label>
              <input
                type="text"
                value={bankRef}
                onChange={(e) => setBankRef(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Payment Remarks</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* TDS */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="text-slate-700 font-semibold">Is TDS deducted?</span>
              <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800">
                <input type="radio" name="combined-tds" checked={tdsDeducted} onChange={() => setTdsDeducted(true)} />
                <span>Yes</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800">
                <input type="radio" name="combined-tds" checked={!tdsDeducted} onChange={() => { setTdsDeducted(false); setTdsPercentInput(''); setTdsAmountInput(''); setTdsMode('percent'); }} />
                <span>No</span>
              </label>
              {tdsDeducted && (
                <>
                  <div className="inline-flex items-center gap-1.5">
                    <span className="text-slate-600 font-semibold">TDS %</span>
                    <input
                      type="number"
                      min={0.01}
                      max={99.99}
                      step={0.01}
                      value={tdsMode === 'percent' ? tdsPercentInput : ''}
                      onChange={(e) => { setTdsMode('percent'); setTdsPercentInput(e.target.value); setTdsAmountInput(''); autoFillShares('percent', e.target.value, ''); }}
                      placeholder="e.g. 2"
                      className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <span className="text-slate-400 font-semibold text-[11px] uppercase">or</span>
                  <div className="inline-flex items-center gap-1.5">
                    <span className="text-slate-600 font-semibold">Total TDS amount (₹)</span>
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={tdsMode === 'amount' ? tdsAmountInput : ''}
                      onChange={(e) => { setTdsMode('amount'); setTdsAmountInput(e.target.value); setTdsPercentInput(''); autoFillShares('amount', '', e.target.value); }}
                      placeholder="e.g. 4000"
                      className="w-32 px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </>
              )}
            </div>
            {tdsDeducted && (
              <p className="text-[11px] text-slate-500">
                {tdsMode === 'amount'
                  ? "The total TDS amount is split between the orders in proportion to their pending balances, and the shares below fill in automatically (you can still edit them)."
                  : "The same % is applied to each order, and the shares below fill in automatically (you can still edit them)."}{' '}
                TDS counts as settled, so an order whose share plus TDS covers its pending balance is marked PAID.
              </p>
            )}
          </div>

          {/* Split between orders */}
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 w-14">SL. NO.</th>
                  <th className="px-3 py-2">Contract # / School</th>
                  <th className="px-3 py-2 text-right">{isEditing ? 'Pending before this payment (₹)' : 'Pending (₹)'}</th>
                  <th className="px-3 py-2 w-40">Share of payment (₹)</th>
                  <th className="px-3 py-2">After this payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(r => (
                  <tr key={r.order.orderId}>
                    <td className="px-3 py-2 font-mono font-bold text-amber-600">{getDisplaySerialNo(r.order, allOrders) ?? '—'}</td>
                    <td className="px-3 py-2">
                      <div className="font-mono font-semibold text-slate-800">{r.order.contractNumber || r.order.orderNumber}</div>
                      <div className="text-[11px] text-slate-500">{r.order.schoolName}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700">{inr(r.pending)}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={shares[r.order.orderId] ?? ''}
                        onChange={(e) => setShares(prev => ({ ...prev, [r.order.orderId]: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      {r.share > 0 ? (
                        <>
                          {r.tds > 0 && <div className="text-[11px] text-slate-500">TDS {inr(r.tds)} withheld</div>}
                          {r.over ? (
                            <span className="font-semibold text-rose-600">More than pending!</span>
                          ) : r.pendingAfter <= 0 ? (
                            <span className="font-bold text-emerald-700">PAID</span>
                          ) : (
                            <span className="font-semibold text-amber-700">Partially paid · {inr(r.pendingAfter)} pending</span>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Allocation check */}
          <div
            className={`rounded-lg px-3 py-2 font-semibold flex flex-wrap items-center justify-between gap-2 ${
              total > 0 && Math.abs(remaining) < 0.005 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            <span>Total {inr(total)} · Allocated {inr(allocated)}</span>
            <span>
              {total <= 0
                ? 'Enter the total amount received'
                : Math.abs(remaining) < 0.005
                  ? 'Shares match the total ✓'
                  : remaining > 0
                    ? `${inr(remaining)} still to allocate`
                    : `Shares are ${inr(Math.abs(remaining))} more than the total`}
            </span>
          </div>

          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">{error}</div>}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold disabled:opacity-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? (isEditing ? 'Saving...' : 'Recording...') : (isEditing ? 'Save Changes' : 'Credit Combined Payment')}
          </button>
        </div>
      </div>
    </div>
  );
};
