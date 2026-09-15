import React, { useState } from 'react';
import { ArrowLeft, Calculator, Wallet, Upload, Camera, X, CheckCircle2 } from 'lucide-react';
import { Order, UserProfile } from '../../types';
import { CurrencyFormatter } from '../common/CurrencyFormatter';
import { processFileForUpload } from '../../utils/fileUpload';
import { saveCommissionPayment } from '../../services/dataService';

type PaymentMode = 'CASH' | 'UPI' | 'ONLINE_TRANSFER' | 'NEFT';

interface CommissionCalculationPageProps {
  orders: Order[];
  currentUser: UserProfile;
  onBack: () => void;
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
export const CommissionCalculationPage: React.FC<CommissionCalculationPageProps> = ({ orders, currentUser, onBack }) => {
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
  const [commissionPercentInput, setCommissionPercentInput] = useState('');
  const commissionPercent = parseFloat(commissionPercentInput);
  const hasValidPercent = commissionPercentInput.trim() !== '' && !isNaN(commissionPercent);
  const commissionAmount = hasValidPercent ? (calculatedAmount * commissionPercent) / 100 : 0;

  const [activeTab, setActiveTab] = useState<'calculation' | 'payment'>('calculation');

  // Enter Payment Details - editable fields, kept local to this page for now
  const [paymentMode, setPaymentMode] = useState<PaymentMode | ''>('');
  const [receivedByName, setReceivedByName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [upiTransactionRef, setUpiTransactionRef] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [transactionRefNumber, setTransactionRefNumber] = useState('');
  const [neftUtrNumber, setNeftUtrNumber] = useState('');
  const [transactionUtrPfmsRef, setTransactionUtrPfmsRef] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [screenshotDataUrl, setScreenshotDataUrl] = useState('');
  const [screenshotFileName, setScreenshotFileName] = useState('');
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [isMarkedPaid, setIsMarkedPaid] = useState(false);
  const [markPaidError, setMarkPaidError] = useState<string | null>(null);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const handleMarkAsPaid = async () => {
    if (!paymentMode) {
      setMarkPaidError('Select a Mode of Payment first.');
      return;
    }
    if (!paymentDate) {
      setMarkPaidError('Enter the Date of Payment first.');
      return;
    }
    setMarkPaidError(null);
    setIsSavingPayment(true);
    try {
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
          commissionPercent: hasValidPercent ? commissionPercent : 0,
          commissionAmount,
          paymentMode,
          receivedByName: paymentMode === 'CASH' ? receivedByName || undefined : undefined,
          upiId: paymentMode === 'UPI' ? upiId || undefined : undefined,
          upiTransactionRef: paymentMode === 'UPI' ? upiTransactionRef || undefined : undefined,
          bankName: paymentMode === 'ONLINE_TRANSFER' || paymentMode === 'NEFT' ? bankName || undefined : undefined,
          accountNumber: paymentMode === 'ONLINE_TRANSFER' || paymentMode === 'NEFT' ? accountNumber || undefined : undefined,
          transactionRefNumber: paymentMode === 'ONLINE_TRANSFER' ? transactionRefNumber || undefined : undefined,
          neftUtrNumber: paymentMode === 'NEFT' ? neftUtrNumber || undefined : undefined,
          transactionUtrPfmsRef: transactionUtrPfmsRef || undefined,
          remarks: paymentRemarks || undefined,
          paymentDate,
          screenshotDataUrl: screenshotDataUrl || undefined,
          screenshotFileName: screenshotFileName || undefined,
          createdBy: currentUser.userId,
          createdByName: currentUser.name
        },
        currentUser
      );
      setIsMarkedPaid(true);
    } catch (err: any) {
      setMarkPaidError(err.message || 'Could not save this payment.');
    } finally {
      setIsSavingPayment(false);
    }
  };

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
        <div className="w-full max-w-lg space-y-4">
          <div className="text-center space-y-1">
            <h1 className="text-sm font-semibold text-slate-200">Commission Calculation</h1>
            <p className="text-xs text-slate-500">{orders.length} order{orders.length === 1 ? '' : 's'} selected</p>
            <p className={`text-xs font-semibold ${isDirectPayment ? 'text-sky-400' : 'text-amber-400'}`}>
              {isDirectPayment ? payeeLabel : `Paying: ${payeeLabel}`}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
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

          {activeTab === 'calculation' && (
            <>
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
                  <span className="text-sm font-semibold text-slate-200">Amount</span>
                  <CurrencyFormatter amount={calculatedAmount} showDecimals className="text-lg font-bold text-amber-400" />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <label className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">Commission %</span>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
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
                        }
                      }}
                      className="w-28 pl-2.5 pr-6 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-right font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                  </div>
                </label>

                <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">Commission Amount</span>
                  <CurrencyFormatter amount={commissionAmount} showDecimals className="text-lg font-bold text-emerald-400" />
                </div>
              </div>
            </>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-4">
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

              {/* Mark as Paid */}
              <div className="space-y-2">
                {isMarkedPaid ? (
                  <div className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-600/40 text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Marked as Paid</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleMarkAsPaid}
                    disabled={isSavingPayment}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold text-sm transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSavingPayment ? 'Saving…' : 'Mark as Paid'}</span>
                  </button>
                )}
                {markPaidError && (
                  <p className="text-[11px] text-rose-400 text-center">{markPaidError}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
