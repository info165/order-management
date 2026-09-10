import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, Plus, Phone, Mail, MapPin, Award, CheckCircle, X } from 'lucide-react';
import { Agent, Order, UserProfile } from '../../types';
import { getAgents, createAgent } from '../../services/dataService';
import { CurrencyFormatter } from '../common/CurrencyFormatter';
import { getDisplaySerialNo } from '../../utils/orderDisplay';

interface AgentManagerProps {
  orders: Order[];
  currentUser: UserProfile;
  onSelectOrder: (order: Order) => void;
}

export const AgentManager: React.FC<AgentManagerProps> = ({ orders, currentUser, onSelectOrder }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newState, setNewState] = useState('');
  const [newCommission, setNewCommission] = useState<number>(10);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const data = await getAgents();
      setAgents(data);
      if (data.length > 0 && !selectedAgent) {
        setSelectedAgent(data[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  // Compute agent statistics
  const agentStats = useMemo(() => {
    const stats: {
      [agentId: string]: {
        orderCount: number;
        totalValue: number;
        collected: number;
        pending: number;
        commissionEarned: number;
      };
    } = {};

    agents.forEach(a => {
      const aOrders = orders.filter(o => o.agentId === a.agentId);
      const orderCount = aOrders.length;
      const totalValue = aOrders.reduce((acc, o) => acc + o.orderValue, 0);
      const collected = aOrders.reduce((acc, o) => acc + (o.amountReceived || 0), 0);
      const pending = aOrders.reduce((acc, o) => acc + (o.amountPending ?? Math.max(0, o.orderValue - (o.amountReceived || 0))), 0);
      const commissionRate = (a.commissionPercentage || 10) / 100;
      const commissionEarned = Math.round(collected * commissionRate);

      stats[a.agentId] = { orderCount, totalValue, collected, pending, commissionEarned };
    });

    return stats;
  }, [agents, orders]);

  const filteredAgents = useMemo(() => {
    return agents.filter(a => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.agentCode.toLowerCase().includes(q) ||
        (a.state && a.state.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q))
      );
    });
  }, [agents, search]);

  const selectedAgentOrders = useMemo(() => {
    if (!selectedAgent) return [];
    return orders.filter(o => o.agentId === selectedAgent.agentId);
  }, [orders, selectedAgent]);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const created = await createAgent(
        {
          name: newName,
          email: newEmail,
          phone: newPhone,
          state: newState,
          commissionPercentage: newCommission,
          isActive: true
        },
        currentUser
      );
      setShowAddModal(false);
      await loadAgents();
      setSelectedAgent(created);
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
            <Users className="w-5 h-5 text-amber-600" />
            <span>Regional Partners & Institutional Associates</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Partner network managing Kendriya Vidyalaya and Navodaya school relations and treasury follow-up
          </p>
        </div>

        {currentUser.role !== 'AGENT' && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Partner</span>
          </button>
        )}
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Agent Cards */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
          <div className="p-3 border-b border-slate-200 bg-slate-50/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search agent name, state, code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredAgents.map((a) => {
              const isSelected = selectedAgent?.agentId === a.agentId;
              const s = agentStats[a.agentId] || { orderCount: 0, totalValue: 0, collected: 0, commissionEarned: 0 };
              return (
                <div
                  key={a.agentId}
                  onClick={() => setSelectedAgent(a)}
                  className={`p-4 cursor-pointer text-xs transition-colors flex items-center justify-between ${
                    isSelected ? 'bg-amber-50/70 border-l-4 border-amber-500' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{a.name}</span>
                      <span className="font-mono text-[10px] px-1.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {a.agentCode}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{a.state || 'National'}</span>
                      <span>•</span>
                      <span className="font-mono text-emerald-700">{a.commissionPercentage || 10}% Commission</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-900">
                      <CurrencyFormatter amount={s.totalValue} />
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{s.orderCount} orders</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Agent Dashboard & Assigned Orders */}
        <div className="lg:col-span-2 space-y-6">
          {selectedAgent ? (
            <div className="space-y-6">
              {/* Agent Overview Profile */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                        {selectedAgent.agentCode}
                      </span>
                      <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Active Partner
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">{selectedAgent.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                      <span>Territory: <strong className="text-slate-800">{selectedAgent.state || 'All India'}</strong></span>
                      <span>•</span>
                      <span>Phone: <strong className="text-slate-800 font-mono">{selectedAgent.phone || 'N/A'}</strong></span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Agreed Margin</span>
                    <div className="text-xl font-bold font-mono text-amber-600">
                      {selectedAgent.commissionPercentage || 10}%
                    </div>
                  </div>
                </div>

                {/* Agent Performance Metric Badges */}
                {(() => {
                  const s = agentStats[selectedAgent.agentId] || { orderCount: 0, totalValue: 0, collected: 0, pending: 0, commissionEarned: 0 };
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[11px]">Total Booked</span>
                        <span className="font-bold text-slate-800 text-sm mt-0.5 block font-mono">
                          <CurrencyFormatter amount={s.totalValue} />
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[11px]">School Payment Recv</span>
                        <span className="font-bold text-emerald-700 text-sm mt-0.5 block font-mono">
                          <CurrencyFormatter amount={s.collected} />
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[11px]">School Outstanding</span>
                        <span className="font-bold text-amber-700 text-sm mt-0.5 block font-mono">
                          <CurrencyFormatter amount={s.pending} />
                        </span>
                      </div>

                      <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <span className="text-amber-800 block text-[11px] font-semibold">Commission Earned</span>
                        <span className="font-bold text-amber-900 text-sm mt-0.5 block font-mono">
                          <CurrencyFormatter amount={s.commissionEarned} />
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Agent's Assigned Orders */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    Allocated Orders for {selectedAgent.name}
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">{selectedAgentOrders.length} orders</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Order ID</th>
                        <th className="px-4 py-2.5">School Name</th>
                        <th className="px-4 py-2.5">Category</th>
                        <th className="px-4 py-2.5 text-right">Value (₹)</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedAgentOrders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No orders currently allocated to this agent.
                          </td>
                        </tr>
                      ) : (
                        selectedAgentOrders.map((o) => (
                          <tr
                            key={o.orderId}
                            onClick={() => onSelectOrder(o)}
                            className="hover:bg-slate-50 cursor-pointer"
                          >
                            <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                              {currentUser.role !== 'AGENT' && getDisplaySerialNo(o, orders)
                                ? `Order No - ${getDisplaySerialNo(o, orders)}`
                                : o.orderId}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-slate-800 max-w-[200px] truncate">
                              {o.schoolName}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600">{o.category}</td>
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
              Select an agent from the left directory to review performance metrics and assigned orders.
            </div>
          )}
        </div>
      </div>

      {/* Add Agent Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Add Regional Partner</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra Pathak"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="ramesh@agents.govschool.in"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mobile Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98765 11223"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assigned State / Region</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Madhya Pradesh"
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Commission Margin (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={newCommission}
                    onChange={(e) => setNewCommission(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
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
                  Register Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
