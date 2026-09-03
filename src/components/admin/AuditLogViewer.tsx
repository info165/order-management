import React, { useState, useEffect, useMemo } from 'react';
import { History, Search, Download, ShieldCheck, Filter } from 'lucide-react';
import { AuditLog, UserProfile } from '../../types';
import { getAuditLogs } from '../../services/dataService';

interface AuditLogViewerProps {
  currentUser: UserProfile;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ currentUser }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getAuditLogs();
        setLogs(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const actions = useMemo(() => Array.from(new Set(logs.map(l => l.action))), [logs]);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          l.entityId.toLowerCase().includes(q) ||
          l.userName.toLowerCase().includes(q) ||
          l.userEmail.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          JSON.stringify(l.changes).toLowerCase().includes(q);
        if (!match) return false;
      }
      if (actionFilter !== 'ALL' && l.action !== actionFilter) return false;
      return true;
    });
  }, [logs, search, actionFilter]);

  const handleExportCSV = () => {
    const headers = ['Log ID', 'Timestamp', 'User Name', 'User Email', 'Role', 'Action', 'Entity Type', 'Entity ID', 'Details'];
    const rows = filtered.map(l => [
      l.logId,
      l.timestamp,
      `"${l.userName}"`,
      l.userEmail,
      l.userRole,
      l.action,
      l.entityType,
      l.entityId,
      `"${JSON.stringify(l.changes).replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-amber-600" />
            <span>Compliance & Security Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of all order modifications, dispatch updates, and financial reconciliation actions
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-2 text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Order ID, User, Action or change details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 text-xs focus:bg-white focus:outline-none"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 text-xs"
        >
          <option value="ALL">All Actions</option>
          {actions.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
            Audit Records ({filtered.length})
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">Real-time recording</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity ID</th>
                <th className="px-4 py-3">Change Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No audit records matching query.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.logId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(l.timestamp).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div>{l.userName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{l.userEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-slate-100 border border-slate-200 text-slate-700 font-bold">
                        {l.userRole}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {l.action}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">
                      {l.entityId}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600 max-w-md truncate">
                      {JSON.stringify(l.changes)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
