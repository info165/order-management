import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Lock,
  Phone,
  Mail,
  Shield,
  X,
  Eye,
  EyeOff,
  KeyRound,
  Check,
  Building,
  RefreshCw
} from 'lucide-react';
import { UserProfile, UserRole } from '../../types';
import {
  getUsers,
  createUser,
  updateUserProfile,
  deleteUser,
  generatePasswordResetOtp
} from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';

interface UserManagerProps {
  currentUser: UserProfile;
}

const ROLE_CONFIG: Record<
  UserRole,
  { label: string; badgeClass: string; desc: string }
> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    desc: 'Full system control, user management, and security'
  },
  ADMIN: {
    label: 'Admin',
    badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    desc: 'Operations management and order processing'
  },
  DATA_ENTRY_OPERATOR: {
    label: 'Data Entry Operator',
    badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    desc: 'Registers orders, schools, and updates basic records'
  },
  AGENT: {
    label: 'Regional Partner',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    desc: 'Field agent restricted to assigned school orders'
  },
  ACCOUNTS: {
    label: 'Accounts / Finance',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    desc: 'Invoicing, payment entries, and ledger verification'
  },
  DISPATCH: {
    label: 'Dispatch & Logistics',
    badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    desc: 'Packing, courier tracking, and dispatch manifests'
  }
};

export interface RolePermissionDetail {
  role: UserRole;
  title: string;
  description: string;
  scope: string;
  permissions: {
    canManageUsers: boolean;
    canViewAllOrders: boolean;
    canCreateOrders: boolean;
    canEditOrders: boolean;
    canDeleteOrders: boolean;
    canManageDispatch: boolean;
    canManagePayments: boolean;
    canViewAnalytics: boolean;
    canExportReports: boolean;
    canManageSettings: boolean;
  };
  keyDuties: string[];
}

export const ROLE_PERMISSIONS_CONFIG: Record<UserRole, RolePermissionDetail> = {
  SUPER_ADMIN: {
    role: 'SUPER_ADMIN',
    title: 'Super Admin',
    description: 'Root authority with full access to all workspaces, security controls, and user administration.',
    scope: 'Enterprise-Wide (Global Root)',
    permissions: {
      canManageUsers: true,
      canViewAllOrders: true,
      canCreateOrders: true,
      canEditOrders: true,
      canDeleteOrders: true,
      canManageDispatch: true,
      canManagePayments: true,
      canViewAnalytics: true,
      canExportReports: true,
      canManageSettings: true,
    },
    keyDuties: [
      'Create, edit, reset passwords, and delete user accounts',
      'Full oversight of order registries, payments, and dispatches',
      'System-wide settings, Google Sheets synchronization, and master data resets',
      'Audit log inspection and access control governance'
    ]
  },
  ADMIN: {
    role: 'ADMIN',
    title: 'Admin (Operations)',
    description: 'Operations manager managing order processing, school kits, delivery pipelines, and invoicing.',
    scope: 'All Orders & Operational Pipelines',
    permissions: {
      canManageUsers: true,
      canViewAllOrders: true,
      canCreateOrders: true,
      canEditOrders: true,
      canDeleteOrders: false,
      canManageDispatch: true,
      canManagePayments: true,
      canViewAnalytics: true,
      canExportReports: true,
      canManageSettings: false,
    },
    keyDuties: [
      'Register, update, and monitor institutional orders and schools',
      'Manage dispatch manifests and courier tracking',
      'Record payment receipts and reconcile invoices',
      'Export operational reports to Excel & CSV'
    ]
  },
  DATA_ENTRY_OPERATOR: {
    role: 'DATA_ENTRY_OPERATOR',
    title: 'Data Entry Operator',
    description: 'Specialized data entry staff for logging purchase orders, contract details, and school records.',
    scope: 'Order Entry & Registration',
    permissions: {
      canManageUsers: false,
      canViewAllOrders: true,
      canCreateOrders: true,
      canEditOrders: true,
      canDeleteOrders: false,
      canManageDispatch: false,
      canManagePayments: false,
      canViewAnalytics: false,
      canExportReports: true,
      canManageSettings: false,
    },
    keyDuties: [
      'Enter new GeM purchase orders and direct school orders',
      'Update school addresses, contact persons, and kit quantities',
      'Dedicated simplified Data Entry View for rapid logging',
      'Restricted from modifying financial accounts or dispatch details'
    ]
  },
  ACCOUNTS: {
    role: 'ACCOUNTS',
    title: 'Accounts & Treasury',
    description: 'Finance and accounting personnel managing invoices, payment statuses, bank UTRs, and settlements.',
    scope: 'Financial & Payment Pipelines',
    permissions: {
      canManageUsers: false,
      canViewAllOrders: true,
      canCreateOrders: false,
      canEditOrders: true,
      canDeleteOrders: false,
      canManageDispatch: false,
      canManagePayments: true,
      canViewAnalytics: true,
      canExportReports: true,
      canManageSettings: false,
    },
    keyDuties: [
      'Record Tax Invoice numbers and invoice dates',
      'Update payment receipts, bank reference (UTR) numbers, and amounts',
      'Monitor outstanding and overdue institutional receivables',
      'Access Payments & Treasury Pipeline'
    ]
  },
  DISPATCH: {
    role: 'DISPATCH',
    title: 'Dispatch & Logistics',
    description: 'Warehouse and fulfillment teams managing packaging, courier dockets, and deliveries.',
    scope: 'Logistics & Dispatch Pipelines',
    permissions: {
      canManageUsers: false,
      canViewAllOrders: true,
      canCreateOrders: false,
      canEditOrders: true,
      canDeleteOrders: false,
      canManageDispatch: true,
      canManagePayments: false,
      canViewAnalytics: false,
      canExportReports: true,
      canManageSettings: false,
    },
    keyDuties: [
      'Update packaging status and order dispatch dates',
      'Record courier names (DTDC, Delhivery, etc.) and tracking docket numbers',
      'Confirm final school delivery and proof of delivery',
      'Access Dispatch & Logistics Pipeline'
    ]
  },
  AGENT: {
    role: 'AGENT',
    title: 'Regional Field Partner',
    description: 'Field partner with strict territory isolation. Can only view orders assigned to their agent code.',
    scope: 'Assigned Territory Orders Only',
    permissions: {
      canManageUsers: false,
      canViewAllOrders: false,
      canCreateOrders: false,
      canEditOrders: false,
      canDeleteOrders: false,
      canManageDispatch: false,
      canManagePayments: false,
      canViewAnalytics: false,
      canExportReports: false,
      canManageSettings: false,
    },
    keyDuties: [
      'Access dedicated Partner Portal with assigned school orders',
      'Track order fulfillment and delivery statuses for their clients',
      'Data isolation: Cannot see orders from other partners or states',
      'Cannot view wholesale profit margins or administrative settings'
    ]
  }
};

export const UserManager: React.FC<UserManagerProps> = ({ currentUser }) => {
  const { refreshUsers } = useAuth();

  const [activeTab, setActiveTab] = useState<'users' | 'permissions'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: 'Funscholar@2026',
    role: 'DATA_ENTRY_OPERATOR' as UserRole,
    phone: '',
    agentCode: '',
    state: ''
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'DATA_ENTRY_OPERATOR' as UserRole,
    phone: '',
    agentCode: '',
    state: '',
    password: '',
    isActive: true
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Load users
  const loadUserList = async () => {
    try {
      setLoading(true);
      const list = await getUsers();
      setUsers(list);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserList();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setCreateForm({
      name: '',
      email: '',
      password: `Funscholar@${Math.floor(1000 + Math.random() * 9000)}`,
      role: 'DATA_ENTRY_OPERATOR',
      phone: '',
      agentCode: `AGT-${String(users.filter(u => u.role === 'AGENT').length + 1).padStart(4, '0')}`,
      state: ''
    });
    setShowCreateModal(true);
  };

  // Submit Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      showNotification('error', 'Please fill in Name, Email, and Password.');
      return;
    }

    setCreateSubmitting(true);
    try {
      await createUser(
        {
          name: createForm.name.trim(),
          email: createForm.email.trim(),
          password: createForm.password.trim(),
          role: createForm.role,
          phone: createForm.phone.trim(),
          agentCode: createForm.role === 'AGENT' ? createForm.agentCode.trim() : undefined,
          state: createForm.state.trim()
        },
        currentUser
      );

      showNotification('success', `User account created successfully for ${createForm.name}`);
      setShowCreateModal(false);
      await loadUserList();
      await refreshUsers();
    } catch (err: any) {
      showNotification('error', err.message || 'Could not create user.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (user: UserProfile) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      agentCode: user.agentCode || user.agentId || '',
      state: user.state || '',
      password: '',
      isActive: user.isActive ?? true
    });
  };

  // Submit Edit User
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setEditSubmitting(true);
    try {
      await updateUserProfile(
        editingUser.userId,
        {
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          role: editForm.role,
          phone: editForm.phone.trim(),
          agentCode: editForm.role === 'AGENT' ? editForm.agentCode.trim() : undefined,
          state: editForm.state.trim(),
          isActive: editForm.isActive,
          password: editForm.password ? editForm.password.trim() : undefined
        },
        currentUser
      );

      showNotification('success', `User account updated for ${editForm.name}`);
      setEditingUser(null);
      await loadUserList();
      await refreshUsers();
    } catch (err: any) {
      showNotification('error', err.message || 'Could not update user.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Confirm Delete User
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;

    try {
      await deleteUser(deletingUser.userId, currentUser);
      showNotification('success', `User account for ${deletingUser.name} (${deletingUser.email}) permanently deleted.`);
      setDeletingUser(null);
      await loadUserList();
      await refreshUsers();
    } catch (err: any) {
      showNotification('error', err.message || 'Could not delete user.');
    }
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.agentCode && u.agentCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.phone && u.phone.includes(searchQuery));

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswordMap((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              User Management
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Create, edit, and delete staff & agent accounts. Automatic real-time synchronization with Cloud Firestore.
          </p>
        </div>

        {/* Add User Button */}
        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-500/10 transition-all cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New User</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Navigation Tabs: Users Directory vs Permissions Matrix */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Accounts Directory ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('permissions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'permissions'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <Shield className="w-4 h-4 text-purple-400" />
          <span>Roles & Permissions Matrix</span>
        </button>
      </div>

      {activeTab === 'users' ? (
        <>
          {/* Search & Filters */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, phone, or agent code..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 shrink-0 font-medium">Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Roles ({users.length})</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="DATA_ENTRY_OPERATOR">Data Entry Operator</option>
            <option value="AGENT">Regional Partner</option>
            <option value="ACCOUNTS">Accounts</option>
            <option value="DISPATCH">Dispatch & Logistics</option>
          </select>

          <button
            type="button"
            onClick={loadUserList}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh user list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Contact / Territory</th>
                <th className="py-3 px-4">Login Password</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No users found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isRoot = user.email.toLowerCase() === 'info@funscholar.com';
                  const roleInfo = ROLE_CONFIG[user.role] || {
                    label: user.role,
                    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700'
                  };

                  return (
                    <tr key={user.userId} className="hover:bg-slate-800/40 transition-colors">
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-100 flex items-center gap-2">
                          <span>{user.name}</span>
                          {isRoot && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
                              ROOT ADMIN
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {user.email}
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${roleInfo.badgeClass}`}
                        >
                          {roleInfo.label}
                        </span>
                      </td>

                      {/* Contact & Territory */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-300 font-mono text-[11px]">
                          {user.phone || '—'}
                        </div>
                        {(user.agentCode || user.state) && (
                          <div className="text-[10px] text-amber-400 font-medium mt-0.5 flex items-center gap-1">
                            {user.agentCode && <span>[{user.agentCode}]</span>}
                            {user.state && <span>{user.state}</span>}
                          </div>
                        )}
                      </td>

                      {/* Password */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span>
                            {showPasswordMap[user.userId] ? user.password || '—' : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(user.userId)}
                            className="text-slate-500 hover:text-slate-300 transition-colors"
                            title="Toggle password visibility"
                          >
                            {showPasswordMap[user.userId] ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            user.isActive ?? true
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {user.isActive ?? true ? 'Active' : 'Suspended'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-slate-600 text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Edit user account"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Edit</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            disabled={isRoot}
                            onClick={() => setDeletingUser(user)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isRoot ? 'Cannot delete permanent root admin' : 'Delete user'}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>Delete</span>
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
    </>
  ) : (
    /* Roles & Permissions Matrix View */
    <div className="space-y-6">
      {/* Explanation Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0 mt-0.5">
            <Shield className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              Role-Based Access Control (RBAC) Architecture
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-4xl">
              User permissions are strictly governed by their assigned System Role. To grant or restrict access for any user, switch to the <strong className="text-amber-400">User Accounts Directory</strong> tab, click <strong className="text-white">Edit</strong> on that user, and choose their assigned role. Permissions apply instantaneously across all workspaces.
            </p>
          </div>
        </div>
      </div>

      {/* Permissions Matrix Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h4 className="font-bold text-sm text-slate-200 flex items-center gap-2">
            <span>System Permissions & Capabilities Matrix</span>
          </h4>
          <span className="text-[11px] text-slate-500">6 Specialized Roles</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4 min-w-[220px]">Capability / Action</th>
                <th className="py-3.5 px-3 text-center text-purple-400 min-w-[110px]">Super Admin</th>
                <th className="py-3.5 px-3 text-center text-indigo-400 min-w-[100px]">Admin</th>
                <th className="py-3.5 px-3 text-center text-sky-400 min-w-[110px]">Data Entry</th>
                <th className="py-3.5 px-3 text-center text-emerald-400 min-w-[100px]">Accounts</th>
                <th className="py-3.5 px-3 text-center text-orange-400 min-w-[100px]">Dispatch</th>
                <th className="py-3.5 px-3 text-center text-amber-400 min-w-[100px]">Field Partner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
              {/* User Management */}
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-semibold text-slate-200">
                  User Management (Create, Edit, Delete)
                </td>
                <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold">✓ Full</span></td>
                <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold">✓ Create/Edit</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-600 font-mono">—</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-600 font-mono">—</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-600 font-mono">—</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-600 font-mono">—</span></td>
              </tr>

              {/* Order Registry View All */}
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-semibold text-slate-200">
                  View All Orders (Across All States & Partners)
                </td>
                <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold">✓</span></td>
                <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold">✓</span></td>
                <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold">✓</span></td>
                <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold">✓</span></td>
                <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold">✓</span></td>
                <td className="py-3 px-3 text-center"><span className="text-rose-400 font-medium text-[11px]">Own Code Only</span></td>
              </tr>

              {/* Create New Orders */}
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-semibold text-slate-200">
                  Create New Orders (GeM POs, Direct Supply)
                </td>
                <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold">✓</span></td>
                <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold">✓</span></td>
                <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold">✓</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-600 font-mono">—</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-600 font-mono">—</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-600 font-mono">—</span></td>
              </tr>

              {/* Modify Orders */}
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-semibold text-slate-200">
                  Modify Order Details & School Info
                </td>
                <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold">✓</span></td>
                <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold">✓</span></td>
                <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold">✓</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-400 text-[11px]">Finance Only</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-400 text-[11px]">Logistics Only</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-600 font-mono">—</span></td>
              </tr>

              {/* Dispatch & Logistics Management */}
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-semibold text-slate-200">
                  Dispatch Pipeline (Courier, Docket, Tracking)
                </td>
                <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold">✓</span></td>
                <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold">✓</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-600 font-mono">—</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-600 font-mono">—</span></td>
                <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold">✓ Lead</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-400 text-[11px]">View Only</span></td>
              </tr>

              {/* Invoicing & Payment Verification */}
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-semibold text-slate-200">
                  Payments & Invoicing (Tax Invoice, UTR, Bank)
                </td>
                <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold">✓</span></td>
                <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold">✓</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-600 font-mono">—</span></td>
                <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold">✓ Lead</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-600 font-mono">—</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-600 font-mono">—</span></td>
              </tr>

              {/* Executive Analytics Dashboard */}
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-semibold text-slate-200">
                  Executive Analytics & Financial Metrics
                </td>
                <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold">✓ Full</span></td>
                <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold">✓ Full</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-600 font-mono">—</span></td>
                <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold">✓ Payments</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-600 font-mono">—</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-600 font-mono">—</span></td>
              </tr>

              {/* Master Database Resets & Google Sheets */}
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-semibold text-slate-200">
                  Master Resets, Purge & Backup Synchronization
                </td>
                <td className="py-3 px-3 text-center"><span className="text-purple-400 font-bold">✓ Exclusive</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-600 font-mono">—</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-600 font-mono">—</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-600 font-mono">—</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-600 font-mono">—</span></td>
                <td className="py-3 px-3 text-center"><span className="text-slate-600 font-mono">—</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Role Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(Object.keys(ROLE_PERMISSIONS_CONFIG) as UserRole[]).map((roleKey) => {
          const r = ROLE_PERMISSIONS_CONFIG[roleKey];
          const conf = ROLE_CONFIG[roleKey];
          const userCount = users.filter((u) => u.role === roleKey).length;

          return (
            <div
              key={roleKey}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${conf?.badgeClass}`}>
                    {r.title}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {userCount} {userCount === 1 ? 'user' : 'users'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {r.description}
                </p>

                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                    Key Responsibilities:
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-400">
                    {r.keyDuties.map((duty, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-400 shrink-0">•</span>
                        <span>{duty}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
                Scope: {r.scope}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )}

      {/* ================= MODAL: CREATE USER ================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Add New User</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="e.g. ramesh@funscholar.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold">System Role *</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="DATA_ENTRY_OPERATOR">Data Entry Operator</option>
                    <option value="AGENT">Regional Field Partner</option>
                    <option value="ADMIN">Admin (Operations)</option>
                    <option value="ACCOUNTS">Accounts & Payments</option>
                    <option value="DISPATCH">Dispatch & Logistics</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                  <div className="mt-1.5 p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300">
                    <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span>{ROLE_PERMISSIONS_CONFIG[createForm.role]?.title} Scope:</span>
                    </div>
                    <div className="text-slate-400 mt-0.5 text-[10px] leading-relaxed">
                      {ROLE_PERMISSIONS_CONFIG[createForm.role]?.description}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold">Initial Password *</label>
                  <input
                    type="text"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Initial password"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold">Phone Number</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                {createForm.role === 'AGENT' ? (
                  <div className="space-y-1">
                    <label className="block text-slate-300 font-semibold">Partner Code</label>
                    <input
                      type="text"
                      value={createForm.agentCode}
                      onChange={(e) => setCreateForm({ ...createForm, agentCode: e.target.value })}
                      placeholder="e.g. AGT-0010"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="block text-slate-300 font-semibold">State / Territory</label>
                    <input
                      type="text"
                      value={createForm.state}
                      onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })}
                      placeholder="e.g. Haryana / Delhi"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {createSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Create User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT USER ================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Edit User: {editingUser.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold">Email Address *</label>
                  <input
                    type="email"
                    required
                    disabled={editingUser.email.toLowerCase() === 'info@funscholar.com'}
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500 font-mono disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold">System Role *</label>
                  <select
                    disabled={editingUser.email.toLowerCase() === 'info@funscholar.com'}
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500 font-medium disabled:opacity-60"
                  >
                    <option value="DATA_ENTRY_OPERATOR">Data Entry Operator</option>
                    <option value="AGENT">Regional Field Partner</option>
                    <option value="ADMIN">Admin (Operations)</option>
                    <option value="ACCOUNTS">Accounts & Payments</option>
                    <option value="DISPATCH">Dispatch & Logistics</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                  <div className="mt-1.5 p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300">
                    <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span>{ROLE_PERMISSIONS_CONFIG[editForm.role]?.title} Scope:</span>
                    </div>
                    <div className="text-slate-400 mt-0.5 text-[10px] leading-relaxed">
                      {ROLE_PERMISSIONS_CONFIG[editForm.role]?.description}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold">Account Status</label>
                  <select
                    value={editForm.isActive ? 'ACTIVE' : 'SUSPENDED'}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'ACTIVE' })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="ACTIVE">Active Account</option>
                    <option value="SUSPENDED">Suspended Account</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold">Phone Number</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                {editForm.role === 'AGENT' ? (
                  <div className="space-y-1">
                    <label className="block text-slate-300 font-semibold">Partner Code</label>
                    <input
                      type="text"
                      value={editForm.agentCode}
                      onChange={(e) => setEditForm({ ...editForm, agentCode: e.target.value })}
                      placeholder="e.g. AGT-0001"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="block text-slate-300 font-semibold">State / Region</label>
                    <input
                      type="text"
                      value={editForm.state}
                      onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1 pt-1">
                <label className="block text-slate-300 font-semibold">
                  Update Password <span className="text-slate-500 font-normal">(Leave blank to keep unchanged)</span>
                </label>
                <input
                  type="text"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Enter new password if updating"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {editSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE CONFIRMATION ================= */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete User Account</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
              <div className="font-bold text-slate-200">{deletingUser.name}</div>
              <div className="text-slate-400 font-mono">{deletingUser.email}</div>
              <div className="text-amber-400 font-semibold">{deletingUser.role}</div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to permanently delete this user account? Their login access will be immediately revoked and purged from the database.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
