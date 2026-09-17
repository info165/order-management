import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Receipt, Wallet, Building2, TrendingUp, List, ChevronDown, ChevronRight, ImageOff, X, Trash2, Plus, PackageSearch } from 'lucide-react';
import { CommissionPayment, Order, UserProfile } from '../../types';
import { subscribeToRealtimeCommissionPayments, deleteCommissionPaymentScreenshot } from '../../services/dataService';
import { CurrencyFormatter } from '../common/CurrencyFormatter';
import { getDisplaySerialNo } from '../../utils/orderDisplay';
import { StatusBadge } from '../common/StatusBadge';

interface TransactionDetailsPageProps {
  currentUser: UserProfile;
  orders: Order[];
  onBack: () => void;
  onAddPayment: () => void;
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

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const round2 = (n: number) => Math.round(n * 100) / 100;

// Reached only from the CB page's "Transaction Details" link - a history of
// commissions paid across every school/partner, not scoped to any one
// school's selection (that's what CommissionCalculationPage is for). Backed
// by the same commissionPayments records "Mark as Paid" writes there, live
// via subscribeToRealtimeCommissionPayments so a payment appears here the
// moment it's recorded, with no refresh needed.
export const TransactionDetailsPage: React.FC<TransactionDetailsPageProps> = ({ currentUser, orders, onBack, onAddPayment }) => {
  const [payments, setPayments] = useState<CommissionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'schoolwise'> ('all');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [previewScreenshot, setPreviewScreenshot] = useState<{ url: string; fileName?: string; paymentId: string } | null>(null);
  const [deletingScreenshotId, setDeletingScreenshotId] = useState<string | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  // Which payment row's linked orders are currently expanded - one at a
  // time, toggled by clicking the row itself.
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  const handleDeleteScreenshot = async (paymentId: string) => {
    if (!window.confirm('Delete this payment screenshot? This cannot be undone.')) return;
    setDeletingScreenshotId(paymentId);
    setScreenshotError(null);
    try {
      await deleteCommissionPaymentScreenshot(paymentId, currentUser);
      setPreviewScreenshot((prev) => (prev?.paymentId === paymentId ? null : prev));
    } catch (err: any) {
      setScreenshotError(err.message || 'Could not delete screenshot.');
    } finally {
      setDeletingScreenshotId(null);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToRealtimeCommissionPayments((data) => {
      setPayments(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const totalPaid = payments.reduce((sum, p) => sum + (p.commissionAmount || 0), 0);

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
    return Array.from(map.values()).sort((a, b) => a.schoolName.localeCompare(b.schoolName));
  }, [payments]);

  // Default to the first school once data arrives, so the tab shows
  // something immediately instead of an empty picker.
  useEffect(() => {
    if (!selectedSchoolId && schoolGroups.length > 0) {
      setSelectedSchoolId(schoolGroups[0].schoolId);
    }
  }, [schoolGroups, selectedSchoolId]);

  const selectedGroup = schoolGroups.find(g => g.schoolId === selectedSchoolId) || null;

  const renderScreenshotCell = (p: CommissionPayment) =>
    p.screenshotDataUrl ? (
      <div className="relative group w-10 h-10 shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPreviewScreenshot({ url: p.screenshotDataUrl!, fileName: p.screenshotFileName, paymentId: p.commissionPaymentId });
          }}
          className="block w-10 h-10 rounded-lg overflow-hidden border border-slate-700 hover:border-amber-500/60 transition-colors"
          title="View payment screenshot"
        >
          <img src={p.screenshotDataUrl} alt="Payment screenshot" className="w-full h-full object-cover" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteScreenshot(p.commissionPaymentId);
          }}
          disabled={deletingScreenshotId === p.commissionPaymentId}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 shadow"
          title="Delete screenshot"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      </div>
    ) : (
      <span className="flex items-center justify-center w-10 h-10 rounded-lg border border-dashed border-slate-800 text-slate-700" title="No screenshot">
        <ImageOff className="w-4 h-4" />
      </span>
    );

  // The orders a payment actually covers, in their real registry-wide SL.
  // NO. order (same numbering the master Orders list shows), not just the
  // order in which orderIds happens to be stored.
  const renderOrdersPanel = (p: CommissionPayment, colSpan: number) => {
    if (expandedPaymentId !== p.commissionPaymentId) return null;
    const linkedOrders = p.orderIds
      .map(oid => orders.find(o => o.orderId === oid))
      .filter((o): o is Order => !!o)
      .sort((a, b) => (getDisplaySerialNo(a, orders) ?? 0) - (getDisplaySerialNo(b, orders) ?? 0));

    return (
      <tr className="bg-slate-950/60">
        <td colSpan={colSpan} className="px-4 py-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="px-3.5 py-2 border-b border-slate-800 flex items-center gap-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              <PackageSearch className="w-3.5 h-3.5 text-amber-400" />
              <span>Orders covered by this payment ({linkedOrders.length})</span>
            </div>
            {linkedOrders.length === 0 ? (
              <p className="px-3.5 py-3 text-[11px] text-slate-500">No matching orders found (they may have been deleted since).</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-800/50 text-slate-500 uppercase tracking-wide">
                      <th className="px-3.5 py-2 w-14">SL. NO.</th>
                      <th className="px-3.5 py-2">Contract #</th>
                      <th className="px-3.5 py-2">Category</th>
                      <th className="px-3.5 py-2">Value (₹)</th>
                      <th className="px-3.5 py-2">Status</th>
                      <th className="px-3.5 py-2 text-center">School Payment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {linkedOrders.map(o => (
                      <tr key={o.orderId}>
                        <td className="px-3.5 py-2 font-mono font-bold text-amber-400">{getDisplaySerialNo(o, orders) ?? '—'}</td>
                        <td className="px-3.5 py-2 text-slate-300 font-mono">{o.contractNumber || o.purchaseOrderNumber || o.orderNumber}</td>
                        <td className="px-3.5 py-2 text-slate-300">{o.category}</td>
                        <td className="px-3.5 py-2">
                          <CurrencyFormatter amount={o.orderValue} className="text-slate-200 font-semibold" />
                        </td>
                        <td className="px-3.5 py-2">
                          <StatusBadge status={o.status} type="order" compact />
                        </td>
                        <td className="px-3.5 py-2 text-center">
                          <StatusBadge status={o.paymentStatus} type="payment" compact />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <div className="p-4 border-b border-slate-900 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <button
          type="button"
          onClick={onAddPayment}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Payments</span>
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
                <CurrencyFormatter amount={round2(totalPaid)} showDecimals className="text-lg font-bold text-slate-100" />
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

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 max-w-md">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'all' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>All Transactions</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('schoolwise')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'schoolwise' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>School-wise Payment History</span>
            </button>
          </div>

          {loading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
              <p className="text-xs text-slate-500">Loading…</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center space-y-2">
              <Receipt className="w-6 h-6 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500">No commission payments recorded yet.</p>
            </div>
          ) : activeTab === 'all' ? (
            /* ALL TRANSACTIONS - every school in one whole table */
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl shadow-black/20">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                      <th className="px-4 py-3 w-8"></th>
                      <th className="px-4 py-3 w-12">#</th>
                      <th className="px-4 py-3">School Name</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">%</th>
                      <th className="px-4 py-3">Mode of Payment</th>
                      <th className="px-4 py-3">Date of Payment</th>
                      <th className="px-4 py-3">Screenshot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {payments.map((p, idx) => (
                      <React.Fragment key={p.commissionPaymentId}>
                      <tr
                        onClick={() => setExpandedPaymentId(prev => prev === p.commissionPaymentId ? null : p.commissionPaymentId)}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 align-middle text-slate-500">
                          {expandedPaymentId === p.commissionPaymentId ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500 align-middle">{idx + 1}</td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-[11px] shrink-0">
                              {p.schoolName.trim().charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-100 truncate">{p.schoolName}</div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {p.isDirectPayment ? 'Direct Payment to School' : p.agentName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <CurrencyFormatter amount={round2(p.commissionAmount)} showDecimals className="text-emerald-400 font-bold" />
                        </td>
                        <td className="px-4 py-3 align-middle text-slate-300 font-mono whitespace-nowrap">
                          {p.commissionPercent}%
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-300 whitespace-nowrap">
                            {PAYMENT_MODE_LABELS[p.paymentMode] || p.paymentMode}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle text-slate-400 whitespace-nowrap">
                          {formatDate(p.paymentDate)}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          {renderScreenshotCell(p)}
                        </td>
                      </tr>
                      {renderOrdersPanel(p, 8)}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* SCHOOL-WISE PAYMENT HISTORY - pick a school, see only its payments */
            <div className="space-y-4">
              <div className="relative max-w-md">
                <select
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="w-full appearance-none pl-3 pr-9 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {schoolGroups.map((g) => (
                    <option key={g.schoolId} value={g.schoolId}>
                      {g.schoolName} ({g.payments.length})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {selectedGroup && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl shadow-black/20">
                  <div className="flex items-center gap-4 p-4 border-b border-slate-800">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                      {selectedGroup.schoolName.trim().charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-100 truncate">{selectedGroup.schoolName}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {selectedGroup.payments[0].isDirectPayment ? 'Direct Payment to School' : selectedGroup.payments[0].agentName}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wide">Total Paid</div>
                      <CurrencyFormatter amount={round2(selectedGroup.totalPaid)} showDecimals className="text-base font-bold text-emerald-400" />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-800/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                          <th className="px-4 py-2.5 w-8"></th>
                          <th className="px-4 py-2.5 w-12">#</th>
                          <th className="px-4 py-2.5">School Name</th>
                          <th className="px-4 py-2.5">Amount</th>
                          <th className="px-4 py-2.5">%</th>
                          <th className="px-4 py-2.5">Mode of Payment</th>
                          <th className="px-4 py-2.5">Date of Payment</th>
                          <th className="px-4 py-2.5">Screenshot</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {selectedGroup.payments.map((p, idx) => (
                          <React.Fragment key={p.commissionPaymentId}>
                          <tr
                            onClick={() => setExpandedPaymentId(prev => prev === p.commissionPaymentId ? null : p.commissionPaymentId)}
                            className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                          >
                            <td className="px-4 py-3 align-middle text-slate-500">
                              {expandedPaymentId === p.commissionPaymentId ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-500 align-middle">{idx + 1}</td>
                            <td className="px-4 py-3 align-middle font-semibold text-slate-100">{p.schoolName}</td>
                            <td className="px-4 py-3 align-middle">
                              <CurrencyFormatter amount={round2(p.commissionAmount)} showDecimals className="text-emerald-400 font-bold" />
                            </td>
                            <td className="px-4 py-3 align-middle text-slate-300 font-mono whitespace-nowrap">
                              {p.commissionPercent}%
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-300 whitespace-nowrap">
                                {PAYMENT_MODE_LABELS[p.paymentMode] || p.paymentMode}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-middle text-slate-400 whitespace-nowrap">
                              {formatDate(p.paymentDate)}
                            </td>
                            <td className="px-4 py-3 align-middle">
                              {renderScreenshotCell(p)}
                            </td>
                          </tr>
                          {renderOrdersPanel(p, 8)}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {previewScreenshot && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setPreviewScreenshot(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 gap-3">
              <p className="text-xs text-slate-400 truncate">{previewScreenshot.fileName || 'Payment screenshot'}</p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDeleteScreenshot(previewScreenshot.paymentId)}
                  disabled={deletingScreenshotId === previewScreenshot.paymentId}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-600/15 border border-rose-600/40 text-rose-400 hover:bg-rose-600/25 text-[11px] font-semibold transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{deletingScreenshotId === previewScreenshot.paymentId ? 'Deleting…' : 'Delete'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewScreenshot(null)}
                  className="p-1 text-slate-500 hover:text-slate-200 transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {screenshotError && (
              <p className="px-4 py-2 text-[11px] text-rose-400 border-b border-slate-800">{screenshotError}</p>
            )}
            <img src={previewScreenshot.url} alt="Payment screenshot" className="w-full max-h-[75vh] object-contain bg-slate-950" />
          </div>
        </div>
      )}
    </div>
  );
};
