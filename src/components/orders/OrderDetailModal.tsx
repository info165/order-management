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
  MapPin,
  Camera,
  Trash2,
  Download,
  Edit2,
  UserCheck
} from 'lucide-react';
import {
  Order,
  OrderStatus,
  PaymentStatus,
  PaymentTransaction,
  OrderDocument,
  OrderStatusHistoryItem,
  UserProfile,
  DeliveryRecord,
  Agent
} from '../../types';
import { CurrencyFormatter } from '../common/CurrencyFormatter';
import { StatusBadge } from '../common/StatusBadge';
import { TrackingLink } from '../common/TrackingLink';
import {
  getPaymentsForOrder,
  addPayment,
  updatePayment,
  deletePayment,
  getDocumentsForOrder,
  uploadDocument,
  deleteDocument,
  getTimelineForOrder,
  updateOrderStatus,
  updateDispatch,
  markDelivered,
  updateOrder,
  updateOrderSchoolDetails,
  updateOrderAgent,
  getAgents,
  getSystemSettings
} from '../../services/dataService';

interface OrderDetailModalProps {
  order: Order;
  // Gap-free position of this order among all currently active (non-deleted)
  // orders, i.e. the same number shown as "SL. NO." in the Orders Registry -
  // as opposed to order.orderId, whose numeric suffix only reflects a
  // creation-time counter that drifts away from that position once earlier
  // orders get deleted. Undefined for Agent/Partner sessions, which can't
  // see the full order list needed to compute it.
  displaySerialNo?: number;
  currentUser: UserProfile;
  onClose: () => void;
  onOrderUpdated: (updated?: Order) => void;
}

type TabType = 'overview' | 'status' | 'gemStatus' | 'dispatch' | 'payments' | 'documents';

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  displaySerialNo,
  currentUser,
  onClose,
  onOrderUpdated
}) => {
  const isAgent = currentUser.role === 'AGENT';
  const isAccounts = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN' || currentUser.role === 'ACCOUNTS';
  const isDispatch = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN' || currentUser.role === 'DISPATCH';
  const isAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN';
  const canManageOrders = !isAgent && (isAdmin || currentUser.role === 'DATA_ENTRY_OPERATOR' || isAccounts || isDispatch);

  // Local active order state to allow instantaneous updates
  const [activeOrder, setActiveOrder] = useState<Order>(order);

  useEffect(() => {
    setActiveOrder(order);
  }, [order]);

  // School contact details edit state
  const [isEditingSchool, setIsEditingSchool] = useState(false);
  const [schoolFormName, setSchoolFormName] = useState(order.schoolName || '');
  const [schoolFormPhone, setSchoolFormPhone] = useState(order.schoolContactPhone || '');
  const [schoolFormAddress, setSchoolFormAddress] = useState(order.schoolAddress || '');
  const [schoolFormType, setSchoolFormType] = useState(order.schoolType || '');
  const [schoolFormState, setSchoolFormState] = useState(order.state || '');
  const [schoolFormCode, setSchoolFormCode] = useState(order.schoolCode || '');
  const [schoolFormEmail, setSchoolFormEmail] = useState(order.schoolEmail || '');
  const [schoolFormPincode, setSchoolFormPincode] = useState(order.schoolPincode || '');
  const [isSavingSchool, setIsSavingSchool] = useState(false);
  const [schoolSaveError, setSchoolSaveError] = useState<string | null>(null);

  // Contract & commercial details edit state (order number, PO number, date,
  // category, company, order value) - the fields captured at creation time
  // that previously had no way to be corrected afterward.
  const [isEditingContract, setIsEditingContract] = useState(false);
  const [contractFormOrderNumber, setContractFormOrderNumber] = useState(order.orderNumber || '');
  const [contractFormPoNumber, setContractFormPoNumber] = useState(order.purchaseOrderNumber || '');
  const [contractFormOrderDate, setContractFormOrderDate] = useState(order.orderDate || '');
  const [contractFormCategory, setContractFormCategory] = useState(order.category || '');
  const [contractFormCompany, setContractFormCompany] = useState(order.company || '');
  const [contractFormOrderValue, setContractFormOrderValue] = useState<number>(order.orderValue || 0);
  const [isSavingContract, setIsSavingContract] = useState(false);
  const [contractSaveError, setContractSaveError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<string[]>([]);

  // Agent selector edit state
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(order.agentId || 'AGT-DIRECT');
  const [isSavingAgent, setIsSavingAgent] = useState(false);
  const [agentSaveError, setAgentSaveError] = useState<string | null>(null);
  const [agentSaveSuccess, setAgentSaveSuccess] = useState(false);

  useEffect(() => {
    getAgents().then(setAvailableAgents).catch(console.error);
    getSystemSettings().then(s => setCompanies(s.companies || [])).catch(console.error);
  }, []);

  useEffect(() => {
    setSchoolFormName(activeOrder.schoolName || '');
    setSchoolFormPhone(activeOrder.schoolContactPhone || '');
    setSchoolFormAddress(activeOrder.schoolAddress || '');
    setSchoolFormType(activeOrder.schoolType || '');
    setSchoolFormState(activeOrder.state || '');
    setSchoolFormCode(activeOrder.schoolCode || '');
    setSchoolFormEmail(activeOrder.schoolEmail || '');
    setSchoolFormPincode(activeOrder.schoolPincode || '');
    setSelectedAgentId(activeOrder.agentId || 'AGT-DIRECT');
    setContractFormOrderNumber(activeOrder.orderNumber || '');
    setContractFormPoNumber(activeOrder.purchaseOrderNumber || '');
    setContractFormOrderDate(activeOrder.orderDate || '');
    setContractFormCategory(activeOrder.category || '');
    setContractFormCompany(activeOrder.company || '');
    setContractFormOrderValue(activeOrder.orderValue || 0);
  }, [activeOrder]);

  const handleSaveSchoolDetails = async () => {
    if (!schoolFormName.trim()) {
      setSchoolSaveError('School Name is required.');
      return;
    }
    setIsSavingSchool(true);
    setSchoolSaveError(null);
    try {
      const result = await updateOrderSchoolDetails(
        activeOrder.orderId,
        {
          schoolName: schoolFormName.trim(),
          phone: schoolFormPhone.trim(),
          address: schoolFormAddress.trim(),
          schoolType: schoolFormType.trim(),
          state: schoolFormState.trim(),
          schoolCode: schoolFormCode.trim(),
          email: schoolFormEmail.trim(),
          pincode: schoolFormPincode.trim()
        },
        currentUser
      );
      setActiveOrder(result.order);
      setIsEditingSchool(false);
      onOrderUpdated(result.order);
    } catch (err: any) {
      setSchoolSaveError(err.message || 'Failed to save school details');
    } finally {
      setIsSavingSchool(false);
    }
  };

  const handleSaveContractDetails = async () => {
    if (!contractFormOrderNumber.trim()) {
      setContractSaveError('Contract / Order No is required.');
      return;
    }
    if (!contractFormCategory.trim()) {
      setContractSaveError('Category / Package is required.');
      return;
    }
    if (contractFormOrderValue <= 0) {
      setContractSaveError('Order value must be greater than zero.');
      return;
    }
    setIsSavingContract(true);
    setContractSaveError(null);
    try {
      const updated = await updateOrder(
        activeOrder.orderId,
        {
          orderNumber: contractFormOrderNumber.trim(),
          purchaseOrderNumber: contractFormPoNumber.trim(),
          orderDate: contractFormOrderDate,
          category: contractFormCategory.trim(),
          company: contractFormCompany.trim(),
          orderValue: contractFormOrderValue
        },
        currentUser
      );
      setActiveOrder(updated);
      setIsEditingContract(false);
      onOrderUpdated(updated);
    } catch (err: any) {
      setContractSaveError(err.message || 'Failed to save contract details');
    } finally {
      setIsSavingContract(false);
    }
  };

  const handleSaveAgent = async () => {
    if (!selectedAgentId) return;
    setIsSavingAgent(true);
    setAgentSaveError(null);
    setAgentSaveSuccess(false);
    try {
      const updated = await updateOrderAgent(activeOrder.orderId, selectedAgentId, currentUser);
      setActiveOrder(updated);
      setAgentSaveSuccess(true);
      setTimeout(() => setAgentSaveSuccess(false), 3000);
      onOrderUpdated(updated);
    } catch (err: any) {
      setAgentSaveError(err.message || 'Failed to update agent');
    } finally {
      setIsSavingAgent(false);
    }
  };

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
  const [receiverDesignation, setReceiverDesignation] = useState('Principal / Incharge');
  const [deliveryRemarks, setDeliveryRemarks] = useState('');
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);

  // Payment form states
  const [paymentAmount, setPaymentAmount] = useState<number>(
    order.amountPending ?? Math.max(0, (order.grossOrderValue || order.totalAmount || order.orderValue) - (order.amountReceived || 0))
  );
  const [paymentMode, setPaymentMode] = useState<any>('PFMS');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionRef, setTransactionRef] = useState('');
  const [bankRef, setBankRef] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  // Document upload states
  const [docType, setDocType] = useState<any>('Purchase Order');
  const [docFileName, setDocFileName] = useState('');
  const [docFileData, setDocFileData] = useState<string>('');
  const [docVisibleToAgent, setDocVisibleToAgent] = useState(true);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Attachment states for CN, POD, Invoices, and GeM Order Copy
  const [gemOrderCopyUrl, setGemOrderCopyUrl] = useState(order.gemOrderCopyUrl || '');
  const [gemOrderCopyFileName, setGemOrderCopyFileName] = useState(order.gemOrderCopyFileName || '');
  const [cnCopyUrl, setCnCopyUrl] = useState(order.cnCopyUrl || '');
  const [cnCopyFileName, setCnCopyFileName] = useState(order.cnCopyFileName || '');
  const [podCopyUrl, setPodCopyUrl] = useState(order.podCopyUrl || '');
  const [podCopyFileName, setPodCopyFileName] = useState(order.podCopyFileName || '');
  const [gemInvoiceUrl, setGemInvoiceUrl] = useState(order.gemInvoiceUrl || '');
  const [gemInvoiceFileName, setGemInvoiceFileName] = useState(order.gemInvoiceFileName || '');
  const [companyInvoiceUrl, setCompanyInvoiceUrl] = useState(order.companyInvoiceUrl || '');
  const [companyInvoiceFileName, setCompanyInvoiceFileName] = useState(order.companyInvoiceFileName || '');
  const [ewayBillUrl, setEwayBillUrl] = useState(order.ewayBillUrl || '');
  const [ewayBillFileName, setEwayBillFileName] = useState(order.ewayBillFileName || '');

  // Document full preview modal state
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string; fileName: string } | null>(null);

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

  // Upload handler for Consignment Note (CN Copy)
  const handleCnFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setCnCopyUrl(dataUrl);
      setCnCopyFileName(file.name);
      try {
        await updateOrder(order.orderId, { cnCopyUrl: dataUrl, cnCopyFileName: file.name }, currentUser);
        await uploadDocument(
          {
            orderId: order.orderId,
            documentType: 'Dispatch Receipt',
            fileName: `CN_Copy_${file.name}`,
            fileUrl: dataUrl,
            fileSize: `${Math.round(file.size / 1024)} KB`,
            uploadedBy: currentUser.name,
            visibleToAgent: true,
            quickVaultCategory: 'cnCopy'
          },
          currentUser
        );
        await loadData();
        onOrderUpdated();
        alert('Consignment Note (CN Copy) successfully uploaded and linked to order.');
      } catch (err: any) {
        alert('Failed to save Consignment Note: ' + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  // Upload handler for Proof of Delivery (POD Copy)
  const handlePodFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPodCopyUrl(dataUrl);
      setPodCopyFileName(file.name);
      try {
        await updateOrder(order.orderId, { podCopyUrl: dataUrl, podCopyFileName: file.name }, currentUser);
        await uploadDocument(
          {
            orderId: order.orderId,
            documentType: 'Delivery Challan',
            fileName: `POD_Signed_${file.name}`,
            fileUrl: dataUrl,
            fileSize: `${Math.round(file.size / 1024)} KB`,
            uploadedBy: currentUser.name,
            visibleToAgent: true,
            quickVaultCategory: 'podCopy'
          },
          currentUser
        );
        await loadData();
        onOrderUpdated();
        alert('Proof of Delivery (POD Copy) successfully uploaded.');
      } catch (err: any) {
        alert('Failed to save POD: ' + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  // Upload handler for Specific Order Documents (Invoice, GeM, E-way bill, CN, POD)
  const handleQuickDocUpload = async (category: string, file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const updates: Partial<Order> = {};
      let docTypeMapped: any = 'Invoice';

      if (category === 'gemOrderCopy') {
        updates.gemOrderCopyUrl = dataUrl;
        updates.gemOrderCopyFileName = file.name;
        setGemOrderCopyUrl(dataUrl);
        setGemOrderCopyFileName(file.name);
        docTypeMapped = 'GeM Order Copy';
      } else if (category === 'companyInvoice') {
        updates.companyInvoiceUrl = dataUrl;
        updates.companyInvoiceFileName = file.name;
        setCompanyInvoiceUrl(dataUrl);
        setCompanyInvoiceFileName(file.name);
        docTypeMapped = 'Invoice';
      } else if (category === 'gemInvoice') {
        updates.gemInvoiceUrl = dataUrl;
        updates.gemInvoiceFileName = file.name;
        setGemInvoiceUrl(dataUrl);
        setGemInvoiceFileName(file.name);
        docTypeMapped = 'Invoice';
      } else if (category === 'ewayBill') {
        updates.ewayBillUrl = dataUrl;
        updates.ewayBillFileName = file.name;
        setEwayBillUrl(dataUrl);
        setEwayBillFileName(file.name);
        docTypeMapped = 'Dispatch Receipt';
      } else if (category === 'cnCopy') {
        updates.cnCopyUrl = dataUrl;
        updates.cnCopyFileName = file.name;
        setCnCopyUrl(dataUrl);
        setCnCopyFileName(file.name);
        docTypeMapped = 'Dispatch Receipt';
      } else if (category === 'podCopy') {
        updates.podCopyUrl = dataUrl;
        updates.podCopyFileName = file.name;
        setPodCopyUrl(dataUrl);
        setPodCopyFileName(file.name);
        docTypeMapped = 'Delivery Challan';
      }

      try {
        await updateOrder(order.orderId, updates, currentUser);
        await uploadDocument(
          {
            orderId: order.orderId,
            documentType: docTypeMapped,
            fileName: file.name,
            fileUrl: dataUrl,
            fileSize: `${Math.round(file.size / 1024)} KB`,
            uploadedBy: currentUser.name,
            visibleToAgent: true,
            quickVaultCategory: category
          },
          currentUser
        );
        await loadData();
        onOrderUpdated();
        alert(`Document "${file.name}" uploaded and attached successfully.`);
      } catch (err: any) {
        alert('Document upload failed: ' + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  // Clears the Quick Vault field for one category (order-level URL/filename
  // fields shown as tiles on both the Documents tab and the GeM Status tab).
  // Shared by both delete paths below so either one stays fully in sync
  // with the other, instead of clearing only its own side.
  const clearQuickVaultField = async (category: string) => {
    const updates: Partial<Order> = {};
    if (category === 'gemOrderCopy') {
      updates.gemOrderCopyUrl = '';
      updates.gemOrderCopyFileName = '';
      setGemOrderCopyUrl('');
      setGemOrderCopyFileName('');
    } else if (category === 'companyInvoice') {
      updates.companyInvoiceUrl = '';
      updates.companyInvoiceFileName = '';
      setCompanyInvoiceUrl('');
      setCompanyInvoiceFileName('');
    } else if (category === 'gemInvoice') {
      updates.gemInvoiceUrl = '';
      updates.gemInvoiceFileName = '';
      setGemInvoiceUrl('');
      setGemInvoiceFileName('');
    } else if (category === 'ewayBill') {
      updates.ewayBillUrl = '';
      updates.ewayBillFileName = '';
      setEwayBillUrl('');
      setEwayBillFileName('');
    } else if (category === 'cnCopy') {
      updates.cnCopyUrl = '';
      updates.cnCopyFileName = '';
      setCnCopyUrl('');
      setCnCopyFileName('');
    } else if (category === 'podCopy') {
      updates.podCopyUrl = '';
      updates.podCopyFileName = '';
      setPodCopyUrl('');
      setPodCopyFileName('');
    }
    if (Object.keys(updates).length > 0) {
      await updateOrder(order.orderId, updates, currentUser);
    }
  };

  // Delete attached document handler (Quick Vault tile, on either
  // Documents tab or GeM Status tab). Also removes the matching entry
  // from the Document Repository list so both stay in sync.
  const handleDeleteQuickDoc = async (category: string) => {
    if (!confirm('Are you sure you want to remove this attached document?')) return;
    try {
      await clearQuickVaultField(category);
      const matching = documents.filter(d => d.orderId === order.orderId && d.quickVaultCategory === category);
      for (const doc of matching) {
        await deleteDocument(doc.documentId, currentUser);
      }
      await loadData();
      onOrderUpdated();
    } catch (err: any) {
      alert('Failed to remove document: ' + err.message);
    }
  };

  // Delete document from repository. Also clears the matching Quick Vault
  // tile (on both the Documents tab and the GeM Status tab) so deleting
  // from either place removes it from both.
  const handleDeleteUploadedDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to permanently delete this document?')) return;
    try {
      const doc = documents.find(d => d.documentId === documentId);
      await deleteDocument(documentId, currentUser);
      if (doc?.quickVaultCategory) {
        await clearQuickVaultField(doc.quickVaultCategory);
      }
      await loadData();
      onOrderUpdated();
    } catch (err: any) {
      alert('Failed to delete document: ' + err.message);
    }
  };

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
      const updated = await updateDispatch(
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
      setActiveOrder(updated);
      await loadData();
      onOrderUpdated(updated);
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
    setIsSubmittingDelivery(true);
    try {
      await markDelivered(
        order.orderId,
        {
          deliveryDate,
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

  // Handle Payment Record (add or, when editingPaymentId is set, edit an
  // existing one - same form, submit button/behavior just switches)
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) {
      alert('Payment amount must be greater than zero.');
      return;
    }
    setIsSubmittingPayment(true);
    try {
      let updated: Order;
      if (editingPaymentId) {
        const result = await updatePayment(
          editingPaymentId,
          {
            amount: Number(paymentAmount),
            paymentMode,
            paymentDate,
            transactionReference: transactionRef || `REF-${Date.now()}`,
            bankReference: bankRef || undefined,
            remarks: paymentRemarks || 'Payment recorded via portal'
          },
          currentUser
        );
        updated = result.order;
        alert('Payment successfully updated and balance recalculated.');
      } else {
        const result = await addPayment(
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
        updated = result.order;
        alert('Payment successfully credited and balance updated.');
      }
      setActiveOrder(updated);
      setEditingPaymentId(null);
      setPaymentAmount(0);
      setPaymentMode('PFMS');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setTransactionRef('');
      setBankRef('');
      setPaymentRemarks('');
      await loadData();
      onOrderUpdated(updated);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleEditPaymentClick = (p: PaymentTransaction) => {
    setEditingPaymentId(p.paymentId);
    setPaymentAmount(p.amount);
    setPaymentMode(p.paymentMode);
    setPaymentDate(p.paymentDate);
    setTransactionRef(p.transactionReference || '');
    setBankRef(p.bankReference || '');
    setPaymentRemarks(p.remarks || '');
  };

  const handleCancelEditPayment = () => {
    setEditingPaymentId(null);
    setPaymentAmount(0);
    setPaymentMode('PFMS');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setTransactionRef('');
    setBankRef('');
    setPaymentRemarks('');
  };

  const handleDeletePayment = async (p: PaymentTransaction) => {
    if (!confirm(`Delete this payment of ₹${p.amount.toLocaleString('en-IN')} (${p.paymentMode})? This cannot be undone, and the order's totals will be recalculated.`)) {
      return;
    }
    setDeletingPaymentId(p.paymentId);
    try {
      const result = await deletePayment(p.paymentId, currentUser);
      setActiveOrder(result.order);
      if (editingPaymentId === p.paymentId) {
        handleCancelEditPayment();
      }
      await loadData();
      onOrderUpdated(result.order);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingPaymentId(null);
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
          fileName: docFileName.includes('.') ? docFileName : `${docFileName}.pdf`,
          fileUrl: docFileData || `https://placehold.co/600x800/e2e8f0/1e293b?text=${encodeURIComponent(docFileName)}`,
          fileSize: docFileData ? `${Math.round(docFileData.length * 0.75 / 1024)} KB` : '240 KB',
          uploadedBy: currentUser.name,
          visibleToAgent: isAgent ? true : docVisibleToAgent
        },
        currentUser
      );
      setDocFileName('');
      setDocFileData('');
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
              <span className="font-mono text-base font-bold text-amber-400">
                {displaySerialNo ? `Order No - ${displaySerialNo}` : order.orderId}
              </span>
              <span className="text-slate-400 font-mono text-xs">({activeOrder.orderNumber})</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                FY {activeOrder.financialYear}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                {activeOrder.orderType}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>{activeOrder.schoolName}</span>
              <span className="text-xs font-normal text-slate-400 font-mono">({activeOrder.schoolType})</span>
            </h2>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <StatusBadge status={activeOrder.status} type="order" />
              <StatusBadge status={activeOrder.status === 'CANCELLED' ? 'CANCELLED' : activeOrder.paymentStatus} type="payment" />
              <StatusBadge status={activeOrder.dispatchStatus} type="dispatch" />
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
            onClick={() => setActiveTab('gemStatus')}
            className={`py-3 px-3.5 font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'gemStatus'
                ? 'border-amber-500 text-amber-900 font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>GeM Status</span>
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
              {(() => {
                const inclusiveOrderValue = order.grossOrderValue || order.totalAmount || order.orderValue || 0;
                const taxableValue = Number((inclusiveOrderValue / 1.18).toFixed(2));
                const gstAmount = Number((inclusiveOrderValue - taxableValue).toFixed(2));
                const amountReceived = order.amountReceived || 0;
                const amountPending = Math.max(0, inclusiveOrderValue - amountReceived);

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="text-[11px] text-slate-500 font-medium uppercase">Order Value (Excl GST)</div>
                      <div className="text-base font-bold text-slate-900 mt-1 font-mono">
                        <CurrencyFormatter amount={taxableValue} showDecimals={true} />
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="text-[11px] text-slate-500 font-medium uppercase">GST Amount (18%)</div>
                      <div className="text-base font-bold text-slate-700 mt-1 font-mono">
                        <CurrencyFormatter amount={gstAmount} showDecimals={true} />
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="text-[11px] text-slate-500 font-medium uppercase">Order Value (Incl GST)</div>
                      <div className="text-base font-bold text-slate-900 mt-1 font-mono">
                        <CurrencyFormatter amount={inclusiveOrderValue} />
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="text-[11px] text-slate-500 font-medium uppercase">Amount Received</div>
                      <div className="text-base font-bold text-emerald-700 mt-1 font-mono">
                        <CurrencyFormatter amount={amountReceived} />
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
                      <div className="text-[11px] text-slate-500 font-medium uppercase">Amount Pending</div>
                      <div className="text-base font-bold text-amber-700 mt-1 font-mono">
                        <CurrencyFormatter amount={amountPending} />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* School, Contract, and Agent Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* School & Contact Card */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-slate-500" />
                      <span>School & Institutional Details</span>
                    </h3>
                    {!isAgent && canManageOrders && !isEditingSchool && (
                      <button
                        type="button"
                        onClick={() => {
                          setSchoolFormName(activeOrder.schoolName || '');
                          setSchoolFormPhone(activeOrder.schoolContactPhone || '');
                          setSchoolFormAddress(activeOrder.schoolAddress || '');
                          setSchoolSaveError(null);
                          setIsEditingSchool(true);
                        }}
                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Edit School Name, Phone Number, and Address"
                      >
                        <Edit2 className="w-3 h-3 text-amber-600" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>

                  {isEditingSchool ? (
                    <div className="space-y-3 text-xs bg-amber-50/40 p-3.5 rounded-lg border border-amber-200 animate-in fade-in duration-150">
                      <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 text-amber-900">
                        <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                        <span>Edit School Contact Details</span>
                      </div>

                      {schoolSaveError && (
                        <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                          {schoolSaveError}
                        </div>
                      )}

                      <div>
                        <label className="text-slate-600 font-semibold block mb-1">
                          School Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={schoolFormName}
                          onChange={(e) => setSchoolFormName(e.target.value)}
                          placeholder="Enter School Name"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          disabled={isSavingSchool}
                        />
                      </div>

                      <div>
                        <label className="text-slate-600 font-semibold block mb-1">
                          School Phone Number
                        </label>
                        <input
                          type="text"
                          value={schoolFormPhone}
                          onChange={(e) => setSchoolFormPhone(e.target.value)}
                          placeholder="e.g. +91 98765 43210"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          disabled={isSavingSchool}
                        />
                      </div>

                      <div>
                        <label className="text-slate-600 font-semibold block mb-1">
                          School Address
                        </label>
                        <textarea
                          value={schoolFormAddress}
                          onChange={(e) => setSchoolFormAddress(e.target.value)}
                          placeholder="Full school address, district, state"
                          rows={2}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          disabled={isSavingSchool}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-slate-600 font-semibold block mb-1">Institution Type</label>
                          <select
                            value={schoolFormType}
                            onChange={(e) => setSchoolFormType(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            disabled={isSavingSchool}
                          >
                            <option value="Kendriya Vidyalaya">Kendriya Vidyalaya (KV)</option>
                            <option value="Jawahar Navodaya Vidyalaya">Jawahar Navodaya Vidyalaya (JNV)</option>
                            <option value="PM SHRI School">PM SHRI School</option>
                            <option value="State Government School">State Government School</option>
                            <option value="Government School">Government School</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-slate-600 font-semibold block mb-1">School Code / UDISE</label>
                          <input
                            type="text"
                            value={schoolFormCode}
                            onChange={(e) => setSchoolFormCode(e.target.value)}
                            placeholder="e.g. KV-OD-1102"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            disabled={isSavingSchool}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-slate-600 font-semibold block mb-1">State / UT</label>
                          <input
                            type="text"
                            value={schoolFormState}
                            onChange={(e) => setSchoolFormState(e.target.value)}
                            placeholder="e.g. Odisha"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            disabled={isSavingSchool}
                          />
                        </div>
                        <div>
                          <label className="text-slate-600 font-semibold block mb-1">Pin Code</label>
                          <input
                            type="text"
                            value={schoolFormPincode}
                            onChange={(e) => setSchoolFormPincode(e.target.value)}
                            placeholder="e.g. 751001"
                            maxLength={6}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            disabled={isSavingSchool}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-600 font-semibold block mb-1">Email ID</label>
                        <input
                          type="email"
                          value={schoolFormEmail}
                          onChange={(e) => setSchoolFormEmail(e.target.value)}
                          placeholder="e.g. school@navodaya.gov.in"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          disabled={isSavingSchool}
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleSaveSchoolDetails}
                          disabled={isSavingSchool}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1 shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          {isSavingSchool ? (
                            <>
                              <span className="w-3 h-3 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Save</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingSchool(false);
                            setSchoolSaveError(null);
                          }}
                          disabled={isSavingSchool}
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-medium text-xs transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px] font-medium uppercase">School Name:</span>
                        <span className="font-bold text-slate-900 text-sm">{activeOrder.schoolName}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px] font-medium uppercase">School Phone Number:</span>
                        <span className="font-mono font-medium text-slate-800 text-xs flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{activeOrder.schoolContactPhone || 'Not provided'}</span>
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px] font-medium uppercase">School Address:</span>
                        <span className="text-slate-700 text-xs flex items-start gap-1.5 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <span>{activeOrder.schoolAddress || 'Not provided'}</span>
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Institution System:</span>
                          <span className="font-medium text-slate-700">{activeOrder.schoolType}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">School Code / UDISE:</span>
                          <span className="font-mono text-slate-700">{activeOrder.schoolCode || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-400 block text-[11px]">State / UT:</span>
                          <span className="font-medium text-slate-700">{activeOrder.state || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Pin Code:</span>
                          <span className="font-mono text-slate-700">{activeOrder.schoolPincode || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-slate-400 block text-[11px]">Email ID:</span>
                        <span className="font-medium text-slate-700 break-all">{activeOrder.schoolEmail || 'Not provided'}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Contract & GeM Specifications */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span>Contract & Partner Allocation</span>
                    </h3>
                    {!isAgent && canManageOrders && !isEditingContract && (
                      <button
                        type="button"
                        onClick={() => setIsEditingContract(true)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Edit Contract Number, PO Number, Date, Category, Company, and Order Value"
                      >
                        <Edit2 className="w-3 h-3 text-amber-600" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>

                  {isEditingContract ? (
                    <div className="space-y-3 text-xs bg-amber-50/40 p-3.5 rounded-lg border border-amber-200 animate-in fade-in duration-150">
                      <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 text-amber-900">
                        <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                        <span>Edit Contract & Commercial Details</span>
                      </div>

                      {contractSaveError && (
                        <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                          {contractSaveError}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-slate-600 font-semibold block mb-1">
                            Contract / Order No <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={contractFormOrderNumber}
                            onChange={(e) => setContractFormOrderNumber(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            disabled={isSavingContract}
                          />
                        </div>
                        <div>
                          <label className="text-slate-600 font-semibold block mb-1">GeM PO Number</label>
                          <input
                            type="text"
                            value={contractFormPoNumber}
                            onChange={(e) => setContractFormPoNumber(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            disabled={isSavingContract}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-slate-600 font-semibold block mb-1">Order Date</label>
                          <input
                            type="date"
                            value={contractFormOrderDate}
                            onChange={(e) => setContractFormOrderDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            disabled={isSavingContract}
                          />
                        </div>
                        <div>
                          <label className="text-slate-600 font-semibold block mb-1">
                            Category / Package <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={contractFormCategory}
                            onChange={(e) => setContractFormCategory(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            disabled={isSavingContract}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-slate-600 font-semibold block mb-1">
                            Company <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={contractFormCompany}
                            onChange={(e) => setContractFormCompany(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            disabled={isSavingContract}
                          >
                            <option value="" disabled>Select company...</option>
                            {companies.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-slate-600 font-semibold block mb-1">
                            Order Value (₹) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={contractFormOrderValue || ''}
                            onChange={(e) => setContractFormOrderValue(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            disabled={isSavingContract}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleSaveContractDetails}
                          disabled={isSavingContract}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1 shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          {isSavingContract ? (
                            <>
                              <span className="w-3 h-3 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Save</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingContract(false);
                            setContractSaveError(null);
                          }}
                          disabled={isSavingContract}
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-medium text-xs transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Contract / Order No:</span>
                        <span className="font-mono font-semibold text-slate-800">{activeOrder.orderNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">GeM PO Number:</span>
                        <span className="font-mono text-slate-700">{activeOrder.purchaseOrderNumber || 'GEMC-5116877'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Order Date:</span>
                        <span className="font-mono text-slate-700">{activeOrder.orderDate}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Category / Package:</span>
                        <span className="font-medium text-slate-800">{activeOrder.category}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Company:</span>
                        <span className="font-semibold text-slate-800">{activeOrder.company || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Order Value:</span>
                        <span className="font-mono font-bold text-slate-900">
                          <CurrencyFormatter amount={activeOrder.orderValue || 0} />
                        </span>
                      </div>
                    </div>

                    {/* Assigned Partner Selection */}
                    <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-600 font-semibold text-xs flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                          <span>Assigned Partner</span>
                        </label>
                        {activeOrder.agentCommissionPercentage !== undefined && (
                          <span className="text-[11px] text-slate-500 font-mono">
                            Margin: <strong className="text-amber-800">{activeOrder.agentCommissionPercentage}%</strong>
                          </span>
                        )}
                      </div>

                      {!isAgent && canManageOrders ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedAgentId}
                              onChange={(e) => {
                                setSelectedAgentId(e.target.value);
                                setAgentSaveSuccess(false);
                              }}
                              className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                              disabled={isSavingAgent}
                            >
                              <option value="AGT-DIRECT">Direct</option>
                              {availableAgents.filter(agt => agt.agentId !== 'AGT-DIRECT').map(agt => (
                                <option key={agt.agentId} value={agt.agentId}>
                                  {agt.name} ({agt.agentCode})
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={handleSaveAgent}
                              disabled={isSavingAgent || selectedAgentId === (activeOrder.agentId || 'AGT-DIRECT')}
                              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors shrink-0 flex items-center gap-1 shadow-xs ${
                                selectedAgentId !== (activeOrder.agentId || 'AGT-DIRECT') && !isSavingAgent
                                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                              }`}
                              title={selectedAgentId !== (activeOrder.agentId || 'AGT-DIRECT') ? "Save new partner assignment" : "Select a partner to reassign"}
                            >
                              {isSavingAgent ? (
                                <>
                                  <span className="w-3 h-3 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                                  <span>Saving...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Save Partner</span>
                                </>
                              )}
                            </button>
                          </div>

                          {agentSaveSuccess && (
                            <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>Partner successfully reassigned and saved!</span>
                            </div>
                          )}

                          {agentSaveError && (
                            <div className="text-[11px] text-rose-600 font-medium">
                              {agentSaveError}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                            {(activeOrder.agentName || 'A').charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-xs">{activeOrder.agentName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{activeOrder.agentCode}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Invoice Number:</span>
                        <span className="font-mono text-slate-800">{activeOrder.invoiceNumber || 'Pending Generation'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Courier / Docket:</span>
                        <span className="font-mono text-slate-800">{activeOrder.docketNumber || 'Dispatch Pending'}</span>
                      </div>
                    </div>
                  </div>
                  )}
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
                              <span className="text-emerald-600 font-medium">Visible to Partner</span>
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

          {/* TAB: GEM STATUS */}
          {activeTab === 'gemStatus' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>GeM Status</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">Fast Upload & File Verification</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {/* Company Tax Invoice Tile */}
                  <div className={`p-3.5 rounded-xl border transition-colors ${companyInvoiceUrl ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50/70 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Tax Invoice</span>
                      </span>
                      {companyInvoiceUrl ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Uploaded</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Pending</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2.5 truncate" title={companyInvoiceFileName || 'Company Official Tax Invoice Copy'}>
                      {companyInvoiceFileName || 'Company Official Tax Invoice Copy'}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {companyInvoiceUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewDoc({
                                url: companyInvoiceUrl,
                                title: 'Company Tax Invoice',
                                fileName: companyInvoiceFileName || 'Tax_Invoice.pdf'
                              })
                            }
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-800 flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3 h-3 text-emerald-700" />
                            <span>Preview</span>
                          </button>
                          <a
                            href={companyInvoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            download={companyInvoiceFileName || 'Tax_Invoice.pdf'}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-800 flex items-center gap-1 transition-colors"
                          >
                            <Download className="w-3 h-3 text-slate-600" />
                            <span>Download</span>
                          </a>
                        </>
                      )}
                      <label className="cursor-pointer px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors">
                        <UploadCloud className="w-3 h-3" />
                        <span>{companyInvoiceUrl ? 'Replace' : 'Upload'}</span>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleQuickDocUpload('companyInvoice', file);
                          }}
                          className="hidden"
                        />
                      </label>
                      <label className="cursor-pointer p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-100 rounded transition-colors" title="Scan with Camera">
                        <Camera className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleQuickDocUpload('companyInvoice', file);
                          }}
                          className="hidden"
                        />
                      </label>
                      {companyInvoiceUrl && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuickDoc('companyInvoice')}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Tax Invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* GeM Portal Invoice Tile */}
                  <div className={`p-3.5 rounded-xl border transition-colors ${gemInvoiceUrl ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50/70 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-blue-700" />
                        <span>GeM Portal Invoice</span>
                      </span>
                      {gemInvoiceUrl ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Uploaded</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Pending</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2.5 truncate" title={gemInvoiceFileName || 'Government e-Marketplace Invoice'}>
                      {gemInvoiceFileName || 'Government e-Marketplace Invoice'}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {gemInvoiceUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewDoc({
                                url: gemInvoiceUrl,
                                title: 'GeM Portal Invoice',
                                fileName: gemInvoiceFileName || 'GeM_Invoice.pdf'
                              })
                            }
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-800 flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3 h-3 text-blue-700" />
                            <span>Preview</span>
                          </button>
                          <a
                            href={gemInvoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            download={gemInvoiceFileName || 'GeM_Invoice.pdf'}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-800 flex items-center gap-1 transition-colors"
                          >
                            <Download className="w-3 h-3 text-slate-600" />
                            <span>Download</span>
                          </a>
                        </>
                      )}
                      <label className="cursor-pointer px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors">
                        <UploadCloud className="w-3 h-3" />
                        <span>{gemInvoiceUrl ? 'Replace' : 'Upload'}</span>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleQuickDocUpload('gemInvoice', file);
                          }}
                          className="hidden"
                        />
                      </label>
                      <label className="cursor-pointer p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors" title="Scan with Camera">
                        <Camera className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleQuickDocUpload('gemInvoice', file);
                          }}
                          className="hidden"
                        />
                      </label>
                      {gemInvoiceUrl && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuickDoc('gemInvoice')}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete GeM Invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Proof of Delivery (POD Copy) Tile */}
                  <div className={`p-3.5 rounded-xl border transition-colors ${podCopyUrl ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50/70 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Proof of Delivery (POD)</span>
                      </span>
                      {podCopyUrl ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Uploaded</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Pending</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2.5 truncate" title={podCopyFileName || 'Signed School Delivery Challan'}>
                      {podCopyFileName || 'Signed School Delivery Challan'}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {podCopyUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewDoc({
                                url: podCopyUrl,
                                title: 'Proof of Delivery (POD Signed)',
                                fileName: podCopyFileName || 'POD_Signed.pdf'
                              })
                            }
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-800 flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3 h-3 text-emerald-700" />
                            <span>Preview</span>
                          </button>
                          <a
                            href={podCopyUrl}
                            target="_blank"
                            rel="noreferrer"
                            download={podCopyFileName || 'POD_Signed.pdf'}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-800 flex items-center gap-1 transition-colors"
                          >
                            <Download className="w-3 h-3 text-slate-600" />
                            <span>Download</span>
                          </a>
                        </>
                      )}
                      <label className="cursor-pointer px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors">
                        <UploadCloud className="w-3 h-3" />
                        <span>{podCopyUrl ? 'Replace' : 'Upload'}</span>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={handlePodFileUpload}
                          className="hidden"
                        />
                      </label>
                      <label className="cursor-pointer p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-100 rounded transition-colors" title="Scan with Camera">
                        <Camera className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePodFileUpload}
                          className="hidden"
                        />
                      </label>
                      {podCopyUrl && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuickDoc('podCopy')}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete POD"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
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
                  <StatusBadge status={activeOrder.dispatchStatus} type="dispatch" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Courier / Transporter</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                      {courierName || 'Not Assigned'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Docket / Tracking Number</span>
                    <div className="mt-1">
                      <TrackingLink courierName={courierName} docketNumber={trackingNumber} />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Carton Boxes</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                      {numberOfBoxes || '1'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Date of Dispatch:</span>
                    <span className="font-mono text-slate-700">{dispatchDate || 'Pending'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Expected Delivery Date:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {expectedDeliveryDate || 'Pending'}
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

                    {/* Consignment Note (CN / LR) Attachment Field */}
                    <div className="bg-purple-50/60 p-3.5 rounded-xl border border-purple-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-purple-950 font-bold text-xs flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-purple-700" />
                          <span>Consignment Note (CN) / Transporter LR Copy</span>
                        </label>
                        {cnCopyUrl ? (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>CN Attached</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-purple-600 font-medium">Upload PDF or scanned receipt</span>
                        )}
                      </div>

                      {cnCopyUrl ? (
                        <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-purple-200 gap-2">
                          <div className="flex items-center gap-2 overflow-hidden min-w-0">
                            <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                            <span className="text-xs font-semibold text-slate-800 truncate">
                              {cnCopyFileName || 'Consignment_Note_Copy.pdf'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewDoc({
                                  url: cnCopyUrl,
                                  title: 'Consignment Note (CN Copy)',
                                  fileName: cnCopyFileName || 'Consignment_Note_Copy.pdf'
                                })
                              }
                              className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-semibold rounded text-[11px] flex items-center gap-1 transition-colors"
                            >
                              <Eye className="w-3 h-3 text-purple-700" />
                              <span>Preview</span>
                            </button>
                            <a
                              href={cnCopyUrl}
                              target="_blank"
                              rel="noreferrer"
                              download={cnCopyFileName || 'CN_Copy.pdf'}
                              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded text-[11px] flex items-center gap-1 transition-colors"
                            >
                              <Download className="w-3 h-3 text-slate-600" />
                              <span>Download</span>
                            </a>
                            <label className="cursor-pointer px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition-colors">
                              <span>Replace</span>
                              <input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={handleCnFileUpload}
                                className="hidden"
                              />
                            </label>
                            <label className="cursor-pointer p-1 text-slate-500 hover:text-purple-700 hover:bg-purple-100 rounded transition-colors" title="Scan with Camera">
                              <Camera className="w-3.5 h-3.5" />
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleCnFileUpload}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuickDoc('cnCopy')}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Consignment Note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-purple-300 rounded-lg hover:bg-purple-100/50 cursor-pointer transition-colors text-center bg-white">
                            <UploadCloud className="w-5 h-5 text-purple-600 mb-1" />
                            <span className="text-xs font-semibold text-purple-900">
                              Upload Consignment Note (CN Copy)
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              Supports PDF, JPG, PNG scanned receipt
                            </span>
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              onChange={handleCnFileUpload}
                              className="hidden"
                            />
                          </label>
                          <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-purple-300 rounded-lg hover:bg-purple-100/50 cursor-pointer transition-colors text-center bg-purple-50/30">
                            <Camera className="w-5 h-5 text-purple-700 mb-1" />
                            <span className="text-xs font-semibold text-purple-950">
                              Scan with Camera
                            </span>
                            <span className="text-[10px] text-purple-600 mt-0.5">
                              Snap photo directly from device
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handleCnFileUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmittingDispatch}
                        className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50"
                      >
                        {isSubmittingDispatch ? 'Saving Dispatch...' : 'Save & Notify Partner'}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                    {/* Proof of Delivery (POD) Attachment Field */}
                    <div className="bg-white p-3.5 rounded-xl border border-emerald-300 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-emerald-950 font-bold text-xs flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Proof of Delivery (POD) / Signed Delivery Slip</span>
                        </label>
                        {podCopyUrl ? (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>POD Attached</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-medium">Upload signed receiving copy</span>
                        )}
                      </div>

                      {podCopyUrl ? (
                        <div className="flex items-center justify-between bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200 gap-2">
                          <div className="flex items-center gap-2 overflow-hidden min-w-0">
                            <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="text-xs font-semibold text-slate-800 truncate">
                              {podCopyFileName || 'Proof_Of_Delivery_Signed.pdf'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewDoc({
                                  url: podCopyUrl,
                                  title: 'Proof of Delivery (POD Signed)',
                                  fileName: podCopyFileName || 'Proof_Of_Delivery_Signed.pdf'
                                })
                              }
                              className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-semibold rounded text-[11px] flex items-center gap-1 transition-colors"
                            >
                              <Eye className="w-3 h-3 text-emerald-700" />
                              <span>Preview</span>
                            </button>
                            <a
                              href={podCopyUrl}
                              target="_blank"
                              rel="noreferrer"
                              download={podCopyFileName || 'POD_Signed.pdf'}
                              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded text-[11px] flex items-center gap-1 transition-colors"
                            >
                              <Download className="w-3 h-3 text-slate-600" />
                              <span>Download</span>
                            </a>
                            <label className="cursor-pointer px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-emerald-200 rounded text-[11px] font-medium transition-colors">
                              <span>Replace</span>
                              <input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={handlePodFileUpload}
                                className="hidden"
                              />
                            </label>
                            <label className="cursor-pointer p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-100 rounded transition-colors" title="Scan with Camera">
                              <Camera className="w-3.5 h-3.5" />
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handlePodFileUpload}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuickDoc('podCopy')}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Delete POD"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-emerald-300 rounded-lg hover:bg-emerald-50/70 cursor-pointer transition-colors text-center bg-emerald-50/30">
                            <UploadCloud className="w-5 h-5 text-emerald-600 mb-1" />
                            <span className="text-xs font-semibold text-emerald-950">
                              Upload Proof of Delivery (POD Copy)
                            </span>
                            <span className="text-[10px] text-slate-500 mt-0.5">
                              Supports scanned PDF, JPG, PNG with signature
                            </span>
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              onChange={handlePodFileUpload}
                              className="hidden"
                            />
                          </label>
                          <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-emerald-300 rounded-lg hover:bg-emerald-50/70 cursor-pointer transition-colors text-center bg-emerald-50/30">
                            <Camera className="w-5 h-5 text-emerald-700 mb-1" />
                            <span className="text-xs font-semibold text-emerald-950">
                              Scan with Camera
                            </span>
                            <span className="text-[10px] text-emerald-600 mt-0.5">
                              Capture receiving slip photo directly
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handlePodFileUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
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
                    School Payment Status:{' '}
                    <span className={activeOrder.status === 'CANCELLED' ? 'text-rose-600' : 'text-amber-600'}>
                      {activeOrder.status === 'CANCELLED' ? 'CANCELLED' : activeOrder.paymentStatus.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block">Total Invoiced (Incl. GST)</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      <CurrencyFormatter amount={activeOrder.grossOrderValue || activeOrder.totalAmount || activeOrder.orderValue} />
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block">Total Received</span>
                    <span className="text-base font-bold font-mono text-emerald-700">
                      <CurrencyFormatter amount={activeOrder.amountReceived || 0} />
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block">Amount Pending</span>
                    {activeOrder.status === 'CANCELLED' ? (
                      <span className="text-base font-bold text-rose-600">CANCELLED</span>
                    ) : (
                      <span className="text-base font-bold font-mono text-amber-700">
                        <CurrencyFormatter
                          amount={activeOrder.amountPending ?? Math.max(0, (activeOrder.grossOrderValue || activeOrder.totalAmount || activeOrder.orderValue) - (activeOrder.amountReceived || 0))}
                        />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Record Payment Form (Accounts & Admins only) */}
              {!isAgent && (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
                    <span>{editingPaymentId ? 'Edit Recorded Payment' : 'Record Payment Received from School'}</span>
                    {editingPaymentId && (
                      <span className="text-[10px] font-bold uppercase text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        Editing
                      </span>
                    )}
                  </h3>

                  <form onSubmit={handleAddPayment} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Amount (₹)</label>
                        <input
                          type="number"
                          required
                          min={0.00001}
                          step={0.00001}
                          value={paymentAmount || ''}
                          onChange={(e) => {
                            // Repeatedly clicking the spinner arrows accumulates
                            // binary floating-point drift (e.g. 15000 ->
                            // 15000.864443172...) - round back to 5 decimal
                            // places on every change to keep that in check.
                            const raw = Number(e.target.value);
                            setPaymentAmount(Number.isFinite(raw) ? Math.round(raw * 100000) / 100000 : 0);
                          }}
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

                    <div className="flex justify-end gap-2">
                      {editingPaymentId && (
                        <button
                          type="button"
                          onClick={handleCancelEditPayment}
                          disabled={isSubmittingPayment}
                          className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={isSubmittingPayment}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm disabled:opacity-50"
                      >
                        {isSubmittingPayment
                          ? (editingPaymentId ? 'Updating...' : 'Recording...')
                          : (editingPaymentId ? 'Update Payment' : 'Credit Payment to Account')}
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
                      {!isAgent && <th className="px-4 py-2.5 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={isAgent ? 5 : 6} className="py-8 text-center text-slate-400">
                          No payment credits logged for this order yet.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr
                          key={p.paymentId}
                          className={`hover:bg-slate-50/60 ${editingPaymentId === p.paymentId ? 'bg-amber-50/70' : ''}`}
                        >
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
                          {!isAgent && (
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleEditPaymentClick(p)}
                                  disabled={deletingPaymentId === p.paymentId}
                                  title="Edit this payment"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-800 disabled:opacity-50"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePayment(p)}
                                  disabled={deletingPaymentId === p.paymentId}
                                  title="Delete this payment"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 disabled:opacity-50"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>{deletingPaymentId === p.paymentId ? 'Deleting...' : 'Delete'}</span>
                                </button>
                              </div>
                            </td>
                          )}
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
              {/* Critical Compliance Documents Quick Vault */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Essential Compliance & Billing Vault</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">Fast Upload & File Verification</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {/* GeM Order Copy Tile */}
                  <div className={`p-3.5 rounded-xl border transition-colors ${gemOrderCopyUrl ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50/70 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-amber-700" />
                        <span>GeM Order Copy</span>
                      </span>
                      {gemOrderCopyUrl ? (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">Uploaded</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Pending</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2.5 truncate" title={gemOrderCopyFileName || 'GeM Contract & Official Sanction Order'}>
                      {gemOrderCopyFileName || 'GeM Contract & Official Sanction Order'}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {gemOrderCopyUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewDoc({
                                url: gemOrderCopyUrl,
                                title: 'GeM Order Copy / Contract',
                                fileName: gemOrderCopyFileName || 'GeM_Order_Copy.pdf'
                              })
                            }
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-800 flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3 h-3 text-amber-700" />
                            <span>Preview</span>
                          </button>
                          <a
                            href={gemOrderCopyUrl}
                            target="_blank"
                            rel="noreferrer"
                            download={gemOrderCopyFileName || 'GeM_Order_Copy.pdf'}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-800 flex items-center gap-1 transition-colors"
                          >
                            <Download className="w-3 h-3 text-slate-600" />
                            <span>Download</span>
                          </a>
                        </>
                      )}
                      <label className="cursor-pointer px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors">
                        <UploadCloud className="w-3 h-3" />
                        <span>{gemOrderCopyUrl ? 'Replace' : 'Upload'}</span>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleQuickDocUpload('gemOrderCopy', file);
                          }}
                          className="hidden"
                        />
                      </label>
                      <label className="cursor-pointer p-1 text-slate-500 hover:text-amber-700 hover:bg-amber-100 rounded transition-colors" title="Scan with Camera">
                        <Camera className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleQuickDocUpload('gemOrderCopy', file);
                          }}
                          className="hidden"
                        />
                      </label>
                      {gemOrderCopyUrl && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuickDoc('gemOrderCopy')}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete GeM Order Copy"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Company Tax Invoice Tile */}
                  <div className={`p-3.5 rounded-xl border transition-colors ${companyInvoiceUrl ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50/70 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Tax Invoice</span>
                      </span>
                      {companyInvoiceUrl ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Uploaded</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Pending</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2.5 truncate" title={companyInvoiceFileName || 'Company Official Tax Invoice Copy'}>
                      {companyInvoiceFileName || 'Company Official Tax Invoice Copy'}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {companyInvoiceUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewDoc({
                                url: companyInvoiceUrl,
                                title: 'Company Tax Invoice',
                                fileName: companyInvoiceFileName || 'Tax_Invoice.pdf'
                              })
                            }
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-800 flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3 h-3 text-emerald-700" />
                            <span>Preview</span>
                          </button>
                          <a
                            href={companyInvoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            download={companyInvoiceFileName || 'Tax_Invoice.pdf'}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-800 flex items-center gap-1 transition-colors"
                          >
                            <Download className="w-3 h-3 text-slate-600" />
                            <span>Download</span>
                          </a>
                        </>
                      )}
                      <label className="cursor-pointer px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors">
                        <UploadCloud className="w-3 h-3" />
                        <span>{companyInvoiceUrl ? 'Replace' : 'Upload'}</span>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleQuickDocUpload('companyInvoice', file);
                          }}
                          className="hidden"
                        />
                      </label>
                      <label className="cursor-pointer p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-100 rounded transition-colors" title="Scan with Camera">
                        <Camera className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleQuickDocUpload('companyInvoice', file);
                          }}
                          className="hidden"
                        />
                      </label>
                      {companyInvoiceUrl && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuickDoc('companyInvoice')}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Tax Invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* GeM Portal Invoice Tile */}
                  <div className={`p-3.5 rounded-xl border transition-colors ${gemInvoiceUrl ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50/70 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-blue-700" />
                        <span>GeM Portal Invoice</span>
                      </span>
                      {gemInvoiceUrl ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Uploaded</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Pending</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2.5 truncate" title={gemInvoiceFileName || 'Government e-Marketplace Invoice'}>
                      {gemInvoiceFileName || 'Government e-Marketplace Invoice'}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {gemInvoiceUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewDoc({
                                url: gemInvoiceUrl,
                                title: 'GeM Portal Invoice',
                                fileName: gemInvoiceFileName || 'GeM_Invoice.pdf'
                              })
                            }
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-800 flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3 h-3 text-blue-700" />
                            <span>Preview</span>
                          </button>
                          <a
                            href={gemInvoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            download={gemInvoiceFileName || 'GeM_Invoice.pdf'}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-800 flex items-center gap-1 transition-colors"
                          >
                            <Download className="w-3 h-3 text-slate-600" />
                            <span>Download</span>
                          </a>
                        </>
                      )}
                      <label className="cursor-pointer px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors">
                        <UploadCloud className="w-3 h-3" />
                        <span>{gemInvoiceUrl ? 'Replace' : 'Upload'}</span>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleQuickDocUpload('gemInvoice', file);
                          }}
                          className="hidden"
                        />
                      </label>
                      <label className="cursor-pointer p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors" title="Scan with Camera">
                        <Camera className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleQuickDocUpload('gemInvoice', file);
                          }}
                          className="hidden"
                        />
                      </label>
                      {gemInvoiceUrl && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuickDoc('gemInvoice')}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete GeM Invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* E-Way Bill Tile */}
                  <div className={`p-3.5 rounded-xl border transition-colors ${ewayBillUrl ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50/70 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-indigo-700" />
                        <span>E-Way Bill (EWB)</span>
                      </span>
                      {ewayBillUrl ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Uploaded</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Pending</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2.5 truncate" title={ewayBillFileName || 'Inter-State GST Transit E-Way Bill'}>
                      {ewayBillFileName || 'Inter-State GST Transit E-Way Bill'}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {ewayBillUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewDoc({
                                url: ewayBillUrl,
                                title: 'E-Way Bill (EWB)',
                                fileName: ewayBillFileName || 'EWay_Bill.pdf'
                              })
                            }
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-800 flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3 h-3 text-indigo-700" />
                            <span>Preview</span>
                          </button>
                          <a
                            href={ewayBillUrl}
                            target="_blank"
                            rel="noreferrer"
                            download={ewayBillFileName || 'EWay_Bill.pdf'}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-800 flex items-center gap-1 transition-colors"
                          >
                            <Download className="w-3 h-3 text-slate-600" />
                            <span>Download</span>
                          </a>
                        </>
                      )}
                      <label className="cursor-pointer px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors">
                        <UploadCloud className="w-3 h-3" />
                        <span>{ewayBillUrl ? 'Replace' : 'Upload'}</span>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleQuickDocUpload('ewayBill', file);
                          }}
                          className="hidden"
                        />
                      </label>
                      <label className="cursor-pointer p-1 text-slate-500 hover:text-indigo-700 hover:bg-indigo-100 rounded transition-colors" title="Scan with Camera">
                        <Camera className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleQuickDocUpload('ewayBill', file);
                          }}
                          className="hidden"
                        />
                      </label>
                      {ewayBillUrl && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuickDoc('ewayBill')}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete E-Way Bill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Consignment Note (CN Copy) Tile */}
                  <div className={`p-3.5 rounded-xl border transition-colors ${cnCopyUrl ? 'bg-purple-50/60 border-purple-200' : 'bg-slate-50/70 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        <Paperclip className="w-3.5 h-3.5 text-purple-700" />
                        <span>Consignment Note (CN)</span>
                      </span>
                      {cnCopyUrl ? (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">Uploaded</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Pending</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2.5 truncate" title={cnCopyFileName || 'Courier / Logistics Transporter Receipt'}>
                      {cnCopyFileName || 'Courier / Logistics Transporter Receipt'}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {cnCopyUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewDoc({
                                url: cnCopyUrl,
                                title: 'Consignment Note (CN Copy)',
                                fileName: cnCopyFileName || 'CN_Copy.pdf'
                              })
                            }
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-800 flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3 h-3 text-purple-700" />
                            <span>Preview</span>
                          </button>
                          <a
                            href={cnCopyUrl}
                            target="_blank"
                            rel="noreferrer"
                            download={cnCopyFileName || 'CN_Copy.pdf'}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-800 flex items-center gap-1 transition-colors"
                          >
                            <Download className="w-3 h-3 text-slate-600" />
                            <span>Download</span>
                          </a>
                        </>
                      )}
                      <label className="cursor-pointer px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors">
                        <UploadCloud className="w-3 h-3" />
                        <span>{cnCopyUrl ? 'Replace' : 'Upload'}</span>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={handleCnFileUpload}
                          className="hidden"
                        />
                      </label>
                      <label className="cursor-pointer p-1 text-slate-500 hover:text-purple-700 hover:bg-purple-100 rounded transition-colors" title="Scan with Camera">
                        <Camera className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleCnFileUpload}
                          className="hidden"
                        />
                      </label>
                      {cnCopyUrl && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuickDoc('cnCopy')}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Consignment Note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Proof of Delivery (POD Copy) Tile */}
                  <div className={`p-3.5 rounded-xl border transition-colors ${podCopyUrl ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50/70 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Proof of Delivery (POD)</span>
                      </span>
                      {podCopyUrl ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Uploaded</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Pending</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2.5 truncate" title={podCopyFileName || 'Signed School Delivery Challan'}>
                      {podCopyFileName || 'Signed School Delivery Challan'}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {podCopyUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewDoc({
                                url: podCopyUrl,
                                title: 'Proof of Delivery (POD Signed)',
                                fileName: podCopyFileName || 'POD_Signed.pdf'
                              })
                            }
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-800 flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3 h-3 text-emerald-700" />
                            <span>Preview</span>
                          </button>
                          <a
                            href={podCopyUrl}
                            target="_blank"
                            rel="noreferrer"
                            download={podCopyFileName || 'POD_Signed.pdf'}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-800 flex items-center gap-1 transition-colors"
                          >
                            <Download className="w-3 h-3 text-slate-600" />
                            <span>Download</span>
                          </a>
                        </>
                      )}
                      <label className="cursor-pointer px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors">
                        <UploadCloud className="w-3 h-3" />
                        <span>{podCopyUrl ? 'Replace' : 'Upload'}</span>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={handlePodFileUpload}
                          className="hidden"
                        />
                      </label>
                      <label className="cursor-pointer p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-100 rounded transition-colors" title="Scan with Camera">
                        <Camera className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePodFileUpload}
                          className="hidden"
                        />
                      </label>
                      {podCopyUrl && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuickDoc('podCopy')}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete POD"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* GeM CRAC Receipt Tile */}
                  <div className="p-3.5 rounded-xl border bg-slate-50/70 border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                        <span>GeM CRAC Acceptance</span>
                      </span>
                      <span className="text-[10px] text-slate-400">Official</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2.5">
                      Consignee Receipt & Acceptance Certificate
                    </p>
                    <div className="flex items-center gap-1.5">
                      <label className="cursor-pointer px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors">
                        <UploadCloud className="w-3 h-3" />
                        <span>Attach CRAC</span>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleQuickDocUpload('GeM Acceptance Copy', file);
                          }}
                          className="hidden"
                        />
                      </label>
                      <label className="cursor-pointer p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors" title="Scan with Camera">
                        <Camera className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleQuickDocUpload('GeM Acceptance Copy', file);
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* General Document upload card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
                  Upload Additional Document or File
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
                        <option value="GeM Order Copy">GeM Order Copy / Contract</option>
                        <option value="Purchase Order">Purchase Order / Work Order</option>
                        <option value="Invoice">Tax Invoice / GeM Invoice</option>
                        <option value="Dispatch Receipt">Dispatch Receipt / Courier LR</option>
                        <option value="Delivery Challan">Delivery Challan / Proof of Delivery</option>
                        <option value="GeM Acceptance Copy">GeM Consignee Receipt (CRAC)</option>
                        <option value="Quotation">Quotation / Internal Spec</option>
                        <option value="Payment Proof">Payment Proof / Bank Receipt</option>
                        <option value="Inspection Report">Installation / Inspection Report</option>
                        <option value="Other">Other Miscellaneous Document</option>
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

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Select File or Camera Scan</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (!docFileName) setDocFileName(file.name.replace(/\.[^/.]+$/, ''));
                              const reader = new FileReader();
                              reader.onload = () => {
                                setDocFileData(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200"
                        />
                        <label className="cursor-pointer p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-colors" title="Scan with Camera">
                          <Camera className="w-4 h-4" />
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (!docFileName) setDocFileName(`Scanned_${Date.now()}`);
                                const reader = new FileReader();
                                reader.onload = () => {
                                  setDocFileData(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {!isAgent && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={docVisibleToAgent}
                          onChange={(e) => setDocVisibleToAgent(e.target.checked)}
                          className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                        />
                        <span className="text-slate-700 font-medium">Visible to Regional Partner</span>
                      </label>
                    )}
                    <button
                      type="submit"
                      disabled={isUploadingDoc}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50 ml-auto transition-colors"
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
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-slate-600 shrink-0 border border-amber-200/60">
                          <FileText className="w-5 h-5 text-amber-700" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 truncate" title={doc.fileName}>{doc.fileName}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {doc.documentType} {doc.fileSize ? `• ${doc.fileSize}` : ''}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-1">
                            Uploaded by {doc.uploadedBy} on {new Date(doc.uploadedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewDoc({
                              url: doc.fileUrl,
                              title: doc.documentType || 'Order Document',
                              fileName: doc.fileName
                            })
                          }
                          className="p-1.5 rounded-lg text-slate-600 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                          title="Preview Document"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          download={doc.fileName || 'document.pdf'}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition-colors"
                          title="Download Document"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteUploadedDocument(doc.documentId)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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

      {/* Interactive In-Modal Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="min-w-0 pr-4">
                <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">{previewDoc.title}</div>
                <div className="text-sm font-bold text-white truncate">{previewDoc.fileName}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewDoc.url}
                  download={previewDoc.fileName}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto bg-slate-100 p-4 flex items-center justify-center min-h-[420px]">
              {previewDoc.url.startsWith('data:image/') ||
              previewDoc.url.endsWith('.png') ||
              previewDoc.url.endsWith('.jpg') ||
              previewDoc.url.endsWith('.jpeg') ||
              previewDoc.url.endsWith('.webp') ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.fileName}
                  className="max-w-full max-h-[75vh] object-contain rounded-lg shadow border border-slate-200"
                />
              ) : (
                <div className="w-full h-full min-h-[550px] bg-white rounded-xl shadow border border-slate-200 overflow-hidden flex flex-col">
                  <iframe
                    src={previewDoc.url}
                    title={previewDoc.fileName}
                    className="w-full flex-1 border-0"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
