import React, { useState } from 'react';
import { PurchaseOrder, Vendor, Material, Order, UserProfile, POItem, POStatus } from '../../types';
import { savePurchaseOrder, deletePurchaseOrder } from '../../services/dataService';
import { ReceiveGoodsModal } from './ReceiveGoodsModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import {
  FileText,
  Plus,
  Search,
  Filter,
  PackageCheck,
  Printer,
  Send,
  Building2,
  Calendar,
  IndianRupee,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  X,
  PlusCircle,
  Trash2,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

interface Props {
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
  materials: Material[];
  orders: Order[];
  currentUser?: UserProfile;
  onRefresh: () => void;
  preSelectedVendorId?: string;
  preSelectedMaterials?: { materialId: string; requiredQty: number }[];
}

export const PurchaseOrderManager: React.FC<Props> = ({
  purchaseOrders,
  vendors,
  materials,
  orders,
  currentUser,
  onRefresh,
  preSelectedVendorId,
  preSelectedMaterials
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | POStatus>('ALL');

  // Receive goods modal
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);

  // Printable PO modal
  const [viewingPrintPO, setViewingPrintPO] = useState<PurchaseOrder | null>(null);

  // Create / Edit PO Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);

  // Form State
  const [vendorId, setVendorId] = useState(preSelectedVendorId || vendors[0]?.vendorId || '');
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [deliveryAddress, setDeliveryAddress] = useState(
    'Funscholar Central Logistics & Kit Assembly Hub, Industrial Area Phase II, New Delhi 110020'
  );
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days from receipt');
  const [notes, setNotes] = useState('');
  const [linkedSalesOrderIds, setLinkedSalesOrderIds] = useState<string[]>([]);
  const [items, setItems] = useState<POItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deletePurchaseOrder(deleteTarget.poId, currentUser);
      setDeleteTarget(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete purchase order.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenNew = () => {
    setEditingPO(null);
    const yr = new Date().getFullYear().toString().slice(-2);
    const nextYr = (parseInt(yr) + 1).toString();
    const count = purchaseOrders.length + 1;
    setPoNumber(`PO/FS/${yr}-${nextYr}/${count.toString().padStart(3, '0')}`);
    setPoDate(new Date().toISOString().split('T')[0]);
    setExpectedDeliveryDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setVendorId(preSelectedVendorId || vendors[0]?.vendorId || '');
    setLinkedSalesOrderIds([]);
    setNotes('');

    // Pre-populate if passed
    if (preSelectedMaterials && preSelectedMaterials.length > 0) {
      const initialItems: POItem[] = preSelectedMaterials.map(pm => {
        const mat = materials.find(m => m.materialId === pm.materialId);
        const unitPrice = mat?.purchasePrice || 0;
        const qty = pm.requiredQty;
        const lineTotal = qty * unitPrice;
        return {
          itemId: `ITEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          materialId: pm.materialId,
          materialName: mat?.name || 'Unknown',
          sku: mat?.sku || '',
          quantity: qty,
          unit: mat?.unit || 'Nos',
          unitPrice,
          taxPercent: 18,
          lineTotal: lineTotal + (lineTotal * 0.18),
          receivedQuantity: 0
        };
      });
      setItems(initialItems);
    } else if (materials.length > 0) {
      const firstMat = materials[0];
      setItems([
        {
          itemId: `ITEM-${Date.now()}`,
          materialId: firstMat.materialId,
          materialName: firstMat.name,
          sku: firstMat.sku,
          quantity: 50,
          unit: firstMat.unit,
          unitPrice: firstMat.purchasePrice,
          taxPercent: 18,
          lineTotal: 50 * firstMat.purchasePrice * 1.18,
          receivedQuantity: 0
        }
      ]);
    } else {
      setItems([]);
    }

    setError(null);
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    if (materials.length === 0) return;
    const firstMat = materials[0];
    const newItem: POItem = {
      itemId: `ITEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      materialId: firstMat.materialId,
      materialName: firstMat.name,
      sku: firstMat.sku,
      quantity: 10,
      unit: firstMat.unit,
      unitPrice: firstMat.purchasePrice,
      taxPercent: 18,
      lineTotal: 10 * firstMat.purchasePrice * 1.18,
      receivedQuantity: 0
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleItemChange = (itemId: string, field: keyof POItem, val: any) => {
    setItems(prev =>
      prev.map(it => {
        if (it.itemId !== itemId) return it;
        const updated = { ...it, [field]: val };

        if (field === 'materialId') {
          const mat = materials.find(m => m.materialId === val);
          if (mat) {
            updated.materialName = mat.name;
            updated.sku = mat.sku;
            updated.unit = mat.unit;
            updated.unitPrice = mat.purchasePrice;
          }
        }

        const qty = updated.quantity || 0;
        const price = updated.unitPrice || 0;
        const tax = updated.taxPercent || 0;
        const sub = qty * price;
        updated.lineTotal = sub + (sub * (tax / 100));
        return updated;
      })
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(prev => prev.filter(it => it.itemId !== itemId));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);
    const taxTotal = items.reduce((sum, it) => sum + ((it.quantity * it.unitPrice) * (it.taxPercent / 100)), 0);
    const grandTotal = subtotal + taxTotal;
    return { subtotal, taxTotal, grandTotal };
  };

  const handleSavePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) {
      setError('Please select a vendor.');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one material item.');
      return;
    }

    const selectedVendor = vendors.find(v => v.vendorId === vendorId);
    const { subtotal, taxTotal, grandTotal } = calculateTotals();

    setSaving(true);
    setError(null);
    try {
      await savePurchaseOrder(
        {
          poId: editingPO?.poId,
          poNumber,
          vendorId,
          vendorName: selectedVendor?.vendorName || '',
          poDate,
          expectedDeliveryDate,
          status: editingPO?.status || 'PO_GENERATED',
          items,
          subtotal,
          taxTotal,
          grandTotal,
          deliveryAddress,
          paymentTerms,
          notes,
          linkedSalesOrderIds
        },
        currentUser
      );

      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save purchase order.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (po: PurchaseOrder, newStatus: POStatus) => {
    try {
      await savePurchaseOrder(
        {
          ...po,
          status: newStatus
        },
        currentUser
      );
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update PO status.');
    }
  };

  const filteredPOs = purchaseOrders.filter(po => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (po.poNumber || '').toLowerCase().includes(q) ||
      (po.vendorName || '').toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: POStatus) => {
    switch (status) {
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Fully Received
          </span>
        );
      case 'PARTIALLY_RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30">
            <Clock className="w-3 h-3" /> Partially Received
          </span>
        );
      case 'PO_SENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
            <Send className="w-3 h-3" /> Sent to Vendor
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/30">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            Generated
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-amber-500" />
            <span>Purchase Orders & Supplier Inwards</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Generate formal vendor POs, monitor supply ETAs, and process Goods Receipt Notes (GRN).
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Raise Purchase Order</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search PO number or vendor name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {(['ALL', 'PO_GENERATED', 'PO_SENT', 'PARTIALLY_RECEIVED', 'RECEIVED'] as const).map(
            st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL'
                  ? `All (${purchaseOrders.length})`
                  : st === 'PO_GENERATED'
                  ? 'Generated'
                  : st === 'PO_SENT'
                  ? 'Sent'
                  : st === 'PARTIALLY_RECEIVED'
                  ? 'Partially Inwarded'
                  : 'Fully Received'}
              </button>
            )
          )}
        </div>
      </div>

      {/* PO Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">PO Number & Date</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4">Expected Delivery</th>
                <th className="py-3 px-4 text-center">Items & Inward Progress</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No purchase orders found. Click "Raise Purchase Order" to issue one.
                  </td>
                </tr>
              ) : (
                filteredPOs.map(po => {
                  const totalOrdered = po.items.reduce((s, it) => s + (it.quantity || 0), 0);
                  const totalReceived = po.items.reduce((s, it) => s + (it.receivedQuantity || 0), 0);
                  const progressPct = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

                  return (
                    <tr
                      key={po.poId}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white font-mono">
                          {po.poNumber}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{po.poDate}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{po.vendorName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {po.items.length} line items
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {po.expectedDeliveryDate || 'Not specified'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Terms: {po.paymentTerms || 'Standard'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {totalReceived} / {totalOrdered}
                          </span>
                          <span className="text-[10px] text-slate-400">({progressPct}%)</span>
                        </div>
                        <div className="w-24 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mx-auto mt-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              progressPct >= 100
                                ? 'bg-emerald-500'
                                : progressPct > 0
                                ? 'bg-blue-500'
                                : 'bg-slate-400'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          ₹{po.grandTotal.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Incl. GST ₹{(po.taxTotal || 0).toLocaleString('en-IN')}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(po.status)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Receive Goods Button */}
                          {po.status !== 'RECEIVED' && po.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => setReceivingPO(po)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer shadow-2xs"
                              title="Record Inward Goods Receipt (GRN)"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              <span>Receive GRN</span>
                            </button>
                          )}

                          {/* Print / View */}
                          <button
                            type="button"
                            onClick={() => setViewingPrintPO(po)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Print / View Purchase Order"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Mark Sent */}
                          {po.status === 'PO_GENERATED' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(po, 'PO_SENT')}
                              className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                              title="Mark PO as Sent to Vendor"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete PO */}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(po)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete Purchase Order"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit PO Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingPO ? 'Edit Purchase Order' : 'Raise Purchase Order (Vendor PO)'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  PO Number: <span className="font-mono font-semibold">{poNumber}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePO} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Vendor & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Vendor <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={vendorId}
                    onChange={e => setVendorId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- Choose Vendor --</option>
                    {vendors.map(v => (
                      <option key={v.vendorId} value={v.vendorId}>
                        {v.vendorName} ({v.vendorCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    PO Issue Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={poDate}
                    onChange={e => setPoDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expected Delivery Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={expectedDeliveryDate}
                    onChange={e => setExpectedDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    PO Materials & Quantity Line Items
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[11px] font-semibold uppercase">
                        <th className="py-2.5 px-3">Material Component</th>
                        <th className="py-2.5 px-3 text-center w-24">Qty</th>
                        <th className="py-2.5 px-3 text-center w-16">Unit</th>
                        <th className="py-2.5 px-3 text-right w-28">Unit Price (₹)</th>
                        <th className="py-2.5 px-3 text-center w-20">GST %</th>
                        <th className="py-2.5 px-3 text-right w-28">Total (₹)</th>
                        <th className="py-2.5 px-3 text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {items.map(it => (
                        <tr key={it.itemId}>
                          <td className="py-2 px-3">
                            <select
                              value={it.materialId}
                              onChange={e =>
                                handleItemChange(it.itemId, 'materialId', e.target.value)
                              }
                              className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100"
                            >
                              {materials.map(m => (
                                <option key={m.materialId} value={m.materialId}>
                                  {m.name} ({m.sku})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={e =>
                                handleItemChange(
                                  it.itemId,
                                  'quantity',
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className="w-full px-2 py-1 text-xs text-center bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-lg font-bold text-slate-900 dark:text-slate-100"
                            />
                          </td>
                          <td className="py-2 px-3 text-center text-slate-400 text-[11px]">
                            {it.unit}
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={it.unitPrice}
                              onChange={e =>
                                handleItemChange(
                                  it.itemId,
                                  'unitPrice',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full px-2 py-1 text-xs text-right bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              max="28"
                              value={it.taxPercent}
                              onChange={e =>
                                handleItemChange(
                                  it.itemId,
                                  'taxPercent',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full px-2 py-1 text-xs text-center bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                            ₹{(it.lineTotal || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(it.itemId)}
                              className="p-1 text-slate-400 hover:text-rose-500 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary */}
                {items.length > 0 && (
                  <div className="flex justify-end pt-2">
                    <div className="w-72 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Subtotal:</span>
                        <span>₹{calculateTotals().subtotal.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>GST / Taxes:</span>
                        <span>₹{calculateTotals().taxTotal.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-white pt-1.5 border-t border-slate-200 dark:border-slate-700">
                        <span>Grand Total:</span>
                        <span className="text-amber-600 dark:text-amber-400">
                          ₹{calculateTotals().grandTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Terms & Delivery Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Delivery Address
                  </label>
                  <textarea
                    rows={2}
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Terms & Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Generating...' : 'Issue Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Goods GRN Modal */}
      {receivingPO && (
        <ReceiveGoodsModal
          purchaseOrder={receivingPO}
          currentUser={currentUser}
          onClose={() => setReceivingPO(null)}
          onSuccess={onRefresh}
        />
      )}

      {/* Printable PO Modal */}
      {viewingPrintPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-8 p-8 space-y-6">
            <div className="flex items-start justify-between border-b pb-6">
              <div>
                <div className="font-bold text-2xl tracking-tight text-slate-950">FUNSCHOLAR</div>
                <div className="text-xs text-slate-600 mt-1">
                  Educational STEM & Robotics Lab Solutions
                </div>
                <div className="text-[11px] text-slate-500 mt-1 max-w-sm">
                  Industrial Area Phase II, New Delhi 110020 &bull; GSTIN: 07AABCF1234F1Z9 &bull; Email: procurement@funscholar.com
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs uppercase font-bold text-amber-600 tracking-wider">
                  Purchase Order
                </div>
                <div className="text-lg font-black font-mono text-slate-900 mt-0.5">
                  {viewingPrintPO.poNumber}
                </div>
                <div className="text-xs text-slate-500 mt-1">Date: {viewingPrintPO.poDate}</div>
              </div>
            </div>

            {/* Vendor & Shipping Details */}
            <div className="grid grid-cols-2 gap-6 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1">
                  Vendor / Supplier:
                </div>
                <div className="font-bold text-sm text-slate-950">{viewingPrintPO.vendorName}</div>
                <div className="text-slate-600 mt-1">Attn: Accounts / Dispatch Team</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1">
                  Shipping & Delivery To:
                </div>
                <div className="text-slate-700 leading-relaxed">
                  {viewingPrintPO.deliveryAddress || 'Funscholar Central Hub, New Delhi'}
                </div>
                <div className="text-slate-500 mt-1">
                  Expected by: <span className="font-bold text-slate-800">{viewingPrintPO.expectedDeliveryDate}</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Material & SKU</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                    <th className="py-2.5 px-3 text-right">Tax Rate</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewingPrintPO.items.map((it, idx) => (
                    <tr key={it.itemId}>
                      <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-950">{it.materialName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{it.sku}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold">
                        {it.quantity} {it.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        ₹{it.unitPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right">{it.taxPercent}%</td>
                      <td className="py-2.5 px-3 text-right font-bold font-mono">
                        ₹{(it.lineTotal || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="flex justify-end text-xs">
              <div className="w-64 space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>₹{viewingPrintPO.subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST / Taxes:</span>
                  <span>₹{(viewingPrintPO.taxTotal || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-950 pt-1 border-t">
                  <span>Grand Total:</span>
                  <span className="text-amber-600 font-mono">
                    ₹{viewingPrintPO.grandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="text-[11px] text-slate-500 border-t pt-4 space-y-1">
              <p><strong>Payment Terms:</strong> {viewingPrintPO.paymentTerms}</p>
              <p>Please attach a copy of this PO with the invoice and delivery challan upon supply.</p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t print:hidden">
              <button
                type="button"
                onClick={() => setViewingPrintPO(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-xl flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Purchase Order Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Purchase Order"
        recordName={deleteTarget ? `${deleteTarget.poNumber} (${deleteTarget.vendorName})` : undefined}
        recordType="Purchase Order"
        warningDetails="Deleting this Purchase Order removes it from active procurement tracking. Live Sales Orders and Order Registry entries remain completely unaffected."
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
