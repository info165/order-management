import React, { useState, useEffect, useRef } from 'react';
import { X, Building, Plus, AlertCircle, CheckCircle, Package, Search, PlusCircle, ChevronDown, Check } from 'lucide-react';
import { Order, School, Agent, Product, UserProfile } from '../../types';
import { getSchools, getAgents, getProducts, createOrder, checkPotentialDuplicateOrder, createSchool, createProduct } from '../../services/dataService';
import { CurrencyFormatter } from '../common/CurrencyFormatter';

interface NewOrderModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  onOrderCreated: (newOrder: Order) => void;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({ currentUser, onClose, onOrderCreated }) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  // School fields
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schoolType, setSchoolType] = useState<any>('');
  const [schoolCode, setSchoolCode] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [schoolContactPhone, setSchoolContactPhone] = useState('');
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [isNewSchool, setIsNewSchool] = useState(false);
  const schoolDropdownRef = useRef<HTMLDivElement>(null);

  // Contract & Order fields
  const [orderNumber, setOrderNumber] = useState('');
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [financialYear, setFinancialYear] = useState('2026-27');
  const [orderType, setOrderType] = useState<'' | 'GeM Direct' | 'GeM L1 Bid' | 'State Tender' | 'Direct Supply'>('');

  // Category & Custom Category Creation
  const [category, setCategory] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryPrice, setNewCategoryPrice] = useState<number>(75000);

  // Commercial & Financials (Inclusive 18% GST calculation)
  const [totalInclusiveOrderValue, setTotalInclusiveOrderValue] = useState<number>(0);
  const [expectedDeliveryDays, setExpectedDeliveryDays] = useState<number>(0);

  // Agent allocation
  const [agentId, setAgentId] = useState('');
  const [agentName, setAgentName] = useState('');
  const [agentCode, setAgentCode] = useState('');
  const [agentCommissionPercentage, setAgentCommissionPercentage] = useState<number>(0);
  const [company, setCompany] = useState('');

  const [internalNotes, setInternalNotes] = useState('');

  // Duplicate GeM Order Number Warning & blocker
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadMasterData() {
      try {
        const [sList, aList, pList] = await Promise.all([getSchools(), getAgents(), getProducts()]);
        setSchools(sList);
        setAgents(aList);
        setProducts(pList);
      } catch (e) {
        console.error('Error loading master data', e);
      } finally {
        setLoadingMaster(false);
      }
    }
    loadMasterData();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (schoolDropdownRef.current && !schoolDropdownRef.current.contains(e.target as Node)) {
        setShowSchoolDropdown(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter existing schools matching typed name
  const filteredSchools = schools.filter(s => {
    if (!schoolName.trim()) return false;
    const q = schoolName.toLowerCase().trim();
    return (
      s.schoolName.toLowerCase().includes(q) ||
      (s.schoolCode && s.schoolCode.toLowerCase().includes(q)) ||
      s.state.toLowerCase().includes(q)
    );
  });

  const exactSchoolMatch = schools.find(
    s => s.schoolName.toLowerCase().trim() === schoolName.toLowerCase().trim()
  );

  // Standard laboratory and equipment categories
  const defaultStandardCategories = [
    'ATL Lab Equipment & Components',
    'Mathematics Laboratory Kit',
    'Robotics & IoT Starter Kit',
    'Composite Science Lab Set',
    'Digital Smart Classroom Package',
    'Language Lab System',
    'AI & Machine Learning Lab Kit',
    'Astronomy & Telescope Club Kit',
    'Physics Laboratory Standard Apparatus',
    'Chemistry Laboratory Glassware & Reagent Set',
    'Biology Specimen & Microscope Package'
  ];

  const allAvailableCategories = Array.from(
    new Set([
      ...defaultStandardCategories,
      ...products.map(p => p.name),
      ...products.map(p => p.category).filter(Boolean)
    ])
  );

  const filteredCategories = allAvailableCategories.filter(cat => {
    if (!category.trim()) return true;
    return cat.toLowerCase().includes(category.toLowerCase().trim());
  });

  const exactCategoryMatch = allAvailableCategories.some(
    cat => cat.toLowerCase().trim() === category.toLowerCase().trim()
  );

  const handleSelectSchool = (s: School) => {
    setSelectedSchoolId(s.schoolId);
    setSchoolName(s.schoolName);
    setSchoolType(s.schoolType);
    setSchoolCode(s.schoolCode || '');
    setState(s.state);
    setDistrict(s.district || '');
    setSchoolAddress(s.address || '');
    setPrincipalName(s.principalName || '');
    setSchoolContactPhone(s.contactPhone || '');
    setShowSchoolDropdown(false);
    setIsNewSchool(false);
  };

  const handleAddNewSchoolDirectly = () => {
    setSelectedSchoolId('');
    setIsNewSchool(true);
    setShowSchoolDropdown(false);
  };

  const handleAgentChange = (selectedId: string) => {
    const found = agents.find(a => a.agentId === selectedId);
    if (found) {
      setAgentId(found.agentId);
      setAgentName(found.name);
      setAgentCode(found.agentCode);
      setAgentCommissionPercentage(found.commissionPercentage || 10);
    } else {
      setAgentId('AGT-DIRECT');
      setAgentName('In-House / Direct Tender');
      setAgentCode('AGT-DIR');
      setAgentCommissionPercentage(0);
    }
  };

  const handleCategorySelect = (cat: string) => {
    setCategory(cat);
    setShowCategoryDropdown(false);
    const prod = products.find(p => p.name === cat || p.category === cat);
    if (prod && prod.standardPrice) {
      setTotalInclusiveOrderValue(prod.standardPrice);
    }
  };

  const handleCreateAndSelectCategory = async (catName: string) => {
    const trimmed = catName.trim();
    if (!trimmed) return;
    try {
      const createdProd = await createProduct(
        {
          name: trimmed,
          category: trimmed,
          standardPrice: newCategoryPrice || 50000,
          unit: 'Kit',
          hsnCode: '90230090',
          taxRate: 18,
          description: `Custom registered equipment package: ${trimmed}`,
          isActive: true
        },
        currentUser
      );
      setProducts(prev => [createdProd, ...prev]);
      setCategory(createdProd.name);
      setTotalInclusiveOrderValue(newCategoryPrice || 50000);
      setShowCategoryDropdown(false);
      setShowNewCategoryModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to register equipment category');
    }
  };

  const handleCreateNewCategory = async () => {
    if (!newCategoryName.trim()) return;
    await handleCreateAndSelectCategory(newCategoryName);
    setNewCategoryName('');
  };

  // Check duplicate GeM order number & PO number in real-time
  useEffect(() => {
    const checkOrder = orderNumber.trim();
    const checkPO = purchaseOrderNumber.trim();

    if (checkOrder || checkPO) {
      checkPotentialDuplicateOrder(schoolName, checkPO, checkOrder).then(match => {
        if (match) {
          const conflicting =
            match.orderNumber.toLowerCase() === checkOrder.toLowerCase()
              ? `Contract / GeM Order #${match.orderNumber}`
              : `PO #${match.purchaseOrderNumber}`;
          setDuplicateWarning(
            `Duplicate GeM Order Prohibited: An order with ${conflicting} already exists for ${match.schoolName} (Order ID: ${match.orderId}).`
          );
        } else {
          setDuplicateWarning(null);
        }
      });
    } else {
      setDuplicateWarning(null);
    }
  }, [orderNumber, purchaseOrderNumber, schoolName]);

  // Mathematical GST calculation (Total Order Value is inclusive of 18% GST)
  // Taxable Value = Inclusive Value / 1.18
  // GST Amount = Inclusive Value - Taxable Value
  const taxableValue = Number((totalInclusiveOrderValue / 1.18).toFixed(2));
  const gstAmount = Number((totalInclusiveOrderValue - taxableValue).toFixed(2));
  const baseOrderValue = taxableValue;
  const grossOrderValue = totalInclusiveOrderValue;

  // Expected delivery date
  const expectedDeliveryDate = new Date(Date.now() + expectedDeliveryDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (duplicateWarning) {
      alert('Cannot create order: Duplicate GeM order number detected. Please provide a unique order number.');
      return;
    }
    if (!schoolName.trim()) {
      alert('Please provide a school name.');
      return;
    }
    if (!schoolType) {
      alert('Please select an institution type.');
      return;
    }
    if (!orderDate) {
      alert('Please select an order date.');
      return;
    }
    if (!orderType) {
      alert('Please select a procurement mode.');
      return;
    }
    if (!agentId) {
      alert('Please select an assigned regional agent (or In-House / Direct Tender).');
      return;
    }
    if (totalInclusiveOrderValue <= 0) {
      alert('Total order value must be greater than zero.');
      return;
    }
    if (!expectedDeliveryDays) {
      alert('Please select a delivery lead time.');
      return;
    }
    if (!company.trim()) {
      alert('Please provide the company name.');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalSchoolId = selectedSchoolId;

      // If school does not exist in registry, automatically create and persist it now!
      if (!finalSchoolId || !exactSchoolMatch) {
        try {
          const newSchoolRecord = await createSchool(
            {
              schoolName: schoolName.trim(),
              schoolType,
              schoolCode: schoolCode.trim() || `SCH-${Date.now().toString().slice(-4)}`,
              state: state.trim() || 'General',
              district: district.trim() || 'General',
              address: schoolAddress.trim() || `${schoolName}, ${district}, ${state}`,
              principalName: principalName.trim(),
              contactPhone: schoolContactPhone.trim(),
              email: '',
              status: 'Active'
            },
            currentUser
          );
          finalSchoolId = newSchoolRecord.schoolId;
        } catch (schoolErr: any) {
          console.warn('Could not auto-create school in database:', schoolErr);
          finalSchoolId = `SCH-${Date.now()}`;
        }
      }

      // If category does not exist in master product catalog, auto-create and persist it!
      const existingProduct = products.find(
        p => p.name.toLowerCase().trim() === category.toLowerCase().trim()
      );
      if (!existingProduct && category.trim()) {
        try {
          await createProduct(
            {
              name: category.trim(),
              category: category.trim(),
              standardPrice: baseOrderValue || 50000,
              unit: 'Kit',
              hsnCode: '90230090',
              taxRate: 18,
              description: `Auto-registered from New Order workflow: ${category.trim()}`,
              isActive: true
            },
            currentUser
          );
        } catch (catErr) {
          console.warn('Could not auto-create equipment package in catalog:', catErr);
        }
      }

      const created = await createOrder(
        {
          orderNumber: orderNumber.trim(),
          financialYear,
          orderDate,
          orderType,
          schoolId: finalSchoolId,
          schoolName: schoolName.trim(),
          schoolType,
          schoolCode: schoolCode.trim(),
          state: state.trim() || 'General',
          district: district.trim() || 'General',
          schoolAddress: schoolAddress.trim(),
          principalName: principalName.trim(),
          schoolContactPhone: schoolContactPhone.trim(),
          agentId,
          agentName,
          agentCode,
          agentCommissionPercentage,
          company: company.trim(),
          category,
          orderValue: totalInclusiveOrderValue,
          taxAmount: gstAmount,
          grossOrderValue: totalInclusiveOrderValue,
          totalAmount: totalInclusiveOrderValue,
          amountReceived: 0,
          amountPending: totalInclusiveOrderValue,
          paymentStatus: 'PAYMENT_PENDING',
          status: 'PO_RECEIVED',
          dispatchStatus: 'NOT_READY',
          deliveryStatus: 'Pending',
          invoiceStatus: 'PENDING',
          purchaseOrderNumber: purchaseOrderNumber.trim() || orderNumber.trim(),
          expectedDeliveryDate,
          internalNotes
        },
        currentUser
      );

      onOrderCreated(created);
    } catch (err: any) {
      alert(err.message || 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Create New Order</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter official school name, GeM order details, equipment package, and inclusive order value
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Duplicate GeM Order Warning Banner */}
        {duplicateWarning && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex items-center gap-2 text-rose-800 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{duplicateWarning}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Section 1: Official School Search, Dropdown & Instant Registry */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <span>School & Institution Particulars</span>
              </h3>
              {exactSchoolMatch ? (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>Existing School in Registry</span>
                </span>
              ) : schoolName.trim() ? (
                <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                  <PlusCircle className="w-3 h-3" />
                  <span>Will be auto-saved to School Registry</span>
                </span>
              ) : null}
            </div>

            {/* Official School Name with Live Autocomplete Dropdown */}
            <div className="relative" ref={schoolDropdownRef}>
              <label className="block text-slate-700 font-semibold mb-1">
                Official School Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => {
                    setSchoolName(e.target.value);
                    setShowSchoolDropdown(true);
                    setSelectedSchoolId('');
                  }}
                  onFocus={() => setShowSchoolDropdown(true)}
                  placeholder="Type official school name (e.g. Kendriya Vidyalaya No. 1, Bhubaneswar)"
                  className="w-full pl-3 pr-8 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-xs"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Autocomplete suggestions dropdown */}
              {showSchoolDropdown && schoolName.trim() && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {filteredSchools.length > 0 ? (
                    filteredSchools.map((s) => (
                      <button
                        key={s.schoolId}
                        type="button"
                        onClick={() => handleSelectSchool(s)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{s.schoolName}</div>
                          <div className="text-[11px] text-slate-500">
                            {s.schoolType} • {s.district ? `${s.district}, ` : ''}{s.state} {s.schoolCode ? `• Code: ${s.schoolCode}` : ''}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                          Select
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-slate-500 text-center">
                      No matching registered school found.
                    </div>
                  )}

                  {/* Option to create brand new school immediately */}
                  {!exactSchoolMatch && (
                    <button
                      type="button"
                      onClick={handleAddNewSchoolDirectly}
                      className="w-full text-left px-3 py-2.5 bg-amber-50/80 hover:bg-amber-100 text-amber-900 font-bold flex items-center gap-2 transition-colors border-t border-amber-200"
                    >
                      <PlusCircle className="w-4 h-4 text-amber-600" />
                      <span>Create and Register &quot;{schoolName}&quot; as New School</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* School Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Institution Type <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={schoolType}
                  onChange={(e) => setSchoolType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-1 focus:ring-amber-500"
                >
                  <option value="" disabled>Select institution type...</option>
                  <option value="Kendriya Vidyalaya">Kendriya Vidyalaya (KV)</option>
                  <option value="Jawahar Navodaya Vidyalaya">Jawahar Navodaya Vidyalaya (JNV)</option>
                  <option value="PM SHRI School">PM SHRI School</option>
                  <option value="State Government School">State Government School</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">State / UT <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Odisha"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Principal / Contact Person</label>
                <input
                  type="text"
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                  placeholder="e.g. Dr. P. K. Mohapatra"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Principal / Contact Mobile</label>
                <input
                  type="text"
                  value={schoolContactPhone}
                  onChange={(e) => setSchoolContactPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contract & Order Particulars (with duplicate GeM order validation) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-slate-500" />
              <span>Contract & Order Particulars</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  GeM Order / Contract No <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border font-mono font-semibold ${
                    duplicateWarning ? 'border-rose-500 bg-rose-50 text-rose-900' : 'border-slate-300 bg-white'
                  }`}
                  placeholder="GEMC-5116877..."
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">GeM PO Number</label>
                <input
                  type="text"
                  value={purchaseOrderNumber}
                  onChange={(e) => setPurchaseOrderNumber(e.target.value)}
                  placeholder="PO-2026-..."
                  className={`w-full px-3 py-2 rounded-lg border font-mono ${
                    duplicateWarning ? 'border-rose-500 bg-rose-50 text-rose-900' : 'border-slate-300 bg-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Order Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Procurement Mode <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
                >
                  <option value="" disabled>Select procurement mode...</option>
                  <option value="GeM Direct">GeM Direct Purchase</option>
                  <option value="GeM L1 Bid">GeM L1 Bid</option>
                  <option value="State Tender">State Tender</option>
                  <option value="Direct Supply">Direct Supply Order</option>
                </select>
              </div>
            </div>

            {/* Category / Equipment Package Dropdown with Direct Creation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative" ref={categoryDropdownRef}>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold">
                    Category / Equipment Package <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewCategoryModal(!showNewCategoryModal)}
                    className="text-[11px] text-amber-700 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Configure Package</span>
                  </button>
                </div>
                
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setShowCategoryDropdown(true);
                    }}
                    onFocus={() => setShowCategoryDropdown(true)}
                    placeholder="Search equipment or type new package name..."
                    className="w-full px-3 py-2 pr-8 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <ChevronDown
                    className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none cursor-pointer"
                  />
                </div>

                {/* Category Search Dropdown Menu */}
                {showCategoryDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {/* Create New Option if typed category has no exact match */}
                    {!exactCategoryMatch && category.trim() && (
                      <button
                        type="button"
                        onClick={() => handleCreateAndSelectCategory(category)}
                        className="w-full text-left px-3 py-2.5 bg-amber-50/90 hover:bg-amber-100 text-amber-950 font-bold text-xs flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Create New Category: "{category.trim()}"</span>
                        </div>
                        <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-mono">
                          Add to Catalog
                        </span>
                      </button>
                    )}

                    {/* Filtered list of existing categories */}
                    {filteredCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategorySelect(cat)}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors flex items-center justify-between ${
                          cat === category ? 'bg-amber-50/60 font-bold text-amber-950' : 'text-slate-800'
                        }`}
                      >
                        <span className="truncate">{cat}</span>
                        {cat === category && (
                          <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        )}
                      </button>
                    ))}

                    {filteredCategories.length === 0 && !category.trim() && (
                      <div className="p-3 text-center text-xs text-slate-400">
                        Type to search or register equipment
                      </div>
                    )}
                  </div>
                )}

                {/* Inline Category Creation Expandable Form */}
                {showNewCategoryModal && (
                  <div className="mt-2 p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                    <div className="font-bold text-amber-950 text-[11px]">Register New Equipment Package</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Package Name (e.g. Drone Technology Lab)"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Standard Price ₹"
                        value={newCategoryPrice}
                        onChange={(e) => setNewCategoryPrice(Number(e.target.value))}
                        className="px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowNewCategoryModal(false)}
                        className="px-2 py-1 text-slate-600 hover:text-slate-800 text-[11px]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateNewCategory}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px]"
                      >
                        Save &amp; Select
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Assigned Regional Agent <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={agentId}
                  onChange={(e) => handleAgentChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900"
                >
                  <option value="" disabled>Select agent...</option>
                  <option value="AGT-DIRECT">In-House / Direct Tender (No Agent)</option>
                  {agents.map(a => (
                    <option key={a.agentId} value={a.agentId}>
                      {a.name} ({a.agentCode} - {a.state})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Company <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="" disabled>Select company...</option>
                <option value="FIPL">FIPL</option>
                <option value="ARKAY">ARKAY</option>
                <option value="VIGNAN">VIGNAN</option>
                <option value="TTPL">TTPL</option>
              </select>
            </div>
          </div>

          {/* Section 3: Value & Commercial Calculation (Inclusive 18% GST Calculation) */}
          <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-amber-950 uppercase tracking-wider text-[11px]">
                Commercial Value (18% GST Inclusive Mathematics)
              </h3>
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                18% GST Deducted Automatically
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-amber-950 font-bold mb-1">
                  Total Order Value (Inclusive of 18% GST) ₹ <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={totalInclusiveOrderValue}
                  onChange={(e) => setTotalInclusiveOrderValue(Number(e.target.value))}
                  placeholder="Enter total gross invoice amount including 18% GST"
                  className="w-full px-3 py-2 rounded-lg border border-amber-400 bg-white font-bold font-mono text-sm text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[11px] text-amber-800 mt-1">
                  Input the final GeM contract figure. The system automatically computes and extracts the 18% GST component.
                </p>
              </div>

              <div>
                <label className="block text-amber-950 font-semibold mb-1">
                  Delivery Lead Time <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={expectedDeliveryDays || ''}
                  onChange={(e) => setExpectedDeliveryDays(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white font-medium"
                >
                  <option value="" disabled>Select delivery timeline...</option>
                  <option value={7}>7 Days (Express)</option>
                  <option value={14}>14 Days (Standard KV/JNV)</option>
                  <option value={21}>21 Days</option>
                  <option value={30}>30 Days (Tender Specification)</option>
                  <option value={45}>45 Days</option>
                </select>
                <div className="text-[11px] text-slate-600 mt-1 font-mono">
                  Expected Delivery: <span className="font-semibold">{expectedDeliveryDate}</span>
                </div>
              </div>
            </div>

            {/* Reverse GST Breakdown Card */}
            <div className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-xs grid grid-cols-3 gap-3 text-center">
              <div className="p-2 rounded-lg bg-slate-50">
                <div className="text-[10px] uppercase font-bold text-slate-500">Order Value (Incl. 18% GST)</div>
                <div className="text-sm font-black text-slate-900 mt-0.5">
                  <CurrencyFormatter amount={totalInclusiveOrderValue} />
                </div>
              </div>

              <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200">
                <div className="text-[10px] uppercase font-bold text-amber-800">GST @ 18%</div>
                <div className="text-sm font-bold text-amber-700 mt-0.5">
                  <CurrencyFormatter amount={gstAmount} showDecimals={true} />
                </div>
              </div>

              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="text-[10px] uppercase font-bold text-emerald-800">Taxable Value (Excl. GST)</div>
                <div className="text-sm font-bold text-emerald-700 mt-0.5">
                  <CurrencyFormatter amount={taxableValue} showDecimals={true} />
                </div>
              </div>
            </div>
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Internal Reference / Remarks</label>
            <textarea
              rows={2}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="e.g. GeM contract terms, special lab installation requirements, consignee contact notes..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <div className="text-xs text-slate-500">
              {duplicateWarning ? (
                <span className="text-rose-600 font-bold">Resolve duplicate order error to proceed</span>
              ) : (
                <span>Order will be registered under <span className="font-semibold text-slate-800">PO Received</span> status</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !!duplicateWarning}
                className={`px-5 py-2 rounded-lg font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                  duplicateWarning || isSubmitting
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 hover:shadow-md'
                }`}
              >
                {isSubmitting ? (
                  <span>Registering Order...</span>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Create &amp; Save Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
