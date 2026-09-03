import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserPlus, Lock, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { UserProfile, UserRole } from '../../types';
import { getUsers, updateUserRole } from '../../services/dataService';

const ROLE_DESCRIPTIONS: Record<string, string> = {
  SUPER_ADMIN: 'Root authority with full access to user management, audit logs, and system settings.',
  ADMIN: 'Operations supervisor managing orders, schools, dispatches, and invoicing.',
  SALES_COORDINATOR: 'Registers GeM purchase orders and coordinates institutional deliveries.',
  ACCOUNTS: 'Manages invoices, bank transaction references, and payment status updates.',
  WAREHOUSE: 'Handles packing, dispatch manifests, courier selection, and tracking dockets.',
  AGENT: 'Restricted regional field agent. Isolated view to only assigned school orders.'
};

interface UserRoleManagerProps {
  currentUser: UserProfile;
}

export const UserRoleManager: React.FC<UserRoleManagerProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('AGENT');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (editingUser.email.toLowerCase() === 'info@funscholar.com' && newRole !== 'SUPER_ADMIN') {
      alert('Cannot change the role of the primary Super Admin (info@funscholar.com).');
      return;
    }

    try {
      await updateUserRole(editingUser.userId, newRole, currentUser);
      setEditingUser(null);
      await loadUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <span>Role-Based Access Control & User Directory</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Administer internal staff permissions, regional agent access boundaries, and ABAC policies
          </p>
        </div>

        <div className="bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-amber-700" />
          <span className="font-semibold font-mono">info@funscholar.com</span>
          <span className="text-[10px] bg-amber-200/80 px-1.5 py-0.2 rounded font-bold">PERMANENT ROOT</span>
        </div>
      </div>

      {/* Role Explanations Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
        {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
          <div key={role} className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs space-y-1">
            <div className="font-bold text-[11px] text-slate-900 font-mono">{role}</div>
            <div className="text-[10px] text-slate-500 line-clamp-3">{desc}</div>
          </div>
        ))}
      </div>

      {/* User Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
            Registered Users ({users.length})
          </h3>
          <span className="text-xs text-slate-400">Strict ABAC Enforced</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">User Name</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Assigned Agent ID</th>
                <th className="px-4 py-3">Territory</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isRoot = u.email.toLowerCase() === 'info@funscholar.com';
                return (
                  <tr key={u.userId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-2">
                      {isRoot && <Lock className="w-3.5 h-3.5 text-amber-600" />}
                      <span>{u.name}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                        u.role === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                        u.role === 'ADMIN' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                        u.role === 'ACCOUNTS' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        u.role === 'WAREHOUSE' ? 'bg-orange-50 text-orange-800 border-orange-200' :
                        'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {u.agentId || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {u.state || 'All India'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isRoot ? (
                        <span className="text-[11px] text-slate-400 italic">Locked</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUser(u);
                            setNewRole(u.role);
                          }}
                          className="text-amber-600 hover:text-amber-700 font-semibold text-[11px]"
                        >
                          Modify Role
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Change User Role</h3>
              <button type="button" onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div>
                <span className="text-slate-500 block">Modifying permissions for:</span>
                <span className="font-bold text-slate-900 text-sm block">{editingUser.name} ({editingUser.email})</span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select New System Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-semibold"
                >
                  <option value="ADMIN">ADMIN (Full Operations)</option>
                  <option value="SALES_COORDINATOR">SALES_COORDINATOR (Order entry & GeM)</option>
                  <option value="ACCOUNTS">ACCOUNTS (Billing & Payments only)</option>
                  <option value="WAREHOUSE">WAREHOUSE (Dispatch & Dockets only)</option>
                  <option value="AGENT">AGENT (Assigned Orders Only)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-sm"
                >
                  Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
