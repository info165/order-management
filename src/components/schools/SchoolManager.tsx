import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  Search,
  Plus,
  MapPin,
  Phone,
  Building,
  ChevronRight,
  ExternalLink,
  X
} from 'lucide-react';
import { School, Order, UserProfile } from '../../types';
import { getSchools, createSchool } from '../../services/dataService';
import { CurrencyFormatter } from '../common/CurrencyFormatter';

interface SchoolManagerProps {
  orders: Order[];
  currentUser: UserProfile;
  onSelectOrder: (order: Order) => void;
}

export const SchoolManager: React.FC<SchoolManagerProps> = ({ orders, currentUser, onSelectOrder }) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedState, setSelectedState] = useState('ALL');
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  // New school modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolType, setNewSchoolType] = useState<any>('Kendriya Vidyalaya');
  const [newState, setNewState] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [newSchoolCode, setNewSchoolCode] = useState('');
  const [newPrincipal, setNewPrincipal] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const loadSchools = async () => {
    setLoading(true);
    try {
      const data = await getSchools();
      setSchools(data);
      if (data.length > 0 && !selectedSchool) {
        setSelectedSchool(data[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchools();
  }, []);

  const states = useMemo(() => Array.from(new Set(schools.map(s => s.state))).filter(Boolean), [schools]);

  const filteredSchools = useMemo(() => {
    return schools.filter(s => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          s.schoolName.toLowerCase().includes(q) ||
          (s.schoolCode && s.schoolCode.toLowerCase().includes(q)) ||
          s.state.toLowerCase().includes(q) ||
          (s.district && s.district.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (selectedType !== 'ALL' && s.schoolType !== selectedType) return false;
      if (selectedState !== 'ALL' && s.state !== selectedState) return false;
      return true;
    });
  }, [schools, search, selectedType, selectedState]);

  // Orders for currently selected school
  const schoolOrders = useMemo(() => {
    if (!selectedSchool) return [];
    return orders.filter(
      o => o.schoolId === selectedSchool.schoolId || o.schoolName.toLowerCase() === selectedSchool.schoolName.toLowerCase()
    );
  }, [orders, selectedSchool]);

  const totalValue = schoolOrders.reduce((acc, o) => acc + o.orderValue, 0);

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim()) return;
    try {
      const created = await createSchool(
        {
          schoolName: newSchoolName,
          schoolType: newSchoolType,
          state: newState,
          district: newDistrict,
          schoolCode: newSchoolCode,
          principalName: newPrincipal,
          contactPhone: newPhone
        },
        currentUser
      );
      setShowAddModal(false);
      await loadSchools();
      setSelectedSchool(created);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-amber-600" />
            <span>Government School Directory (KV & JNV)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional master records, procurement history, and regional campus details
          </p>
        </div>

        {currentUser.role !== 'AGENT' && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add School</span>
          </button>
        )}
      </div>

      {/* Main split view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Schools List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
          <div className="p-3 border-b border-slate-200 space-y-2 bg-slate-50/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search school name, state, code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-2 py-1 rounded border border-slate-200 bg-white text-slate-700 text-[11px]"
              >
                <option value="ALL">All Types</option>
                <option value="Kendriya Vidyalaya">Kendriya Vidyalaya</option>
                <option value="Jawahar Navodaya Vidyalaya">Navodaya (JNV)</option>
                <option value="PM SHRI School">PM SHRI</option>
              </select>

              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="px-2 py-1 rounded border border-slate-200 bg-white text-slate-700 text-[11px]"
              >
                <option value="ALL">All States</option>
                {states.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredSchools.map((s) => {
              const isSelected = selectedSchool?.schoolId === s.schoolId;
              const count = orders.filter(o => o.schoolName.toLowerCase() === s.schoolName.toLowerCase()).length;
              return (
                <div
                  key={s.schoolId}
                  onClick={() => setSelectedSchool(s)}
                  className={`p-3.5 cursor-pointer text-xs transition-colors flex items-center justify-between ${
                    isSelected ? 'bg-amber-50/70 border-l-4 border-amber-500' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900 line-clamp-1">{s.schoolName}</div>
                    <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
                      <span className="font-medium text-slate-700">{s.schoolType}</span>
                      <span>•</span>
                      <span>{s.state}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-600">
                      {count} {count === 1 ? 'order' : 'orders'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected School Details & Order History */}
        <div className="lg:col-span-2 space-y-6">
          {selectedSchool ? (
            <div className="space-y-6">
              {/* School Info Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {selectedSchool.schoolCode || selectedSchool.schoolId}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedSchool.schoolName}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{selectedSchool.schoolType}</span>
                      <span>•</span>
                      <span>{selectedSchool.district ? `${selectedSchool.district}, ` : ''}{selectedSchool.state}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Procurement</div>
                    <div className="text-lg font-bold font-mono text-slate-900">
                      <CurrencyFormatter amount={totalValue} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Principal / Contact</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">
                      {selectedSchool.principalName || 'Principal'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Contact Mobile / Phone</span>
                    <span className="font-mono text-slate-700 block mt-0.5">
                      {selectedSchool.contactPhone || 'Available on PO'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Campus Delivery Pin</span>
                    <span className="font-mono text-slate-700 block mt-0.5">
                      {selectedSchool.pincode || 'Verified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* School Orders Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    Purchase Orders for {selectedSchool.schoolName}
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">{schoolOrders.length} records</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Order ID</th>
                        <th className="px-4 py-2.5">Category</th>
                        <th className="px-4 py-2.5">Agent</th>
                        <th className="px-4 py-2.5 text-right">Value (₹)</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {schoolOrders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No orders found for this school.
                          </td>
                        </tr>
                      ) : (
                        schoolOrders.map((o) => (
                          <tr
                            key={o.orderId}
                            onClick={() => onSelectOrder(o)}
                            className="hover:bg-slate-50 cursor-pointer"
                          >
                            <td className="px-4 py-2.5 font-mono font-bold text-slate-900">{o.orderId}</td>
                            <td className="px-4 py-2.5 text-slate-700">{o.category}</td>
                            <td className="px-4 py-2.5 text-slate-700">{o.agentName}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                              <CurrencyFormatter amount={o.orderValue} />
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                                {o.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                                {o.paymentStatus.replace(/_/g, ' ')}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
              Select a school from the directory to inspect procurement history and campus details.
            </div>
          )}
        </div>
      </div>

      {/* Add School Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Add New Government School</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSchool} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">School Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kendriya Vidyalaya No. 2 Agra Cantt"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">School Type</label>
                  <select
                    value={newSchoolType}
                    onChange={(e) => setNewSchoolType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  >
                    <option value="Kendriya Vidyalaya">Kendriya Vidyalaya</option>
                    <option value="Jawahar Navodaya Vidyalaya">Jawahar Navodaya Vidyalaya</option>
                    <option value="PM SHRI School">PM SHRI School</option>
                    <option value="State Government School">State Government School</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">School Code</label>
                  <input
                    type="text"
                    placeholder="e.g. KV-UP-0042"
                    value={newSchoolCode}
                    onChange={(e) => setNewSchoolCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">State</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Uttar Pradesh"
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">District</label>
                  <input
                    type="text"
                    placeholder="e.g. Agra"
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Principal Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. A. K. Sharma"
                    value={newPrincipal}
                    onChange={(e) => setNewPrincipal(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 94120 00000"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
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
                  Save School
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
