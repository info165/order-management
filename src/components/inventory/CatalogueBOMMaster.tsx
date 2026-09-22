import React, { useState } from 'react';
import { Catalogue, Material, BOMItem, UserProfile } from '../../types';
import { saveCatalogue, deleteCatalogue } from '../../services/dataService';
import { flattenBOM } from '../../utils/bomCalculator';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Package,
  Boxes,
  IndianRupee,
  Search,
  CheckCircle2,
  X,
  PlusCircle,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

interface Props {
  catalogues: Catalogue[];
  materials: Material[];
  currentUser?: UserProfile;
  onRefresh: () => void;
}

export const CatalogueBOMMaster: React.FC<Props> = ({
  catalogues,
  materials,
  currentUser,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatalogueId, setSelectedCatalogueId] = useState<string | null>(
    catalogues[0]?.catalogueId || null
  );

  // Edit / New Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCatalogue, setEditingCatalogue] = useState<Catalogue | null>(null);

  // Catalogue Form
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('STEM Lab Package');
  const [description, setDescription] = useState('');
  const [salesOrderPkgKeywords, setSalesOrderPkgKeywords] = useState('');
  const [isCustomCatalogue, setIsCustomCatalogue] = useState(false);
  const [customDetails, setCustomDetails] = useState('');
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Catalogue | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedCatalogue = catalogues.find(c => c.catalogueId === selectedCatalogueId) || catalogues[0];

  // Calculate Unit Cost of BOM
  const calculateTotalBOMCost = (items: BOMItem[]): number => {
    let total = 0;
    items.forEach(item => {
      const mat = materials.find(m => m.materialId === item.materialId);
      const unitCost = item.unitCostOverride !== undefined ? item.unitCostOverride : (mat?.purchasePrice || 0);
      total += unitCost * (item.quantityPerCatalogue || 1);

      if (item.subItems && item.subItems.length > 0) {
        total += calculateTotalBOMCost(item.subItems) * (item.quantityPerCatalogue || 1);
      }
    });
    return total;
  };

  const handleOpenNew = () => {
    setEditingCatalogue(null);
    setCode(`CAT-${Math.floor(100 + Math.random() * 900)}`);
    setName('');
    setCategory('STEM Lab Package');
    setDescription('');
    setSalesOrderPkgKeywords('');
    setIsCustomCatalogue(false);
    setCustomDetails('');
    setBomItems([]);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Catalogue) => {
    setEditingCatalogue(cat);
    setCode(cat.code || cat.catalogueCode || '');
    setName(cat.name);
    setCategory(cat.category || 'STEM Lab Package');
    setDescription(cat.description || '');
    setSalesOrderPkgKeywords((cat.salesOrderPkgKeywords || []).join(', '));
    setIsCustomCatalogue(cat.isCustomCatalogue || false);
    setCustomDetails(cat.customDetails || '');
    setBomItems(JSON.parse(JSON.stringify(cat.bomItems || cat.items || [])));
    setError(null);
    setIsModalOpen(true);
  };

  // Add Item to Root BOM
  const handleAddRootItem = () => {
    if (materials.length === 0) {
      alert('Please add materials in Material Master first.');
      return;
    }
    const firstMat = materials[0];
    const newItem: BOMItem = {
      itemId: `BOM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      materialId: firstMat.materialId,
      materialName: firstMat.name,
      sku: firstMat.sku,
      quantityPerCatalogue: 1,
      unit: firstMat.unit,
      unitCostOverride: firstMat.purchasePrice,
      subItems: []
    };
    setBomItems(prev => [...prev, newItem]);
  };

  // Add Sub-item under a parent BOM item
  const handleAddSubItem = (parentItemId: string) => {
    if (materials.length === 0) return;
    const firstMat = materials[0];
    const newSubItem: BOMItem = {
      itemId: `SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      materialId: firstMat.materialId,
      materialName: firstMat.name,
      sku: firstMat.sku,
      quantityPerCatalogue: 1,
      unit: firstMat.unit,
      unitCostOverride: firstMat.purchasePrice,
      subItems: []
    };

    const updateChildren = (items: BOMItem[]): BOMItem[] => {
      return items.map(item => {
        if (item.itemId === parentItemId) {
          return {
            ...item,
            subItems: [...(item.subItems || []), newSubItem]
          };
        }
        if (item.subItems && item.subItems.length > 0) {
          return {
            ...item,
            subItems: updateChildren(item.subItems)
          };
        }
        return item;
      });
    };

    setBomItems(prev => updateChildren(prev));
  };

  // Update item field
  const handleUpdateItem = (
    itemId: string,
    field: keyof BOMItem,
    value: any
  ) => {
    const updateRecursive = (items: BOMItem[]): BOMItem[] => {
      return items.map(item => {
        if (item.itemId === itemId) {
          const updated = { ...item, [field]: value };
          if (field === 'materialId') {
            const mat = materials.find(m => m.materialId === value);
            if (mat) {
              updated.materialName = mat.name;
              updated.sku = mat.sku;
              updated.unit = mat.unit;
              updated.unitCostOverride = mat.purchasePrice;
            }
          }
          return updated;
        }
        if (item.subItems && item.subItems.length > 0) {
          return {
            ...item,
            subItems: updateRecursive(item.subItems)
          };
        }
        return item;
      });
    };

    setBomItems(prev => updateRecursive(prev));
  };

  // Remove BOM item
  const handleRemoveItem = (itemId: string) => {
    const removeRecursive = (items: BOMItem[]): BOMItem[] => {
      return items
        .filter(item => item.itemId !== itemId)
        .map(item => ({
          ...item,
          subItems: item.subItems ? removeRecursive(item.subItems) : []
        }));
    };
    setBomItems(prev => removeRecursive(prev));
  };

  const handleSaveCatalogue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Catalogue name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const keywords = salesOrderPkgKeywords
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const computedCost = calculateTotalBOMCost(bomItems);

      const saved = await saveCatalogue(
        {
          catalogueId: editingCatalogue?.catalogueId,
          catalogueCode: code,
          code,
          name: name.trim(),
          category,
          description: description.trim(),
          salesOrderPkgKeywords: keywords,
          isCustomCatalogue,
          customDetails: isCustomCatalogue ? customDetails.trim() : undefined,
          items: bomItems,
          bomItems,
          totalBomCost: computedCost,
          isActive: true
        },
        currentUser
      );

      setIsModalOpen(false);
      setSelectedCatalogueId(saved.catalogueId);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save catalogue.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteCatalogue(deleteTarget.catalogueId, currentUser);
      if (selectedCatalogueId === deleteTarget.catalogueId) {
        const remaining = catalogues.filter(c => c.catalogueId !== deleteTarget.catalogueId);
        setSelectedCatalogueId(remaining[0]?.catalogueId || null);
      }
      setDeleteTarget(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete catalogue.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCatalogues = catalogues.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.code || '').toLowerCase().includes(q) ||
      (c.category || '').toLowerCase().includes(q)
    );
  });

  // Render Hierarchical Tree Node
  const renderBOMNode = (item: BOMItem, depth = 0) => {
    const mat = materials.find(m => m.materialId === item.materialId);
    const unitPrice = item.unitCostOverride ?? mat?.purchasePrice ?? 0;
    const lineCost = unitPrice * (item.quantityPerCatalogue || 1);

    return (
      <div key={item.itemId} className="space-y-2">
        <div
          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
            depth === 0
              ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
              : 'bg-white dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-750 ml-6'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-xs">
              {depth + 1}
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                <span>{item.materialName}</span>
                <span className="text-[10px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                  {item.sku}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Qty Required: <span className="font-bold text-slate-700 dark:text-slate-300">{item.quantityPerCatalogue} {item.unit}</span> &bull; Stock Available: <span className={mat && mat.currentStock < item.quantityPerCatalogue ? 'text-rose-500 font-semibold' : 'text-emerald-500 font-semibold'}>{mat?.currentStock ?? 0} {item.unit}</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
              ₹{lineCost.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400">
              @ ₹{unitPrice.toLocaleString('en-IN')} / {item.unit}
            </div>
          </div>
        </div>

        {/* Nested Children */}
        {item.subItems && item.subItems.length > 0 && (
          <div className="border-l-2 border-amber-500/30 ml-3 pl-3 space-y-2">
            {item.subItems.map(sub => renderBOMNode(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Render BOM Row in Form
  const renderBOMFormRow = (item: BOMItem, depth = 0) => {
    return (
      <div key={item.itemId} className="space-y-2">
        <div
          className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
            depth === 0
              ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              : 'bg-white dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700 ml-5'
          }`}
        >
          <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 text-[10px] font-bold flex items-center justify-center shrink-0">
            L{depth + 1}
          </div>

          {/* Material Select */}
          <div className="flex-1">
            <select
              value={item.materialId}
              onChange={e => handleUpdateItem(item.itemId, 'materialId', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {materials.map(m => (
                <option key={m.materialId} value={m.materialId}>
                  {m.name} ({m.sku}) - ₹{m.purchasePrice}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div className="w-24">
            <input
              type="number"
              min="0.1"
              step="any"
              placeholder="Qty"
              value={item.quantityPerCatalogue}
              onChange={e =>
                handleUpdateItem(
                  item.itemId,
                  'quantityPerCatalogue',
                  parseFloat(e.target.value) || 1
                )
              }
              className="w-full px-2.5 py-1.5 text-xs text-center bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="text-[11px] text-slate-400 w-12 truncate">{item.unit}</div>

          {/* Add Sub-component button */}
          <button
            type="button"
            onClick={() => handleAddSubItem(item.itemId)}
            className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
            title="Add sub-component under this item"
          >
            <PlusCircle className="w-4 h-4" />
          </button>

          {/* Remove */}
          <button
            type="button"
            onClick={() => handleRemoveItem(item.itemId)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            title="Remove item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-items recursive in form */}
        {item.subItems && item.subItems.length > 0 && (
          <div className="border-l-2 border-amber-500/30 ml-2.5 pl-2.5 space-y-2">
            {item.subItems.map(sub => renderBOMFormRow(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-amber-500" />
            <span>Catalogue & Bill of Materials (BOM) Master</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Define finished kit hierarchies, component formulas, and unit costs linked to school sales orders.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Catalogue / Package</span>
        </button>
      </div>

      {/* Main Split View: Left List, Right Hierarchy */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Catalogue List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter packages..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-xs">
            {filteredCatalogues.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No catalogues found. Click "Add New Catalogue" to create one.
              </div>
            ) : (
              filteredCatalogues.map(c => {
                const isSelected = selectedCatalogue?.catalogueId === c.catalogueId;
                const flattenedCount = flattenBOM(c.items || c.bomItems || []).size;
                const cost = calculateTotalBOMCost(c.items || c.bomItems || []);

                return (
                  <button
                    key={c.catalogueId}
                    type="button"
                    onClick={() => setSelectedCatalogueId(c.catalogueId)}
                    className={`w-full text-left p-4 transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/10 dark:bg-amber-500/15 border-l-4 border-amber-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                          {c.name}
                        </span>
                        {c.isCustomCatalogue && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            Custom Spec
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {c.code} &bull; {c.category}
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-[11px]">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-medium">
                          {flattenedCount} Materials
                        </span>
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          ₹{cost.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isSelected ? 'text-amber-500 translate-x-1' : 'text-slate-400'
                      }`}
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Catalogue BOM Details */}
        <div className="lg:col-span-8">
          {selectedCatalogue ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedCatalogue.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                      {selectedCatalogue.code}
                    </span>
                    {selectedCatalogue.isCustomCatalogue && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40">
                        ★ Custom Catalogue
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {selectedCatalogue.description || 'No package description provided.'}
                  </p>

                  {selectedCatalogue.isCustomCatalogue && selectedCatalogue.customDetails && (
                    <div className="mt-2.5 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                      <span className="font-bold block text-[11px] text-amber-800 dark:text-amber-300 mb-0.5">
                        Custom Specifications & Configuration Notes:
                      </span>
                      <span>{selectedCatalogue.customDetails}</span>
                    </div>
                  )}

                  {selectedCatalogue.salesOrderPkgKeywords &&
                    selectedCatalogue.salesOrderPkgKeywords.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          Matched Order Keywords:
                        </span>
                        {selectedCatalogue.salesOrderPkgKeywords.map(kw => (
                          <span
                            key={kw}
                            className="px-2 py-0.5 bg-slate-200/80 dark:bg-slate-800 rounded text-[10px] font-medium text-slate-700 dark:text-slate-300"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(selectedCatalogue)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>Edit BOM</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(selectedCatalogue)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                    title="Delete Catalogue"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Cost Summary Banner */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-amber-400" />
                  <div>
                    <div className="text-xs font-bold text-slate-200">
                      Total Bill of Materials (BOM) Cost
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Calculated roll-up of all raw materials & sub-assemblies per kit
                    </div>
                  </div>
                </div>
                <div className="text-xl font-black text-amber-400 font-mono">
                  ₹{calculateTotalBOMCost(selectedCatalogue.bomItems || []).toLocaleString('en-IN')}
                </div>
              </div>

              {/* Hierarchy Tree Content */}
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    BOM Component Hierarchy & Quantities
                  </h4>
                  <span className="text-xs text-slate-400">
                    {flattenBOM(selectedCatalogue.items || selectedCatalogue.bomItems || []).size} distinct items
                  </span>
                </div>

                {(!selectedCatalogue.bomItems || selectedCatalogue.bomItems.length === 0) ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <p className="text-xs text-slate-400 mb-3">
                      This catalogue does not have any BOM materials configured yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(selectedCatalogue)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition-all"
                    >
                      Configure Bill of Materials
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedCatalogue.bomItems.map(item => renderBOMNode(item, 0))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              Select or create a catalogue to view its Bill of Materials.
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Catalogue Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingCatalogue ? 'Edit Catalogue & BOM' : 'Create New Catalogue Package'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCatalogue} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Master Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Catalogue / Package Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Composite STEM Lab Package"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Catalogue Code
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. STEM Lab, Robotic Kit, Aeromodelling"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sales Order Keywords (Comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. STEM Lab, Composite, Robotics"
                    value={salesOrderPkgKeywords}
                    onChange={e => setSalesOrderPkgKeywords(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Orders mentioning these words in package name or description will automatically link to this BOM.
                  </p>
                </div>
              </div>

              {/* Custom Catalogue & Bespoke Configuration Section */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isCustomCatalogue}
                    onChange={e => setIsCustomCatalogue(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Mark as Custom Catalogue / Bespoke Configuration
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                  Check this if this catalogue represents a tailored package variation with custom components.
                </p>

                {isCustomCatalogue && (
                  <div className="pt-1 pl-6 space-y-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Custom Details & Engineering Notes:
                    </label>
                    <textarea
                      rows={2}
                      value={customDetails}
                      onChange={e => setCustomDetails(e.target.value)}
                      placeholder="e.g. Higher torque motors, custom laser cut brackets, additional sensors included..."
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* BOM Materials Section */}
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Bill of Materials Structure
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Add components and sub-assemblies needed to assemble 1 unit of this kit.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddRootItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-500" />
                    <span>Add Root Item</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {bomItems.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      No materials added yet. Click "Add Root Item" to start building the BOM.
                    </div>
                  ) : (
                    bomItems.map(item => renderBOMFormRow(item, 0))
                  )}
                </div>

                {/* Rollup Preview */}
                {bomItems.length > 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                      Calculated Unit Production Cost:
                    </span>
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-400 font-mono">
                      ₹{calculateTotalBOMCost(bomItems).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
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
                  {saving ? 'Saving...' : editingCatalogue ? 'Update Catalogue & BOM' : 'Create Catalogue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Catalogue / BOM"
        recordName={deleteTarget?.name}
        recordType="Catalogue"
        warningDetails="Deleting this catalogue will remove its Bill of Materials formula and cost tracking. Any historical Sales Orders referencing this kit will remain completely intact in the Sales Order registry."
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
