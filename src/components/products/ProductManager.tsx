import React, { useState, useEffect, useMemo } from 'react';
import { Package, Search, Plus, CheckCircle, Tag, X } from 'lucide-react';
import { Product, UserProfile } from '../../types';
import { getProducts, createProduct } from '../../services/dataService';
import { CurrencyFormatter } from '../common/CurrencyFormatter';

interface ProductManagerProps {
  currentUser: UserProfile;
}

export const ProductManager: React.FC<ProductManagerProps> = ({ currentUser }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newCategory, setNewCategory] = useState('ATL Lab Equipment & Components');
  const [newPrice, setNewPrice] = useState<number>(25000);
  const [newDesc, setNewDesc] = useState('');

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getProducts();
      setProducts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category))).filter(Boolean), [products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      return true;
    });
  }, [products, search, selectedCategory]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await createProduct(
        {
          name: newName,
          sku: newSku || `SKU-${Date.now().toString().slice(-4)}`,
          category: newCategory,
          standardPrice: Number(newPrice),
          taxRate: 18,
          description: newDesc,
          isActive: true
        },
        currentUser
      );
      setShowAddModal(false);
      await loadProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" />
            <span>Product Catalog & Lab Packages (KV / JNV Specifications)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Standard educational equipment packages, Atal Tinkering Lab components, and mathematics kits
          </p>
        </div>

        {currentUser.role !== 'AGENT' && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Equipment Package</span>
          </button>
        )}
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-2 text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search product package, SKU, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 text-xs focus:bg-white focus:outline-none"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 text-xs"
        >
          <option value="ALL">All Lab Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((prod) => (
          <div
            key={prod.productId}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3 hover:border-slate-300 transition-colors text-xs"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200">
                  {prod.sku}
                </span>
                <span className="text-[10px] uppercase font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  18% GST Applicable
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-sm mt-2">{prod.name}</h3>
              <p className="text-slate-500 text-xs mt-1 line-clamp-2">{prod.description || 'Standard procurement set'}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">GeM Benchmark Price</span>
                <span className="text-base font-bold font-mono text-slate-900">
                  <CurrencyFormatter amount={prod.standardPrice} />
                </span>
              </div>

              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                {prod.category}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Add Lab Equipment Package</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Package Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Atal Tinkering Lab Package Package 1"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">SKU Code</label>
                  <input
                    type="text"
                    placeholder="e.g. ATL-SET-01"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Base Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Category</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Specifications, package contents, standard warranty..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-sm"
                >
                  Save Equipment Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
