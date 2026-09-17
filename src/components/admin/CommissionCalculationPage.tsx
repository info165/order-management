import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calculator, Wallet, Upload, Camera, X, CheckCircle2, Pencil, Check, RotateCcw, Save, AlertTriangle } from 'lucide-react';
import { CommissionPayment, Order, UserProfile } from '../../types';
import { CurrencyFormatter } from '../common/CurrencyFormatter';
import { processFileForUpload } from '../../utils/fileUpload';
import { saveCommissionPayment, updateCommissionPayment, subscribeToRealtimeCommissionPayments, isCommissionPaymentPaid } from '../../services/dataService';

type PaymentMode = 'CASH' | 'UPI' | 'ONLINE_TRANSFER' | 'NEFT';

interface CommissionCalculationPageProps {
  orders: Order[];
  currentUser: UserProfile;
  onBack: () => void;
  // Present when reached by clicking a DRAFT row in Transaction Details -
  // pre-fills every field from what was already saved, and completing/
  // re-saving here updates that same record instead of creating another
  // one (an order can only ever have one draft at a time - see the
  // conflict check below).
  existingDraft?: CommissionPayment;
}

// Reached only from the CB page: select one or more of a school's orders,
// then "Commission Calculation" in the bulk-action bar lands here with
// exactly those orders.
//
// order.orderValue is each order's GST-inclusive total (the same field
// NewOrderModal computes /1.18 against to get the taxable value at creation
// time - see its `taxableValue` comment), so summing it across the selected
// orders and dividing by 1.18 the same way gives the combined pre-GST
// amount, per the exact formula requested: (order 1 + order 2) / 1.18.
export const CommissionCalculationPage: React.FC<CommissionCalculationPageProps> = ({ orders, currentUser, onBack, existingDraft }) => {
  // Who this payment is actually for: the field partner's name if every
  // selected order was placed through the same one, or "Direct Payment to
  // School" if they're all Direct/In-House orders (agentId AGT-DIRECT). A
  // school's orders can be split across multiple partners (or Direct), so a
  // selection spanning more than one is blocked below rather than guessing
  // or silently combining two different payees into one payment.
  const distinctAgentIds = new Set(orders.map(o => o.agentId));
  const hasMixedPartners = distinctAgentIds.size > 1;
  const soleOrder = orders[0];
  const isDirectPayment = !hasMixedPartners && soleOrder?.agentId === 'AGT-DIRECT';
  const payeeLabel = hasMixedPartners
    ? null
    : isDirectPayment
    ? 'Direct Payment to School'
    : soleOrder?.agentName || '—';

  const totalOrderValue = orders.reduce((sum, o) => sum + (o.orderValue || 0), 0);
  const calculatedAmount = totalOrderValue / 1.18;

  // Free-text so a partial entry like "5." or "0." while typing a decimal
  // (5.5, 0.5, etc.) isn't fought/reformatted mid-keystroke; parsed on
  // render, with an empty/invalid entry treated as 0% rather than erroring.
  // Pre-filled from existingDraft when re-opening a saved draft.
  // Rounded to 2 decimals - the raw saved value can carry long float noise
  // (e.g. from an older linked %/amount calculation), which would make the
  // input's own 5-decimal-digit typing cap reject every backspace on it
  // until the whole thing is cleared at once.
  const [commissionPercentInput, setCommissionPercentInput] = useState(() => existingDraft ? String(Math.round(existingDraft.commissionPercent * 100) / 100) : '');
  // Starts open since there's nothing calculated to show until a % is
  // typed - once confirmed (Enter or the checkmark) it collapses to a
  // static display with its own pencil-to-edit, matching Commission
  // Amount's pattern below. A re-opened draft already has a value, so it
  // starts collapsed.
  const [isEditingPercent, setIsEditingPercent] = useState(!existingDraft);
  const commissionPercent = parseFloat(commissionPercentInput);
  const hasValidPercent = commissionPercentInput.trim() !== '' && !isNaN(commissionPercent);
  const calculatedCommissionAmount = hasValidPercent ? (calculatedAmount * commissionPercent) / 100 : 0;

  // Lets the auto-calculated Commission Amount be manually fine-tuned
  // afterward (e.g. a small rounding adjustment) without touching the %
  // itself. null = not overridden, use the calculated value; changing the %
  // clears any override, since a new % means a fresh calculation. A
  // re-opened draft's saved amount only becomes an override here if it
  // actually differs from what recalculating fresh from its % would give -
  // otherwise there's nothing to preserve.
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [manualAmountInput, setManualAmountInput] = useState<string | null>(() => {
    if (!existingDraft) return null;
    const roundedCalculated = Math.round(calculatedCommissionAmount * 100) / 100;
    const roundedSaved = Math.round(existingDraft.commissionAmount * 100) / 100;
    return roundedSaved !== roundedCalculated ? String(roundedSaved) : null;
  });
  const hasManualOverride = manualAmountInput !== null && manualAmountInput.trim() !== '' && !isNaN(parseFloat(manualAmountInput));
  const commissionAmount = hasManualOverride ? parseFloat(manualAmountInput!) : calculatedCommissionAmount;

  const [activeTab, setActiveTab] = useState<'calculation' | 'payment'>('calculation');

  // Enter Payment Details - editable fields, kept local to this page for
  // now. Pre-filled from existingDraft when re-opening a saved draft.
  const [paymentMode, setPaymentMode] = useState<PaymentMode | ''>(() => existingDraft?.paymentMode || '');
  const [receivedByName, setReceivedByName] = useState(() => existingDraft?.receivedByName || '');
  const [upiId, setUpiId] = useState(() => existingDraft?.upiId || '');
  const [upiTransactionRef, setUpiTransactionRef] = useState(() => existingDraft?.upiTransactionRef || '');
  const [bankName, setBankName] = useState(() => existingDraft?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(() => existingDraft?.accountNumber || '');
  const [transactionRefNumber, setTransactionRefNumber] = useState(() => existingDraft?.transactionRefNumber || '');
  const [neftUtrNumber, setNeftUtrNumber] = useState(() => existingDraft?.neftUtrNumber || '');
  const [transactionUtrPfmsRef, setTransactionUtrPfmsRef] = useState(() => existingDraft?.transactionUtrPfmsRef || '');
  const [paymentRemarks, setPaymentRemarks] = useState(() => existingDraft?.remarks || '');
  const [paymentDate, setPaymentDate] = useState(() => existingDraft?.paymentDate || '');
  const [screenshotDataUrl, setScreenshotDataUrl] = useState(() => existingDraft?.screenshotDataUrl || '');
  const [screenshotFileName, setScreenshotFileName] = useState(() => existingDraft?.screenshotFileName || '');
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [isMarkedPaid, setIsMarkedPaid] = useState(false);
  const [isSavedAsDraft, setIsSavedAsDraft] = useState(false);
  const [markPaidError, setMarkPaidError] = useState<string | null>(null);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Every existing commission payment, used only to detect a conflict below
  // (re-opening existingDraft itself is never a "conflict" with itself).
  const [existingPayments, setExistingPayments] = useState<CommissionPayment[]>([]);
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeCommissionPayments(setExistingPayments);
    return unsubscribe;
  }, []);

  // An order can only ever have one draft outstanding at a time. This is
  // only ever non-null when starting a FRESH calculation (existingDraft is
  // undefined) and some order already selected here has an unrelated
  // draft sitting against it - blocks Save as Draft/Mark as Paid below
  // rather than silently creating a duplicate.
  const conflictingDraft = useMemo(() => {
    if (existingDraft) return null;
    return existingPayments.find(p =>
      !isCommissionPaymentPaid(p) && p.orderIds.some(oid => orders.some(o => o.orderId === oid))
    ) || null;
  }, [existingPayments, existingDraft, orders]);

  // Shared by both "Mark as Paid" and "Save as Draft" - a draft skips the
  // Mode of Payment / Date of Payment requirement (there's genuinely
  // nothing to enter yet, since payment hasn't happened), and is saved
  // with status: 'DRAFT' so Total Paid, the order's CB badge, and every
  // other "money already paid" view knows to exclude it until it's
  // actually completed later.
  const handleSubmit = async (status: 'DRAFT' | 'PAID') => {
    if (conflictingDraft) {
      setMarkPaidError('An order in this selection already has a saved draft. Open and complete that one from Transaction Details instead of creating a new one.');
      return;
    }
    if (status === 'PAID') {
      if (!paymentMode) {
        setMarkPaidError('Select a Mode of Payment first.');
        return;
      }
      if (!paymentDate) {
        setMarkPaidError('Enter the Date of Payment first.');
        return;
      }
    }
    setMarkPaidError(null);
    if (status === 'PAID') setIsSavingPayment(true);
    else setIsSavingDraft(true);
    try {
      const paymentDetailFields = {
        commissionPercent: hasValidPercent ? commissionPercent : 0,
        commissionAmount,
        paymentMode: paymentMode || undefined,
        receivedByName: paymentMode === 'CASH' ? receivedByName || undefined : undefined,
        upiId: paymentMode === 'UPI' ? upiId || undefined : undefined,
        upiTransactionRef: paymentMode === 'UPI' ? upiTransactionRef || undefined : undefined,
        bankName: paymentMode === 'ONLINE_TRANSFER' || paymentMode === 'NEFT' ? bankName || undefined : undefined,
        accountNumber: paymentMode === 'ONLINE_TRANSFER' || paymentMode === 'NEFT' ? accountNumber || undefined : undefined,
        transactionRefNumber: paymentMode === 'ONLINE_TRANSFER' ? transactionRefNumber || undefined : undefined,
        neftUtrNumber: paymentMode === 'NEFT' ? neftUtrNumber || undefined : undefined,
        transactionUtrPfmsRef: transactionUtrPfmsRef || undefined,
        remarks: paymentRemarks || undefined,
        paymentDate: paymentDate || undefined,
        screenshotDataUrl: screenshotDataUrl || undefined,
        screenshotFileName: screenshotFileName || undefined,
        status
      };
      if (existingDraft) {
        // Completing/updating the same draft record - never creates a
        // second payment for these orders. If a screenshot was attached on
        // the original draft and has since been removed here (rather than
        // just never set), that has to be sent as an explicit null so
        // updateCommissionPayment deletes the field - leaving it as
        // undefined would be indistinguishable from "unchanged" and the
        // old screenshot would keep showing in Transaction Details.
        const screenshotRemoved = !!existingDraft.screenshotDataUrl && !screenshotDataUrl;
        await updateCommissionPayment(
          existingDraft.commissionPaymentId,
          {
            ...paymentDetailFields,
            ...(screenshotRemoved ? { screenshotDataUrl: null, screenshotFileName: null } : {})
          },
          currentUser
        );
      } else {
        await saveCommissionPayment(
          {
            schoolId: soleOrder.schoolId,
            schoolName: soleOrder.schoolName,
            orderIds: orders.map(o => o.orderId),
            isDirectPayment,
            agentId: isDirectPayment ? undefined : soleOrder.agentId,
            agentName: isDirectPayment ? undefined : soleOrder.agentName,
            totalOrderValue,
            calculatedAmount,
            ...paymentDetailFields,
            createdBy: currentUser.userId,
            createdByName: currentUser.name
          },
          currentUser
        );
      }
      if (status === 'PAID') setIsMarkedPaid(true);
      else setIsSavedAsDraft(true);
    } catch (err: any) {
      setMarkPaidError(err.message || 'Could not save this payment.');
    } finally {
      setIsSavingPayment(false);
      setIsSavingDraft(false);
    }
  };
  const handleMarkAsPaid = () => handleSubmit('PAID');
  const handleSaveDraft = () => handleSubmit('DRAFT');

  const handleScreenshotSelect = async (file: File) => {
    setIsUploadingScreenshot(true);
    setScreenshotError(null);
    try {
      // Same client-side compression every other upload in the app uses,
      // to stay safely under Firestore's per-document size limit whenever
      // this gets wired up to save.
      const dataUrl = await processFileForUpload(file);
      setScreenshotDataUrl(dataUrl);
      setScreenshotFileName(file.name);
    } catch (err: any) {
      setScreenshotError(err.message || 'Could not process this file.');
    } finally {
      setIsUploadingScreenshot(false);
    }
  };

  if (hasMixedPartners) {
    const involved = Array.from(new Set(orders.map(o => (o.agentId === 'AGT-DIRECT' ? 'Direct Payment to School' : o.agentName))));
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <div className="p-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        </div>
        <div className="flex-1 flex items-start justify-center p-6 pt-4">
          <div className="w-full max-w-md bg-slate-900 border border-rose-900/60 rounded-xl p-5 text-center space-y-3">
            <h1 className="text-sm font-semibold text-rose-400">Selected orders belong to different partners</h1>
            <p className="text-xs text-slate-400">
              This selection mixes orders from more than one payee, so a single commission payment can't be calculated for it.
              Go back and select orders that all belong to the same partner (or are all Direct).
            </p>
            <div className="pt-2 border-t border-slate-800 text-left space-y-1">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Involved</p>
              {involved.map((name) => (
                <p key={name} className="text-xs text-slate-300">{name}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <div className="p-2 flex items-center justify-between">
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
        <div className="w-full max-w-6xl space-y-4">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-sm font-semibold text-slate-200">Commission Calculation</h1>
              {existingDraft && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-400 text-[9px] font-bold uppercase tracking-wide">
                  Editing Draft
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">{orders.length} order{orders.length === 1 ? '' : 's'} selected</p>
            <p className={`text-xs font-semibold ${isDirectPayment ? 'text-sky-400' : 'text-amber-400'}`}>
              {isDirectPayment ? payeeLabel : `Paying: ${payeeLabel}`}
            </p>
          </div>

          {/* Tabs - only needed to switch panels on narrower screens; from
              lg: up both panels show side by side instead, so they're hidden. */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 lg:hidden">
            <button
              type="button"
              onClick={() => setActiveTab('calculation')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'calculation' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Calculation</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('payment')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'payment' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Enter Payment Details</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className={`space-y-4 ${activeTab === 'calculation' ? '' : 'hidden lg:block'}`}>
            <h2 className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
              <Calculator className="w-3.5 h-3.5" />
              <span>Calculation</span>
            </h2>
              <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
                {orders.map((o) => (
                  <div key={o.orderId} className="px-4 py-2.5 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-400">{o.orderId}</span>
                    <span className="text-slate-300 truncate mx-3">{o.schoolName}</span>
                    <CurrencyFormatter amount={o.orderValue || 0} className="text-slate-200 shrink-0" />
                  </div>
                ))}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Order Value</span>
                  <CurrencyFormatter amount={totalOrderValue} className="text-slate-200" />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>÷ 1.18</span>
                </div>
                <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">Taxable Amount</span>
                  <CurrencyFormatter amount={Math.round(calculatedAmount * 100) / 100} showDecimals className="text-lg font-bold text-white" />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">Commission %</span>
                  {isEditingPercent ? (
                    <div className="flex items-center gap-1.5">
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          autoFocus
                          placeholder="e.g. 10 or 5.5"
                          value={commissionPercentInput}
                          onChange={(e) => {
                            // Manual free-typing only - digits and at most one
                            // decimal point, up to 5 digits after it (matching
                            // CurrencyFormatter's own 5-decimal display cap
                            // below) - no spinner arrows or other browser-
                            // supplied number-input behavior. The typed value is
                            // kept and parsed exactly as entered, never rounded.
                            const next = e.target.value;
                            if (next === '' || /^\d*\.?\d{0,5}$/.test(next)) {
                              setCommissionPercentInput(next);
                              // A new % means a fresh calculation - drop any
                              // manual amount override from before.
                              setManualAmountInput(null);
                              setIsEditingAmount(false);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && hasValidPercent) setIsEditingPercent(false);
                          }}
                          className="w-24 pl-2.5 pr-6 py-1.5 rounded-lg bg-slate-800 border border-amber-500 text-slate-100 text-right font-mono focus:outline-none"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                      </div>
                      {hasValidPercent && (
                        <button
                          type="button"
                          onClick={() => setIsEditingPercent(false)}
                          className="p-1 rounded-md text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title="Done"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-100">{commissionPercentInput}%</span>
                      <button
                        type="button"
                        onClick={() => setIsEditingPercent(true)}
                        className="p-1 rounded-md text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                        title="Edit commission %"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-200 shrink-0">Commission Amount</span>
                  {isEditingAmount ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-sm">₹</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        autoFocus
                        value={manualAmountInput ?? String(Math.round(calculatedCommissionAmount * 100) / 100)}
                        onChange={(e) => {
                          const next = e.target.value;
                          if (next === '' || /^\d*\.?\d{0,5}$/.test(next)) {
                            // Amount and % are independently manual now -
                            // editing one never touches the other, so a
                            // small rounding tweak to the amount (e.g.
                            // 847.46 -> 847) can't silently turn a clean
                            // 10% into an imprecise back-calculated figure.
                            setManualAmountInput(next);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setIsEditingAmount(false);
                        }}
                        className="w-28 px-2 py-1 rounded-lg bg-slate-800 border border-amber-500 text-emerald-400 text-right font-mono font-bold focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setIsEditingAmount(false)}
                        className="p-1 rounded-md text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        title="Done"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <CurrencyFormatter amount={Math.round(commissionAmount * 100) / 100} showDecimals className="text-lg font-bold text-emerald-400" />
                      <button
                        type="button"
                        onClick={() => setIsEditingAmount(true)}
                        className="p-1 rounded-md text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                        title="Edit commission amount"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {hasManualOverride && (
                        <button
                          type="button"
                          onClick={() => setManualAmountInput(null)}
                          className="p-1 rounded-md text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                          title="Reset to calculated amount"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {hasManualOverride && !isEditingAmount && (
                  <p className="text-[10px] text-amber-400/80 text-right">Manually adjusted (calculated: ₹{(Math.round(calculatedCommissionAmount * 100) / 100).toLocaleString('en-IN')})</p>
                )}
              </div>
          </div>

          <div className={`space-y-4 ${activeTab === 'payment' ? '' : 'hidden lg:block'}`}>
            <h2 className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
              <Wallet className="w-3.5 h-3.5" />
              <span>Enter Payment Details</span>
            </h2>
              {/* Mode of Payment */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <label className="block text-xs font-semibold text-slate-200">Mode of Payment</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode | '')}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select mode of payment...</option>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="ONLINE_TRANSFER">Online Transfer</option>
                  <option value="NEFT">NEFT</option>
                </select>

                {/* Mode-specific details */}
                {paymentMode === 'CASH' && (
                  <div className="space-y-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Received By (Name)</label>
                      <input
                        type="text"
                        value={receivedByName}
                        onChange={(e) => setReceivedByName(e.target.value)}
                        placeholder="e.g. Satish Pandey"
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}

                {paymentMode === 'UPI' && (
                  <div className="space-y-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">UPI ID</label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="e.g. name@upi"
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">UPI Transaction Reference / UTR</label>
                      <input
                        type="text"
                        value={upiTransactionRef}
                        onChange={(e) => setUpiTransactionRef(e.target.value)}
                        placeholder="e.g. 306233372XXXX"
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}

                {paymentMode === 'ONLINE_TRANSFER' && (
                  <div className="space-y-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. HDFC Bank"
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="e.g. 50100XXXXXXXX"
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Transaction Reference Number</label>
                      <input
                        type="text"
                        value={transactionRefNumber}
                        onChange={(e) => setTransactionRefNumber(e.target.value)}
                        placeholder="e.g. TXN20260914XXXX"
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}

                {paymentMode === 'NEFT' && (
                  <div className="space-y-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. State Bank of India"
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="e.g. 3849XXXXXXXX"
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">NEFT UTR Number</label>
                      <input
                        type="text"
                        value={neftUtrNumber}
                        onChange={(e) => setNeftUtrNumber(e.target.value)}
                        placeholder="e.g. N123202609140001"
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-1">
                  <label className="block text-[11px] text-slate-400 mb-1">Transaction / UTR / PFMS Reference</label>
                  <input
                    type="text"
                    value={transactionUtrPfmsRef}
                    onChange={(e) => setTransactionUtrPfmsRef(e.target.value)}
                    placeholder="e.g. transaction, UTR, or PFMS reference number"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="pt-1">
                  <label className="block text-[11px] text-slate-400 mb-1">Remarks (optional)</label>
                  <input
                    type="text"
                    value={paymentRemarks}
                    onChange={(e) => setPaymentRemarks(e.target.value)}
                    placeholder="Any additional note"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Date of Payment */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <label className="block text-xs font-semibold text-slate-200">Date of Payment</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Payment Screenshot Upload */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <label className="block text-xs font-semibold text-slate-200">Payment Screenshot</label>

                {screenshotDataUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={screenshotDataUrl}
                      alt="Payment screenshot"
                      className="max-h-40 rounded-lg border border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshotDataUrl('');
                        setScreenshotFileName('');
                      }}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-rose-400"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <p className="text-[11px] text-slate-500 mt-1 truncate">{screenshotFileName}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <label className="flex-1 flex flex-col items-center justify-center gap-1 py-4 rounded-lg border border-dashed border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 cursor-pointer transition-colors">
                      <Upload className="w-4 h-4" />
                      <span className="text-[11px]">Upload Screenshot</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (file) handleScreenshotSelect(file);
                        }}
                      />
                    </label>
                    <label className="flex-1 flex flex-col items-center justify-center gap-1 py-4 rounded-lg border border-dashed border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 cursor-pointer transition-colors">
                      <Camera className="w-4 h-4" />
                      <span className="text-[11px]">Scan with Camera</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (file) handleScreenshotSelect(file);
                        }}
                      />
                    </label>
                  </div>
                )}

                {isUploadingScreenshot && (
                  <p className="text-[11px] text-amber-400 animate-pulse">Uploading…</p>
                )}
                {screenshotError && (
                  <p className="text-[11px] text-rose-400">{screenshotError}</p>
                )}
              </div>

              {/* Mark as Paid / Save as Draft */}
              <div className="space-y-2">
                {conflictingDraft && !isMarkedPaid && !isSavedAsDraft && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-400 text-[11px]">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      One of these orders already has a saved draft (₹{Math.round(conflictingDraft.commissionAmount * 100) / 100} for {conflictingDraft.schoolName}).
                      An order can only have one draft at a time - open and complete that draft from Transaction Details instead of saving a new one here.
                    </span>
                  </div>
                )}
                {isMarkedPaid ? (
                  <div className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-600/40 text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Marked as Paid</span>
                  </div>
                ) : isSavedAsDraft ? (
                  <div className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-700/40 border border-slate-600 text-slate-300 text-xs font-semibold">
                    <Save className="w-4 h-4" />
                    <span>Saved as Draft</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={isSavingPayment || isSavingDraft || !!conflictingDraft}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-60 text-slate-200 font-bold text-sm transition-colors"
                      title="Save this calculation now, complete Mode/Date of Payment later"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSavingDraft ? 'Saving…' : existingDraft ? 'Update Draft' : 'Save as Draft'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleMarkAsPaid}
                      disabled={isSavingPayment || isSavingDraft || !!conflictingDraft}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold text-sm transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isSavingPayment ? 'Saving…' : 'Mark as Paid'}</span>
                    </button>
                  </div>
                )}
                {markPaidError && (
                  <p className="text-[11px] text-rose-400 text-center">{markPaidError}</p>
                )}
              </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};
