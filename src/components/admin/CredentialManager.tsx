import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  KeyRound,
  UserPlus,
  Lock,
  Copy,
  Check,
  RefreshCw,
  Search,
  Filter,
  FileEdit,
  Users,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
  X,
  Send,
  Building,
  CheckCircle2
} from 'lucide-react';
import { UserProfile, UserRole, IssuedCredential } from '../../types';
import {
  getUsers,
  issueUserCredentials,
  resetUserPassword,
  updateUserStatus,
  deleteUserCredentials,
  generatePasswordResetOtp
} from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';

interface CredentialManagerProps {
  currentUser: UserProfile;
}

export const CredentialManager: React.FC<CredentialManagerProps> = ({ currentUser }) => {
  const { refreshUsers } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modal states
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issuedSlip, setIssuedSlip] = useState<IssuedCredential | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Reset Password Modal
  const [resettingUser, setResettingUser] = useState<UserProfile | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  // OTP Modal State
  const [otpModal, setOtpModal] = useState<{ user: UserProfile; otp: string; expiresAt: number } | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Form state for issuing new credentials
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    role: 'DATA_ENTRY_OPERATOR' as UserRole,
    password: '',
    phone: '',
    agentCode: '',
    state: '',
    notes: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let res = 'Gov@';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password: res }));
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim() || !formData.email.trim()) {
      setFormError('Name and Email are required.');
      return;
    }

    setFormSubmitting(true);
    try {
      const cred = await issueUserCredentials(
        {
          name: formData.name,
          email: formData.email,
          username: formData.username || formData.email.split('@')[0],
          password: formData.password || `GovSchool@${Math.floor(1000 + Math.random() * 9000)}`,
          role: formData.role,
          phone: formData.phone,
          agentCode: formData.role === 'AGENT' ? formData.agentCode : undefined,
          state: formData.state,
          notes: formData.notes
        },
        currentUser
      );

      setIssuedSlip(cred);
      setShowIssueModal(false);
      // Reset form
      setFormData({
        name: '',
        email: '',
        username: '',
        role: 'DATA_ENTRY_OPERATOR',
        password: '',
        phone: '',
        agentCode: '',
        state: '',
        notes: ''
      });
      await loadData();
      await refreshUsers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to issue credentials.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: UserProfile) => {
    if (user.email.toLowerCase() === 'info@funscholar.com') {
      alert('Cannot deactivate the root Super Admin account.');
      return;
    }
    const newStatus = !user.isActive;
    const confirm = window.confirm(`Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} credentials for ${user.name}?`);
    if (!confirm) return;

    try {
      await updateUserStatus(user.userId, newStatus, currentUser);
      await loadData();
      await refreshUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || !newPasswordInput.trim()) return;

    try {
      await resetUserPassword(resettingUser.userId, newPasswordInput, currentUser);
      setPasswordNotice(`Password successfully updated for ${resettingUser.email}`);
      setTimeout(() => {
        setResettingUser(null);
        setNewPasswordInput('');
        setPasswordNotice(null);
      }, 2000);
      await loadData();
      await refreshUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRevokeCredentials = async (user: UserProfile) => {
    if (user.email.toLowerCase() === 'info@funscholar.com') {
      alert('Cannot revoke the permanent root Super Admin.');
      return;
    }
    const confirm = window.confirm(
      `SECURITY CONFIRMATION:\nAre you sure you want to permanently revoke and delete account access for "${user.name}" (${user.email})?\n\nThis will purge their credentials from the system.`
    );
    if (!confirm) return;

    try {
      await deleteUserCredentials(user.userId, currentUser);
      setFeedbackNotice(`Account credentials for "${user.name}" (${user.email}) have been permanently revoked and deleted.`);
      setTimeout(() => setFeedbackNotice(null), 4000);
      await loadData();
      await refreshUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGenerateUserOtp = async (user: UserProfile) => {
    try {
      const res = await generatePasswordResetOtp(user.email);
      setOtpModal({
        user,
        otp: res.otp,
        expiresAt: res.expiresAt
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyTextToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const cleanQ = searchQuery.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(cleanQ) ||
      u.email.toLowerCase().includes(cleanQ) ||
      (u.agentCode && u.agentCode.toLowerCase().includes(cleanQ)) ||
      (u.username && u.username.toLowerCase().includes(cleanQ));
    return matchesRole && matchesSearch;
  });

  if (!isSuperAdmin) {
    return (
      <div className="bg-white rounded-xl border border-rose-200 p-8 text-center space-y-3 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Login credentials can ONLY be issued and managed by the Super Admin (info@funscholar.com).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner with Strict Security Badge */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold">
              <KeyRound className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Credential Issuance & User Authority Management
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Official gateway for issuing personnel credentials. All Data Entry Operators, Field Agents, and Staff logins are provisioned exclusively here.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-purple-50 text-purple-900 border border-purple-200 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 font-semibold">
            <Lock className="w-3.5 h-3.5 text-purple-700" />
            <span>SUPER ADMIN ONLY</span>
          </div>

          <button
            type="button"
            onClick={() => {
              handleGeneratePassword();
              setShowIssueModal(true);
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Issue New Credentials</span>
          </button>
        </div>
      </div>

      {/* Newly Issued Credential Slip Modal / Banner */}
      {issuedSlip && (
        <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-5 rounded-xl border border-emerald-500 shadow-xl space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500 text-slate-950">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-emerald-300">
                  New Credentials Issued Successfully!
                </h3>
                <p className="text-xs text-slate-300">
                  Provide these credentials to the user. They can now log in to their assigned portal view.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIssuedSlip(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-lg border border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Personnel Name</span>
              <span className="font-semibold text-white text-sm">{issuedSlip.name}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Role</span>
              <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/30 mt-0.5">
                {issuedSlip.role}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Login ID / Email</span>
              <span className="font-mono text-emerald-400">{issuedSlip.email}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Password</span>
              <span className="font-mono font-bold text-amber-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                {issuedSlip.password}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400 font-mono">
              Issued by: {issuedSlip.issuedBy} • {new Date(issuedSlip.issuedAt).toLocaleString()}
            </span>
            <button
              type="button"
              onClick={() => {
                const text = `GovSchool ERP Login Credentials:\nRole: ${issuedSlip.role}\nName: ${issuedSlip.name}\nLogin Email/ID: ${issuedSlip.email}\nPassword: ${issuedSlip.password}\nLogin Portal: ${window.location.origin}`;
                copyTextToClipboard(text, 'slip');
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              {copiedId === 'slip' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'slip' ? 'Copied to Clipboard!' : 'Copy Credential Package'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Role Distribution Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Issued Logins</span>
          <div className="text-xl font-extrabold text-slate-900">{users.length}</div>
          <span className="text-[10px] text-slate-500">Super Admin Authorized</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-sky-600">Data Entry Operators</span>
          <div className="text-xl font-extrabold text-sky-700">
            {users.filter(u => u.role === 'DATA_ENTRY_OPERATOR').length}
          </div>
          <span className="text-[10px] text-slate-500">Dedicated Entry View</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-amber-600">Regional Field Agents</span>
          <div className="text-xl font-extrabold text-amber-700">
            {users.filter(u => u.role === 'AGENT').length}
          </div>
          <span className="text-[10px] text-slate-500">Dedicated Agent View</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-purple-600">Core Administration</span>
          <div className="text-xl font-extrabold text-purple-700">
            {users.filter(u => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN').length}
          </div>
          <span className="text-[10px] text-slate-500">Full System Oversight</span>
        </div>
      </div>

      {/* System Feedback Notice */}
      {feedbackNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or agent code..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-slate-400 text-xs font-semibold mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {[
            { id: 'ALL', label: 'All Accounts' },
            { id: 'DATA_ENTRY_OPERATOR', label: 'Data Entry' },
            { id: 'AGENT', label: 'Agents' },
            { id: 'ADMIN', label: 'Operations' },
            { id: 'ACCOUNTS', label: 'Accounts' },
            { id: 'DISPATCH', label: 'Logistics' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRoleFilter(tab.id)}
              className={`px-2.5 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-colors ${
                roleFilter === tab.id
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Credential Registry Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
            Issued Personnel Credentials ({filteredUsers.length})
          </h3>
          <span className="text-slate-500 font-mono text-[11px]">Strict Super Admin Authority</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Personnel Name</th>
                <th className="px-4 py-3">Login ID / Email</th>
                <th className="px-4 py-3">Assigned Role</th>
                <th className="px-4 py-3">Territory / Agent Code</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Issued By</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredUsers.map(u => {
                const isRoot = u.email.toLowerCase() === 'info@funscholar.com';
                return (
                  <tr key={u.userId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-slate-900 font-bold flex items-center gap-2">
                      {isRoot && <Lock className="w-3.5 h-3.5 text-amber-600" />}
                      <span>{u.name}</span>
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-700">
                      <div>{u.email}</div>
                      {u.username && u.username !== u.email.split('@')[0] && (
                        <span className="text-[10px] text-slate-400 block font-sans">User: {u.username}</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                        u.role === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                        u.role === 'DATA_ENTRY_OPERATOR' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                        u.role === 'AGENT' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        u.role === 'ADMIN' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                        u.role === 'ACCOUNTS' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        'bg-orange-50 text-orange-800 border-orange-200'
                      }`}>
                        {u.role === 'DATA_ENTRY_OPERATOR' ? 'DATA ENTRY' : u.role}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {u.agentCode ? (
                        <span className="font-mono text-amber-700 font-semibold">{u.agentCode}</span>
                      ) : u.state ? (
                        <span>{u.state}</span>
                      ) : (
                        <span className="text-slate-400 italic">Central Operations</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        u.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span>{u.isActive ? 'Active' : 'Suspended'}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-500 text-[11px] font-mono">
                      {u.issuedBy || 'Super Admin'}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {isRoot ? (
                        <span className="text-[11px] text-slate-400 italic">Permanent Root</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleGenerateUserOtp(u)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-semibold text-[11px] transition-colors"
                            title="Generate a 6-digit OTP for this user"
                          >
                            Gen OTP
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setResettingUser(u);
                              setNewPasswordInput(`GovSchool@${Math.floor(1000 + Math.random() * 9000)}`);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] transition-colors"
                            title="Reset password"
                          >
                            Reset
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            className={`px-2 py-1 rounded font-semibold text-[11px] transition-colors ${
                              u.isActive
                                ? 'text-slate-600 hover:bg-slate-100'
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {u.isActive ? 'Suspend' : 'Activate'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRevokeCredentials(u)}
                            className="px-2 py-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded font-semibold text-[11px] flex items-center gap-1 transition-colors"
                            title="Permanently delete user account and credentials"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ISSUE NEW CREDENTIALS MODAL */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 text-xs animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Issue New Login Credentials</h3>
                  <p className="text-[11px] text-slate-500">Super Admin Authorized Provisioning</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleIssueSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-700 font-semibold">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ramesh Verma"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-semibold">Official Email / Login ID *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. ramesh@funscholar.com"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1">
                <label className="block text-slate-700 font-semibold">Select Designated Role & Workspace</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-900 bg-white"
                >
                  <option value="DATA_ENTRY_OPERATOR">DATA ENTRY OPERATOR — Dedicated PO Punching & School Registry View</option>
                  <option value="AGENT">REGIONAL FIELD AGENT — Dedicated Agent Portal & Commission View</option>
                  <option value="ADMIN">OPERATIONS MANAGER — Full order, dispatch, and reports workspace</option>
                  <option value="ACCOUNTS">ACCOUNTS & BILLING — Invoicing, PFMS, and payment transactions</option>
                  <option value="DISPATCH">LOGISTICS & DISPATCH — Courier dockets, manifest, and deliveries</option>
                </select>
              </div>

              {/* Role Specific Fields */}
              {formData.role === 'AGENT' && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                    <Users className="w-4 h-4 text-amber-600" />
                    <span>Agent Configuration</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-amber-900 font-semibold text-[11px] mb-0.5">Agent Code</label>
                      <input
                        type="text"
                        value={formData.agentCode}
                        onChange={(e) => setFormData({ ...formData, agentCode: e.target.value.toUpperCase() })}
                        placeholder="e.g. AGT-0004"
                        className="w-full px-3 py-1.5 rounded-lg border border-amber-300 bg-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-amber-900 font-semibold text-[11px] mb-0.5">Assigned State / Region</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="e.g. Rajasthan & MP"
                        className="w-full px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.role === 'DATA_ENTRY_OPERATOR' && (
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 space-y-1">
                  <div className="font-bold text-sky-900 flex items-center gap-1.5 text-xs">
                    <FileEdit className="w-4 h-4 text-sky-600" />
                    <span>Data Entry Operator Workspace Profile</span>
                  </div>
                  <p className="text-[11px] text-sky-800 leading-snug">
                    This account will immediately open in the dedicated <strong>Data Entry Workspace</strong> with rapid PO input, School autocomplete, and Batch Excel importing tools.
                  </p>
                </div>
              )}

              {/* Password & Security */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-700 font-semibold">Initial Password *</label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-amber-600 hover:text-amber-700 font-semibold text-[11px] flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter initial password"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900"
                />
              </div>

              {/* Contact phone */}
              <div className="space-y-1">
                <label className="block text-slate-700 font-semibold">Contact Phone (Optional)</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98XXX XXXXX"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{formSubmitting ? 'Issuing...' : 'Authorize & Issue Credentials'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resettingUser && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Reset User Password</h3>
              <button
                type="button"
                onClick={() => setResettingUser(null)}
                className="text-slate-400 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passwordNotice && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                {passwordNotice}
              </div>
            )}

            <form onSubmit={handleConfirmResetPassword} className="space-y-4">
              <div>
                <span className="text-slate-500 block">Updating credentials for:</span>
                <span className="font-bold text-slate-900 text-sm block">
                  {resettingUser.name} ({resettingUser.email})
                </span>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-700 font-semibold">New Password</label>
                <input
                  type="text"
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-sm"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPER ADMIN GENERATED OTP MODAL */}
      {otpModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs text-center animate-scaleIn">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-base text-slate-900">One-Time Password (OTP)</h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Generated for <strong className="text-slate-800">{otpModal.user.name}</strong> ({otpModal.user.email})
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 my-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                6-Digit Verification Code
              </div>
              <div className="text-3xl font-extrabold font-mono tracking-widest text-slate-900 select-all">
                {otpModal.otp}
              </div>
              <div className="text-[10px] text-amber-700 mt-2 font-medium">
                Valid for 10 minutes • Expires at {new Date(otpModal.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            <p className="text-slate-500 text-[11px] leading-relaxed">
              Provide this code to the user. They can enter it on the Login page under <strong>"Reset via OTP"</strong> along with their new password.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => copyTextToClipboard(otpModal.otp, 'modal-otp')}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                {copiedId === 'modal-otp' ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
                <span>{copiedId === 'modal-otp' ? 'Copied to Clipboard!' : 'Copy OTP Code'}</span>
              </button>
              <button
                type="button"
                onClick={() => setOtpModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
