import React, { useState, useEffect } from 'react';
import { X, Building, Plus, AlertCircle, CheckCircle, Package } from 'lucide-react';
import { Order, School, Agent, Product, UserProfile } from '../../types';
import { getSchools, getAgents, getProducts, createOrder, checkPotentialDuplicateOrder } from '../../services/dataService';
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

  // Form Fields
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schoolType, setSchoolType] = useState<any>('Kendriya Vidyalaya');
  const [schoolCode, setSchoolCode] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [schoolContactPhone, setSchoolContactPhone] = useState('');

  const [orderNumber, setOrderNumber] = useState(`GEMC-${Math.floor(1000000000000 + Math.random() * 9000000000000)}`);
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [financialYear, setFinancialYear] = useState('2026-27');
  const [orderType, setOrderType] = useState<'GeM Direct' | 'GeM L1 Bid' | 'State Tender' | 'Direct Supply'>('GeM Direct');

  const [category, setCategory] = useState('ATL Lab Equipment & Components');
  const [orderValue, setOrderValue] = useState<number>(50000);
  const [taxRate, setTaxRate] = useState<number>(18);
  const [expectedDeliveryDays, setExpectedDeliveryDays] = useState<number>(14);

  const [agentId, setAgentId] = useState('AGT-DIRECT');
  const [agentName, setAgentName] = useState('In-House / Direct Tender');
  const [agentCode, setAgentCode] = useState('AGT-DIR');
  const [agentCommissionPercentage, setAgentCommissionPercentage] = useState<number>(10);

  const [internalNotes, setInternalNotes] = useState('');

  // Duplicate warning
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadMasterData() {
      try {
        const [sList, aList, pList] = await Promise.all([getSchools(), getAgents(), getProducts()]);
        setSchools(sList);
        setAgents(aList);
        setProducts(pList);
        if (sList.length > 0) {
          handleSelectSchool(sList[0]);
        }
      } catch (e) {
        console.error('Error loading master data', e);
      } finally {
        setLoadingMaster(false);
      }
    }
    loadMasterData();
  }, []);

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

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    const prod = products.find(p => p.name === cat || p.category === cat);
    if (prod && prod.standardPrice) {
      setOrderValue(prod.standardPrice);
    }
  };

  // Check duplicate PO
  useEffect(() => {
    if (purchaseOrderNumber.trim() && schoolName.trim()) {
      checkPotentialDuplicateOrder(schoolName, purchaseOrderNumber).then(match => {
        if (match) {
          setDuplicateWarning(`Warning: Order ${match.orderId} already exists with PO #${purchaseOrderNumber} for ${schoolName}!`);
        } else {
          setDuplicateWarning(null);
        }
      });
    } else {
      setDuplicateWarning(null);
    }
  }, [purchaseOrderNumber, schoolName]);

  const taxAmount = Math.round(orderValue * (taxRate / 100));
  const grossOrderValue = orderValue + taxAmount;

  // Expected delivery date
  const expectedDeliveryDate = new Date(Date.now() + expectedDeliveryDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim()) {
      alert('Please provide a school name.');
      return;
    }
    if (orderValue <= 0) {
      alert('Order value must be positive.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createOrder(
        {
          orderNumber,
          financialYear,
          orderDate,
          orderType,
          schoolId: selectedSchoolId || `SCH-${Date.now()}`,
          schoolName,
          schoolType,
          schoolCode,
          state,
          district,
          schoolAddress,
          principalName,
          schoolContactPhone,
          agentId,
          agentName,
          agentCode,
          agentCommissionPercentage,
          category,
          orderValue,
          taxAmount,
          grossOrderValue,
          totalAmount: grossOrderValue,
          amountReceived: 0,
          amountPending: grossOrderValue,
          paymentStatus: 'PAYMENT_PENDING',
          status: 'PO_RECEIVED',
          dispatchStatus: 'NOT_READY',
          deliveryStatus: 'Pending',
          invoiceStatus: 'PENDING',
          purchaseOrderNumber: purchaseOrderNumber || orderNumber,
          expectedDeliveryDate,
          internalNotes
        },
        currentUser
      );

      onOrderCreated(created);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Register New Government School Order</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              KV / JNV Purchase Order Entry with automatic GST computation and agent allocation
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Duplicate alert if found */}
        {duplicateWarning && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex items-center gap-2 text-rose-800 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{duplicateWarning}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {/* Section 1: School Selection */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <span>School & Institutional Beneficiary</span>
              </h3>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[11px]">Select from Registered Schools:</span>
                <select
                  value={selectedSchoolId}
                  onChange={(e) => {
                    const found = schools.find(s => s.schoolId === e.target.value);
                    if (found) handleSelectSchool(found);
                  }}
                  className="px-2 py-1 rounded border border-slate-300 bg-white font-medium focus:outline-none"
                >
                  <option value="">-- Choose Existing KV / JNV --</option>
                  {schools.map(s => (
                    <option key={s.schoolId} value={s.schoolId}>
                      {s.schoolName} ({s.state})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">Official School Name</label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. Kendriya Vidyalaya No. 1, Bhubaneswar"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Institution Type</label>
                <select
                  value={schoolType}
                  onChange={(e) => setSchoolType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-1 focus:ring-amber-500"
                >
                  <option value="Kendriya Vidyalaya">Kendriya Vidyalaya (KV)</option>
                  <option value="Jawahar Navodaya Vidyalaya">Jawahar Navodaya Vidyalaya (JNV)</option>
                  <option value="PM SHRI School">PM SHRI School</option>
                  <option value="State Government School">State Government School</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">State / UT</label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Odisha"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">District</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Khordha"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">School Code / UDISE</label>
                <input
                  type="text"
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value)}
                  placeholder="e.g. KV-OD-1102"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
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

          {/* Section 2: Order & Tender Info */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-slate-500" />
              <span>Contract & Order Particulars</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Contract / Order No</label>
                <input
                  type="text"
                  required
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">GeM PO Number</label>
                <input
                  type="text"
                  value={purchaseOrderNumber}
                  onChange={(e) => setPurchaseOrderNumber(e.target.value)}
                  placeholder="PO-2026-..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Order Date</label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Procurement Mode</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
                >
                  <option value="GeM Direct">GeM Direct Purchase</option>
                  <option value="GeM L1 Bid">GeM L1 Bid</option>
                  <option value="State Tender">State Tender</option>
                  <option value="Direct Supply">Direct Supply Order</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Category / Equipment Package</label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900"
                >
                  <option value="ATL Lab Equipment & Components">ATL Lab Equipment & Components</option>
                  <option value="Mathematics Laboratory Kit">Mathematics Laboratory Kit</option>
                  <option value="Robotics & IoT Starter Kit">Robotics & IoT Starter Kit</option>
                  <option value="Composite Science Lab Set">Composite Science Lab Set</option>
                  <option value="Digital Smart Classroom Package">Digital Smart Classroom Package</option>
                  <option value="Language Lab System">Language Lab System</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Assigned Regional Agent</label>
                <select
                  value={agentId}
                  onChange={(e) => handleAgentChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900"
                >
                  <option value="AGT-DIRECT">In-House / Direct Tender (No Agent)</option>
                  {agents.map(a => (
                    <option key={a.agentId} value={a.agentId}>
                      {a.name} ({a.agentCode} - {a.state})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Value & Commercial Calculation */}
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-3">
            <h3 className="font-bold text-amber-950 uppercase tracking-wider text-[11px]">
              Commercial Value & Financial Breakdown
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-amber-900 font-semibold mb-1">Order Value (Excl. GST) ₹</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={orderValue}
                  onChange={(e) => setOrderValue(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white font-bold font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-amber-900 font-semibold mb-1">GST Rate (%)</label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white font-mono"
                >
                  <option value={18}>18% GST (Standard)</option>
                  <option value={12}>12% GST</option>
                  <option value={5}>5% GST</option>
                  <option value={0}>0% (Tax Exempted)</option>
                </select>
              </div>

              <div>
                <label className="block text-amber-900 font-semibold mb-1">Delivery Lead Time</label>
                <select
                  value={expectedDeliveryDays}
                  onChange={(e) => setExpectedDeliveryDays(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white"
                >
                  <option value={7}>7 Days (Express)</option>
                  <option value={14}>14 Days (Standard)</option>
                  <option value={21}>21 Days</option>
                  <option value={30}>30 Days</option>
                </select>
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-amber-200 flex items-center justify-between font-mono text-xs">
              <div>
                <span className="text-slate-500">Base Amount: </span>
                <span className="font-bold text-slate-800"><CurrencyFormatter amount={orderValue} /></span>
              </div>
              <div>
                <span className="text-slate-500">+ GST ({taxRate}%): </span>
                <span className="font-bold text-slate-800"><CurrencyFormatter amount={taxAmount} /></span>
              </div>
              <div>
                <span className="text-slate-500">= Total Invoiced: </span>
                <span className="font-bold text-base text-amber-800"><CurrencyFormatter amount={grossOrderValue} /></span>
              </div>
            </div>
          </div>

          {/* Section 4: Operational Notes */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Internal Remarks & Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. GeM acceptance received, dispatch to be made from Delhi central warehouse"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Registering Order...' : 'Register Purchase Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
