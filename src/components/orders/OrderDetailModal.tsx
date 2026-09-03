import React, { useState, useEffect } from 'react';
import {
  X,
  Building,
  User,
  Calendar,
  CreditCard,
  Truck,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  UploadCloud,
  FileDown,
  Paperclip,
  ExternalLink,
  Plus,
  ShieldCheck,
  Send,
  Eye,
  Check,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import {
  Order,
  OrderStatus,
  PaymentStatus,
  PaymentTransaction,
  OrderDocument,
  OrderStatusHistoryItem,
  UserProfile,
  DeliveryRecord
} from '../../types';
import { CurrencyFormatter } from '../common/CurrencyFormatter';
import { StatusBadge } from '../common/StatusBadge';
import { TrackingLink } from '../common/TrackingLink';
import {
  getPaymentsForOrder,
  addPayment,
  getDocumentsForOrder,
  uploadDocument,
  getTimelineForOrder,
  updateOrderStatus,
  updateDispatch,
  markDelivered,
  updateOrder
} from '../../services/dataService';

interface OrderDetailModalProps {
  order: Order;
  currentUser: UserProfile;
  onClose: () => void;
  onOrderUpdated: () => void;
}

type TabType = 'overview' | 'status' | 'dispatch' | 'payments' | 'documents';

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  currentUser,
  onClose,
  onOrderUpdated
}) => {
  const isAgent = currentUser.role === 'AGENT';
  const isAccounts = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN' || currentUser.role === 'ACCOUNTS';
  const isDispatch = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN' || currentUser.role === 'DISPATCH';
  const isAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Sub-data states
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [documents, setDocuments] = useState<OrderDocument[]>([]);
  const [timeline, setTimeline] = useState<OrderStatusHistoryItem[]>([]);
  const [loadingSubData, setLoadingSubData] = useState(true);

  // Form states for status update
  const [newStatus, setNewStatus] = useState<OrderStatus>(order.status);
  const [statusComment, setStatusComment] = useState('');
  const [visibleToAgent, setVisibleToAgent] = useState(true);
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  // Form states for dispatch
  const [courierName, setCourierName] = useState(order.courierName || 'Delhivery');
  const [trackingNumber, setTrackingNumber] = useState(order.docketNumber || '');
  const [dispatchDate, setDispatchDate] = useState(order.dispatchDate || new Date().toISOString().split('T')[0]);
  const [numberOfBoxes, setNumberOfBoxes] = useState(order.numberOfBoxes || '1');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(order.expectedDeliveryDate || '');
  const [dispatchRemarks, setDispatchRemarks] = useState('');
  const [isSubmittingDispatch, setIsSubmittingDispatch] = useState(false);

  // Delivery confirmation form
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [receivedBy, setReceivedBy] = useState('');
  const [receiverDesignation, setReceiverDesignation] = useState('Principal / Incharge');
  const [deliveryRemarks, setDeliveryRemarks] = useState('');
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);

  // Payment form states
  const [paymentAmount, setPaymentAmount] = useState<number>(order.amountPending ?? order.orderValue);
  const [paymentMode, setPaymentMode] = useState<any>('PFMS');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionRef, setTransactionRef] = useState('');
  const [bankRef, setBankRef] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Document upload states
  const [docType, setDocType] = useState<any>('Purchase Order');
  const [docFileName, setDocFileName] = useState('');
  const [docVisibleToAgent, setDocVisibleToAgent] = useState(true);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Calling status & internal notes
  const [callingStatus, setCallingStatus] = useState(order.callingStatus || '');
  const [internalNotes, setInternalNotes] = useState(order.internalNotes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const loadData = async () => {
    setLoadingSubData(true);
    try {
      const [pList, dList, tList] = await Promise.all([
        getPaymentsForOrder(order.orderId),
        getDocumentsForOrder(order.orderId, currentUser),
        getTimelineForOrder(order.orderId, currentUser)
      ]);
      setPayments(pList);
      setDocuments(dList);
      setTimeline(tList);
    } catch (e) {
      console.error('Error fetching order subdata', e);
    } finally {
      setLoadingSubData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [order.orderId]);

  // Handle Status Update
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newStatus === order.status && !statusComment.trim()) return;
    setIsSubmittingStatus(true);
    try {
      await updateOrderStatus(order.orderId, newStatus, statusComment, visibleToAgent, currentUser);
      setStatusComment('');
      await loadData();
      onOrderUpdated();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  // Handle Dispatch Update
  const handleUpdateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courierName.trim() || !trackingNumber.trim()) {
      alert('Please provide courier name and tracking/docket number.');
      return;
    }
    setIsSubmittingDispatch(true);
    try {
      await updateDispatch(
        order.orderId,
        {
          courierName,
          trackingNumber,
          dispatchDate,
          numberOfBoxes,
          expectedDeliveryDate,
          dispatchRemarks
        },
        currentUser
      );
      await loadData();
      onOrderUpdated();
      alert('Dispatch & Logistics record successfully updated.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingDispatch(false);
    }
  };

  // Handle Mark Delivered
  const handleMarkDelivered = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivedBy.trim()) {
      alert('Please specify the receiving officer or principal name.');
      return;
    }
    setIsSubmittingDelivery(true);
    try {
      await markDelivered(
        order.orderId,
        {
          deliveryDate,
          receivedBy,
          receiverDesignation,
          deliveryRemarks
        },
        currentUser
      );
      await loadData();
      onOrderUpdated();
      alert('Order marked as delivered with receiving verification.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingDelivery(false);
    }
  };

  // Handle Payment Record
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) {
      alert('Payment amount must be greater than zero.');
      return;
    }
    setIsSubmittingPayment(true);
    try {
      await addPayment(
        {
          orderId: order.orderId,
          amount: Number(paymentAmount),
          paymentMode,
          paymentDate,
          transactionReference: transactionRef || `REF-${Date.now()}`,
          bankReference: bankRef || undefined,
          remarks: paymentRemarks || 'Payment recorded via portal',
          createdBy: currentUser.userId
        },
        currentUser
      );
      setTransactionRef('');
      setBankRef('');
      setPaymentRemarks('');
      await loadData();
      onOrderUpdated();
      alert('Payment successfully credited and balance updated.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Handle Document Upload
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFileName.trim()) {
      alert('Please enter a document title or file description.');
      return;
    }
    setIsUploadingDoc(true);
    try {
      await uploadDocument(
        {
          orderId: order.orderId,
          documentType: docType,
          fileName: docFileName.endsWith('.pdf') ? docFileName : `${docFileName}.pdf`,
          fileUrl: `https://placehold.co/600x800/e2e8f0/1e293b?text=${encodeURIComponent(docFileName)}`,
          fileSize: '340 KB',
          uploadedBy: currentUser.name,
          visibleToAgent: isAgent ? true : docVisibleToAgent
        },
        currentUser
      );
      setDocFileName('');
      await loadData();
      alert('Document attached successfully.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Handle Save Notes
  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      await updateOrder(order.orderId, { callingStatus, internalNotes }, currentUser);
      onOrderUpdated();
      alert('Calling status and internal notes saved.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingNotes(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-start justify-between gap-4 border-b border-slate-800 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-base font-bold text-amber-400">{order.orderId}</span>
              <span className="text-slate-400 font-mono text-xs">({order.orderNumber})</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                FY {order.financialYear}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                {order.orderType}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>{order.schoolName}</span>
              <span className="text-xs font-normal text-slate-400 font-mono">({order.schoolType})</span>
            </h2>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <StatusBadge status={order.status} type="order" />
              <StatusBadge status={order.paymentStatus} type="payment" />
              <StatusBadge status={order.dispatchStatus} type="dispatch" />
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 bg-slate-50 border-b border-slate-200 flex items-center gap-1 overflow-x-auto shrink-0 select-none text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3.5 font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-amber-500 text-amber-900 font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Overview & Contract</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`py-3 px-3.5 font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'status'
                ? 'border-amber-500 text-amber-900 font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Timeline & Status ({timeline.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dispatch')}
            className={`py-3 px-3.5 font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'dispatch'
                ? 'border-amber-500 text-amber-900 font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Dispatch & Logistics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`py-3 px-3.5 font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'payments'
                ? 'border-amber-500 text-amber-900 font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payments & Treasury ({payments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`py-3 px-3.5 font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'documents'
                ? 'border-amber-500 text-amber-900 font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Paperclip className="w-4 h-4" />
            <span>Documents ({documents.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Financial & Metric Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[11px] text-slate-500 font-medium uppercase">Order Value (Excl GST)</div>
                  <div className="text-base font-bold text-slate-900 mt-1 font-mono">
                    <CurrencyFormatter amount={order.orderValue} />
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[11px] text-slate-500 font-medium uppercase">GST Amount (18%)</div>
                  <div className="text-base font-bold text-slate-700 mt-1 font-mono">
                    <CurrencyFormatter amount={order.taxAmount || Math.round(order.orderValue * 0.18)} />
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[11px] text-slate-500 font-medium uppercase">Amount Received</div>
                  <div className="text-base font-bold text-emerald-700 mt-1 font-mono">
                    <CurrencyFormatter amount={order.amountReceived || 0} />
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[11px] text-slate-500 font-medium uppercase">Amount Pending</div>
                  <div className="text-base font-bold text-amber-700 mt-1 font-mono">
                    <CurrencyFormatter
                      amount={order.amountPending ?? Math.max(0, (order.grossOrderValue || order.orderValue) - (order.amountReceived || 0))}
                    />
                  </div>
                </div>
              </div>

              {/* School, Contract, and Agent Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* School & Contact Card */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <Building className="w-4 h-4 text-slate-500" />
                    <span>School & Institutional Details</span>
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">School Name:</span>
                      <span className="font-semibold text-slate-800 text-sm">{order.schoolName}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Institution System:</span>
                        <span className="font-medium text-slate-700">{order.schoolType}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">School Code / UDISE:</span>
                        <span className="font-mono text-slate-700">{order.schoolCode || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[11px]">State / UT:</span>
                        <span className="font-medium text-slate-700">{order.state || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">District:</span>
                        <span className="font-medium text-slate-700">{order.district || 'N/A'}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Delivery Address:</span>
                      <span className="text-slate-600 flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <span>{order.schoolAddress || `${order.schoolName}, ${order.state || 'India'}`}</span>
                      </span>
                    </div>

                    {(order.principalName || order.schoolContactPhone) && (
                      <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Principal / Contact:</span>
                          <span className="font-medium text-slate-800">{order.principalName || 'Principal'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Phone / Mobile:</span>
                          <span className="font-mono text-slate-700 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{order.schoolContactPhone || 'Available on PO'}</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contract & GeM Specifications */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>Contract & Agent Allocation</span>
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Contract / Order No:</span>
                        <span className="font-mono font-semibold text-slate-800">{order.orderNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">GeM PO Number:</span>
                        <span className="font-mono text-slate-700">{order.purchaseOrderNumber || 'GEMC-5116877'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Order Date:</span>
                        <span className="font-mono text-slate-700">{order.orderDate}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Category / Package:</span>
                        <span className="font-medium text-slate-800">{order.category}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Assigned Regional Agent:</span>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                            {order.agentName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{order.agentName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{order.agentCode}</div>
                          </div>
                        </div>
                        {order.agentCommissionPercentage && (
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Agreed Margin</span>
                            <span className="font-mono font-semibold text-amber-800">
                              {order.agentCommissionPercentage}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Invoice Number:</span>
                        <span className="font-mono text-slate-800">{order.invoiceNumber || 'Pending Generation'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Courier / Docket:</span>
                        <span className="font-mono text-slate-800">{order.docketNumber || 'Dispatch Pending'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calling Status & Operations Scratchpad (Admin Only) */}
              {!isAgent && (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <span>Calling Status & Internal Notes (Staff Only)</span>
                    </h3>
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                    >
                      {isSavingNotes ? 'Saving...' : 'Save Notes'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-500 mb-1 font-medium">Telephonic / Verification Status</label>
                      <input
                        type="text"
                        placeholder="e.g. Spoke to Math Incharge, goods received, Bill submitted in PFMS"
                        value={callingStatus}
                        onChange={(e) => setCallingStatus(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1 font-medium">Internal Operational Scratchpad</label>
                      <input
                        type="text"
                        placeholder="e.g. Priority dispatch for Annual Day; check 2 boxes"
                        value={internalNotes}
                        onChange={(e) => setInternalNotes(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TIMELINE & STATUS UPDATES */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              {/* Status Update Form for Admin / Operations */}
              {!isAgent && (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
                    Advance Order Lifecycle Stage
                  </h3>

                  <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Target Status</label>
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        >
                          <option value="PO_PENDING">PO Pending</option>
                          <option value="PO_RECEIVED">PO Received</option>
                          <option value="PO_VERIFIED">PO Verified</option>
                          <option value="PROCESSING">Processing (Warehouse Allocation)</option>
                          <option value="READY_FOR_DISPATCH">Ready for Dispatch</option>
                          <option value="DISPATCHED">Dispatched (Courier In Transit)</option>
                          <option value="DELIVERED">Delivered (School Acknowledged)</option>
                          <option value="CLOSED">Closed (Payment Reconciled)</option>
                          <option value="ON_HOLD">On Hold</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>

                      <div className="flex items-center">
                        <label className="flex items-center gap-2 cursor-pointer mt-5">
                          <input
                            type="checkbox"
                            checked={visibleToAgent}
                            onChange={(e) => setVisibleToAgent(e.target.checked)}
                            className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                          />
                          <span className="text-slate-700 font-medium">
                            Notify assigned agent and make timeline event visible
                          </span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Status Transition Remarks</label>
                      <textarea
                        rows={2}
                        placeholder="State reason for status update, batch code, or special instructions..."
                        value={statusComment}
                        onChange={(e) => setStatusComment(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmittingStatus}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                      >
                        {isSubmittingStatus ? 'Updating Status...' : 'Apply Status Transition'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Chronological Visual Stepper & Event Timeline */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
                  <span>Lifecycle Milestone History</span>
                  <span className="text-slate-400 font-mono text-[11px]">{timeline.length} events logged</span>
                </h3>

                {timeline.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">No status events logged yet.</div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {timeline.map((item, idx) => (
                      <div key={item.historyId || idx} className="relative group">
                        {/* Dot indicator */}
                        <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-white border-2 border-amber-500 flex items-center justify-center shadow-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        </div>

                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{item.newStatus.replace(/_/g, ' ')}</span>
                              {item.previousStatus && (
                                <span className="text-slate-400 text-[10px]">
                                  (from {item.previousStatus.replace(/_/g, ' ')})
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-slate-400 text-[11px]">
                              {new Date(item.changedAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              })}
                            </span>
                          </div>

                          <p className="text-slate-700 mt-1">{item.comment}</p>

                          <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                            <span>Logged by: {item.changedByName || item.changedBy}</span>
                            {item.visibleToAgent && (
                              <span className="text-emerald-600 font-medium">Visible to Agent</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DISPATCH & LOGISTICS */}
          {activeTab === 'dispatch' && (
            <div className="space-y-6">
              {/* Current Tracking Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-purple-600" />
                    <span>Active Consignment Tracking</span>
                  </h3>
                  <StatusBadge status={order.dispatchStatus} type="dispatch" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Courier / Transporter</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                      {order.courierName || 'Not Assigned'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Docket / Tracking Number</span>
                    <div className="mt-1">
                      <TrackingLink courierName={order.courierName} docketNumber={order.docketNumber} />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Carton Boxes</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                      {order.numberOfBoxes || '1 Box'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Date of Dispatch:</span>
                    <span className="font-mono text-slate-700">{order.dispatchDate || 'Pending'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Expected Delivery Date:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {order.expectedDeliveryDate || 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Update Dispatch Details (Admin / Dispatch role) */}
              {!isAgent && (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
                    Enter / Update Courier & Dispatch Details
                  </h3>

                  <form onSubmit={handleUpdateDispatch} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Courier / Transporter</label>
                        <select
                          value={courierName}
                          onChange={(e) => setCourierName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="Delhivery">Delhivery</option>
                          <option value="India Post / Speed Post">India Post / Speed Post</option>
                          <option value="DTDC">DTDC Express</option>
                          <option value="Blue Dart">Blue Dart</option>
                          <option value="Trackon">Trackon Courier</option>
                          <option value="Surface Transport">Surface Transport (Truck/Lorry)</option>
                          <option value="Direct Handover">Direct Handover to School</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Docket / LR Number</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 314257981 or ED123456789IN"
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Number of Cartons / Boxes</label>
                        <input
                          type="text"
                          placeholder="e.g. 2"
                          value={numberOfBoxes}
                          onChange={(e) => setNumberOfBoxes(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Dispatch Date</label>
                        <input
                          type="date"
                          value={dispatchDate}
                          onChange={(e) => setDispatchDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Expected Delivery Date</label>
                        <input
                          type="date"
                          value={expectedDeliveryDate}
                          onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Logistics Notes / Hub Route</label>
                      <input
                        type="text"
                        placeholder="e.g. Surface cargo routed via Siliguri Hub"
                        value={dispatchRemarks}
                        onChange={(e) => setDispatchRemarks(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmittingDispatch}
                        className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50"
                      >
                        {isSubmittingDispatch ? 'Saving Dispatch...' : 'Save & Notify Agent'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Record Delivery & POD (Admin Only) */}
              {!isAgent && (
                <div className="bg-emerald-50/60 p-5 rounded-xl border border-emerald-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                    <h3 className="font-semibold text-xs text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Confirm School Delivery & Receiving (POD)</span>
                    </h3>
                    <span className="text-[11px] text-emerald-700 font-medium">Proof of Delivery Milestone</span>
                  </div>

                  <form onSubmit={handleMarkDelivered} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-emerald-900 font-semibold mb-1">Delivered Date</label>
                        <input
                          type="date"
                          value={deliveryDate}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-emerald-300 font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-emerald-900 font-semibold mb-1">Received By (Name)</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Shri R. K. Sharma"
                          value={receivedBy}
                          onChange={(e) => setReceivedBy(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-emerald-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-emerald-900 font-semibold mb-1">Receiver Designation</label>
                        <input
                          type="text"
                          placeholder="e.g. Principal / Lab Incharge"
                          value={receiverDesignation}
                          onChange={(e) => setReceiverDesignation(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-emerald-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-emerald-900 font-semibold mb-1">Delivery Remarks / Verification</label>
                      <input
                        type="text"
                        placeholder="All boxes verified intact and unpacked in laboratory"
                        value={deliveryRemarks}
                        onChange={(e) => setDeliveryRemarks(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-emerald-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmittingDelivery}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50"
                      >
                        {isSubmittingDelivery ? 'Recording...' : 'Mark Order as Delivered'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PAYMENTS & TREASURY */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              {/* Financial Balance Header */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Treasury Settlement</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">
                    School Payment Status: <span className="text-amber-600">{order.paymentStatus.replace(/_/g, ' ')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block">Total Invoiced</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      <CurrencyFormatter amount={order.grossOrderValue || order.totalAmount || order.orderValue} />
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block">Total Received</span>
                    <span className="text-base font-bold font-mono text-emerald-700">
                      <CurrencyFormatter amount={order.amountReceived || 0} />
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block">Outstanding</span>
                    <span className="text-base font-bold font-mono text-amber-700">
                      <CurrencyFormatter
                        amount={order.amountPending ?? Math.max(0, (order.grossOrderValue || order.orderValue) - (order.amountReceived || 0))}
                      />
                    </span>
                  </div>
                </div>
              </div>

              {/* Record Payment Form (Accounts & Admins only) */}
              {!isAgent && (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
                    Record Payment Received from School
                  </h3>

                  <form onSubmit={handleAddPayment} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Amount (₹)</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(Number(e.target.value))}
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
                          required
                          placeholder="e.g. PFMS/2026/09/88129"
                          value={transactionRef}
                          onChange={(e) => setTransactionRef(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Bank Reference (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. SBI Kendriya Branch"
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
                        placeholder="e.g. Full settlement approved by Principal"
                        value={paymentRemarks}
                        onChange={(e) => setPaymentRemarks(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmittingPayment}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm disabled:opacity-50"
                      >
                        {isSubmittingPayment ? 'Recording...' : 'Credit Payment to Account'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Payment Transaction History Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider">
                    Payment Ledger & Transaction History
                  </h3>
                  <span className="font-mono text-xs text-slate-400">{payments.length} credits recorded</span>
                </div>

                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Mode</th>
                      <th className="px-4 py-2.5">Reference / UTR</th>
                      <th className="px-4 py-2.5">Remarks</th>
                      <th className="px-4 py-2.5 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No payment credits logged for this order yet.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.paymentId} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2.5 font-mono text-slate-800">{p.paymentDate}</td>
                          <td className="px-4 py-2.5">
                            <span className="font-semibold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[11px]">
                              {p.paymentMode}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-700">
                            <div>{p.transactionReference}</div>
                            {p.bankReference && (
                              <div className="text-[10px] text-slate-400">{p.bankReference}</div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">{p.remarks || '—'}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-700">
                            <CurrencyFormatter amount={p.amount} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: DOCUMENTS & ATTACHMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Document upload card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
                  Attach Order Document / Bill / POD
                </h3>

                <form onSubmit={handleUploadDocument} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Document Category</label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-900 focus:outline-none"
                      >
                        <option value="Purchase Order">Purchase Order / GeM Contract</option>
                        <option value="Invoice">Tax Invoice / GeM Invoice</option>
                        <option value="Dispatch Receipt">Dispatch Receipt / Courier LR</option>
                        <option value="Delivery Challan">Delivery Challan / Proof of Delivery</option>
                        <option value="GeM Acceptance Copy">GeM Consignee Receipt (CRAC)</option>
                        <option value="Quotation">Quotation / Internal Spec</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Document Title / File Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. GeM_CRAC_Acceptance_Copy"
                        value={docFileName}
                        onChange={(e) => setDocFileName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none"
                      />
                    </div>

                    {!isAgent && (
                      <div className="flex items-center">
                        <label className="flex items-center gap-2 cursor-pointer mt-5">
                          <input
                            type="checkbox"
                            checked={docVisibleToAgent}
                            onChange={(e) => setDocVisibleToAgent(e.target.checked)}
                            className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                          />
                          <span className="text-slate-700 font-medium">Visible to Regional Agent</span>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isUploadingDoc}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50"
                    >
                      {isUploadingDoc ? 'Uploading...' : 'Attach Document'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Documents List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {documents.length === 0 ? (
                  <div className="col-span-2 py-12 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
                    No documents attached yet.
                  </div>
                ) : (
                  documents.map((doc) => (
                    <div
                      key={doc.documentId}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between gap-3 text-xs hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                          <FileText className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 line-clamp-1">{doc.fileName}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {doc.documentType} {doc.fileSize ? `• ${doc.fileSize}` : ''}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-1">
                            Uploaded by {doc.uploadedBy} on {new Date(doc.uploadedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition-colors"
                          title="Open Document"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
          <div className="text-slate-400 font-mono">
            Order Created by {order.createdByName || order.createdBy}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
