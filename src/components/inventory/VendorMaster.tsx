import React, { useState } from 'react';
import { Vendor, Material, PurchaseOrder, UserProfile } from '../../types';
import { saveVendor, deleteVendor } from '../../services/dataService';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  Edit2,
  Trash2,
  Package,
  ShoppingBag,
  ExternalLink,
  X,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface Props {
  vendors: Vendor[];
  materials: Material[];
  purchaseOrders: PurchaseOrder[];
  currentUser?: UserProfile;
  onRefresh: () => void;
  onCreatePOWithVendor?: (vendorId: string) => void;
}

export const VendorMaster: React.FC<Props> = ({
  vendors,
  materials,
  purchaseOrders,
  currentUser,
  onRefresh,
  onCreatePOWithVendor
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // Form State
  const [vendorCode, setVendorCode] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [notes, setNotes] = useState('');
  const [suppliedMaterialIds, setSuppliedMaterialIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenNew = () => {
    setEditingVendor(null);
    setVendorCode(`VND-${Math.floor(100 + Math.random() * 900)}`);
    setVendorName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCity('');
    setState('');
    setGstNumber('');
    setPaymentTerms('Net 30 Days');
    setNotes('');
    setSuppliedMaterialIds([]);
    setIsActive(true);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: Vendor) => {
    setEditingVendor(v);
    setVendorCode(v.vendorCode);
    setVendorName(v.vendorName);
    setContactPerson(v.contactPerson || '');
    setPhone(v.phone || '');
    setEmail(v.email || '');
    setAddress(v.address || '');
    setCity(v.city || '');
    setState(v.state || '');
    setGstNumber(v.gstNumber || '');
    setPaymentTerms(v.paymentTerms || 'Net 30 Days');
    setNotes(v.notes || '');
    setSuppliedMaterialIds(v.suppliedMaterialIds || []);
    setIsActive(v.isActive);
    setError(null);
    setIsModalOpen(true);
  };

  const toggleMaterialSupply = (matId: string) => {
    setSuppliedMaterialIds(prev =>
      prev.includes(matId) ? prev.filter(id => id !== matId) : [...prev, matId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      setError('Vendor name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveVendor(
        {
          vendorId: editingVendor?.vendorId,
          vendorCode,
          vendorName: vendorName.trim(),
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          gstNumber: gstNumber.trim(),
          paymentTerms: paymentTerms.trim(),
          notes: notes.trim(),
          suppliedMaterialIds,
          isActive
        },
        currentUser
      );
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save vendor.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteVendor(deleteTarget.vendorId, currentUser);
      setDeleteTarget(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete vendor.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredVendors = vendors.filter(v => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (v.vendorName || '').toLowerCase().includes(q) ||
      (v.vendorCode || '').toLowerCase().includes(q) ||
      (v.contactPerson || '').toLowerCase().includes(q) ||
      (v.city || '').toLowerCase().includes(q) ||
      (v.gstNumber || '').toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && v.isActive) ||
      (statusFilter === 'INACTIVE' && !v.isActive);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-amber-500" />
            <span>Vendor Master Registry</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage suppliers, tax credentials, payment terms, and component procurement catalogs.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Vendor</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search vendor name, code, contact, GST..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All ({vendors.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'ACTIVE'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Active ({vendors.filter(v => v.isActive).length})
          </button>
        </div>
      </div>

      {/* Vendor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVendors.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            No vendors found. Click "Add New Vendor" to register a supplier.
          </div>
        ) : (
          filteredVendors.map(v => {
            const vendorPOs = purchaseOrders.filter(po => po.vendorId === v.vendorId);
            const totalSpend = vendorPOs.reduce((acc, po) => acc + (po.grandTotal || 0), 0);
            const vendorMats = materials.filter(m =>
              (v.suppliedMaterialIds || []).includes(m.materialId) || m.preferredVendorId === v.vendorId
            );

            return (
              <div
                key={v.vendorId}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div>
                  {/* Top Details */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                        {v.vendorCode}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base mt-1.5">
                        {v.vendorName}
                      </h3>
                      {v.contactPerson && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          Attn: {v.contactPerson}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(v)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Vendor"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(v)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete Vendor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {v.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{v.phone}</span>
                      </div>
                    )}
                    {v.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{v.email}</span>
                      </div>
                    )}
                    {(v.city || v.state) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{[v.city, v.state].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    {v.gstNumber && (
                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>GST: {v.gstNumber}</span>
                      </div>
                    )}
                  </div>

                  {/* Badges / Metrics */}
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        Purchase Orders
                      </div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {vendorPOs.length} POs
                      </div>
                    </div>

                    <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        Total Volume
                      </div>
                      <div className="font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                        ₹{totalSpend.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* Supplied Materials snippet */}
                  <div className="mt-3">
                    <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 mb-1">
                      Supplied Items ({vendorMats.length})
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {vendorMats.slice(0, 3).map(m => (
                        <span
                          key={m.materialId}
                          className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] truncate max-w-[140px]"
                        >
                          {m.name}
                        </span>
                      ))}
                      {vendorMats.length > 3 && (
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded text-[10px]">
                          +{vendorMats.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Terms: {v.paymentTerms || 'Standard'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onCreatePOWithVendor && onCreatePOWithVendor(v.vendorId)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Create PO</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Vendor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingVendor ? 'Edit Vendor Profile' : 'Register New Vendor'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Vendor Business Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Electronics & Components Pvt Ltd"
                    value={vendorName}
                    onChange={e => setVendorName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Vendor Code
                  </label>
                  <input
                    type="text"
                    required
                    value={vendorCode}
                    onChange={e => setVendorCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="sales@apexelectronics.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    GST Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 07AAAAA0000A1Z5"
                    value={gstNumber}
                    onChange={e => setGstNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 100% Advance, Net 30, Net 45"
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    City / State
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="City"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={state}
                      onChange={e => setState(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Dispatch / Registered Office Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Street, Industrial Area, PIN Code..."
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Supplied Materials Multi-Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Link Materials Supplied By This Vendor
                </label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/50 dark:bg-slate-800/40">
                  {materials.map(m => {
                    const isChecked = suppliedMaterialIds.includes(m.materialId);
                    return (
                      <label
                        key={m.materialId}
                        className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 p-1.5 rounded-lg"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleMaterialSupply(m.materialId)}
                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="truncate">
                          {m.name} <span className="text-[10px] text-slate-400 font-mono">({m.sku})</span>
                        </span>
                      </label>
                    );
                  })}
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
                  {saving ? 'Saving...' : editingVendor ? 'Update Vendor' : 'Create Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Vendor Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Vendor"
        recordName={deleteTarget?.vendorName}
        recordType="Vendor"
        warningDetails="Deleting this vendor removes their profile and supplier relationship. Historical Purchase Orders, inventory materials, and sales orders remain untouched."
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
