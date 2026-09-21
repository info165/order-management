import React, { useState } from 'react';
import { Material, Vendor, UserProfile } from '../../types';
import { saveMaterial, deleteMaterial } from '../../services/dataService';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import {
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Edit2,
  Trash2,
  Layers,
  SlidersHorizontal,
  Package,
  TrendingDown,
  Building2,
  CheckCircle2,
  X,
  AlertCircle
} from 'lucide-react';

interface Props {
  materials: Material[];
  vendors: Vendor[];
  currentUser?: UserProfile;
  onRefresh: () => void;
}

export const MaterialMaster: React.FC<Props> = ({
  materials,
  vendors,
  currentUser,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOW_STOCK' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [adjustingMaterial, setAdjustingMaterial] = useState<Material | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Material>>({
    sku: '',
    name: '',
    category: 'Motors & Actuators',
    description: '',
    unit: 'Nos',
    imageUrl: '',
    preferredVendorId: '',
    preferredVendorName: '',
    purchasePrice: 0,
    sellingPrice: 0,
    openingInventory: 0,
    currentStock: 0,
    minimumStockLevel: 50,
    isActive: true
  });
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const categories = Array.from(new Set(materials.map(m => m.category).filter(Boolean)));

  const handleOpenNew = () => {
    setFormData({
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      category: categories[0] || 'General',
      description: '',
      unit: 'Nos',
      imageUrl: '',
      preferredVendorId: vendors[0]?.vendorId || '',
      preferredVendorName: vendors[0]?.vendorName || '',
      purchasePrice: 0,
      sellingPrice: 0,
      openingInventory: 0,
      currentStock: 0,
      minimumStockLevel: 50,
      isActive: true
    });
    setEditingMaterial(null);
    setFormError(null);
    setIsNewModalOpen(true);
  };

  const handleOpenEdit = (material: Material) => {
    setEditingMaterial(material);
    setFormData({ ...material });
    setFormError(null);
    setIsNewModalOpen(true);
  };

  const handleVendorSelect = (vendorId: string) => {
    const v = vendors.find(item => item.vendorId === vendorId);
    setFormData(prev => ({
      ...prev,
      preferredVendorId: vendorId,
      preferredVendorName: v ? v.vendorName : ''
    }));
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setFormError('Material name is required.');
      return;
    }

    setFormSaving(true);
    setFormError(null);
    try {
      await saveMaterial(
        {
          ...formData,
          materialId: editingMaterial?.materialId
        },
        currentUser
      );
      setIsNewModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save material.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async (materialId: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete material "${name}"?`)) {
      try {
        await deleteMaterial(materialId, currentUser);
        onRefresh();
      } catch (err: any) {
        alert(err.message || 'Failed to delete material.');
      }
    }
  };

  // Filter materials
  const filteredMaterials = materials.filter(m => {
    const matchesSearch =
      (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.sku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.preferredVendorName || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'ALL' || m.category === categoryFilter;

    let matchesStatus = true;
    if (statusFilter === 'LOW_STOCK') {
      matchesStatus = m.currentStock <= m.minimumStockLevel;
    } else if (statusFilter === 'ACTIVE') {
      matchesStatus = m.isActive;
    } else if (statusFilter === 'INACTIVE') {
      matchesStatus = !m.isActive;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const lowStockCount = materials.filter(m => m.currentStock <= m.minimumStockLevel).length;

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Package className="w-6 h-6 text-amber-500" />
            <span>Product & Material Master</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Maintain raw components, electronics, hardware, vendor associations and reorder thresholds.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Material</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center gap-3 justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search material, SKU, vendor..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">All Categories ({categories.length})</option>
            {categories.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Quick Status Tabs */}
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
              All ({materials.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('LOW_STOCK')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'LOW_STOCK'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Low Stock ({lowStockCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Material Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Preferred Vendor</th>
                <th className="py-3 px-4 text-right">Purchase / Sell Price</th>
                <th className="py-3 px-4 text-center">Stock Level</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No materials found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredMaterials.map(m => {
                  const isLowStock = m.currentStock <= m.minimumStockLevel;
                  return (
                    <tr
                      key={m.materialId}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{m.name}</span>
                          {isLowStock && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                              title={`Below minimum stock level (${m.minimumStockLevel})`}
                            >
                              Low
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                          <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {m.sku}
                          </span>
                          <span>Unit: {m.unit}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                          {m.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {m.preferredVendorName ? (
                          <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate max-w-[180px] font-medium">
                              {m.preferredVendorName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Not Assigned</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          ₹{m.purchasePrice.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          MRP: ₹{m.sellingPrice.toLocaleString('en-IN')}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div
                          className={`inline-block font-bold text-sm ${
                            isLowStock ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {m.currentStock} {m.unit}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Min: {m.minimumStockLevel} {m.unit}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            m.isActive
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                          }`}
                        >
                          {m.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setAdjustingMaterial(m)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Adjust Stock Level"
                          >
                            <SlidersHorizontal className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(m)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit Material"
                          >
                            <Edit2 className="w-4 h-4 text-blue-500" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(m.materialId, m.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete Material"
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

      {/* Add / Edit Material Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingMaterial ? 'Edit Material' : 'Add New Material'}
              </h2>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Material Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ultrasonic Sensor Module HC-SR04"
                    value={formData.name || ''}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    SKU / Material Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SKU-SEN-US01"
                    value={formData.sku || ''}
                    onChange={e => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Motors, Sensors, Consumables"
                    value={formData.category || ''}
                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit of Measurement (UOM)
                  </label>
                  <select
                    value={formData.unit || 'Nos'}
                    onChange={e => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Nos">Nos (Pieces)</option>
                    <option value="Sets">Sets</option>
                    <option value="Pkts">Packets (Pkts)</option>
                    <option value="Meters">Meters</option>
                    <option value="Rolls">Rolls</option>
                    <option value="Kg">Kilograms (Kg)</option>
                    <option value="Pairs">Pairs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Preferred Vendor
                  </label>
                  <select
                    value={formData.preferredVendorId || ''}
                    onChange={e => handleVendorSelect(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- None Selected --</option>
                    {vendors.map(v => (
                      <option key={v.vendorId} value={v.vendorId}>
                        {v.vendorName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Purchase Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.purchasePrice || 0}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, purchasePrice: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.sellingPrice || 0}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, sellingPrice: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Current Physical Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.currentStock || 0}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, currentStock: parseInt(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Min Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minimumStockLevel || 10}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, minimumStockLevel: parseInt(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Material specifications, grade, manufacturer or notes..."
                  value={formData.description || ''}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveMat"
                  checked={formData.isActive}
                  onChange={e => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="isActiveMat" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  Material is Active for new Bills of Material & Purchase Orders
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {formSaving ? 'Saving...' : editingMaterial ? 'Update Material' : 'Create Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustingMaterial && (
        <StockAdjustmentModal
          material={adjustingMaterial}
          currentUser={currentUser}
          onClose={() => setAdjustingMaterial(null)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
};
