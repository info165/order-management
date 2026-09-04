import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  PlusCircle,
  FileSpreadsheet,
  ShieldAlert,
  ChevronDown,
  CheckCircle,
  LogOut,
  MoreVertical,
  LayoutDashboard,
  ShoppingCart,
  Building,
  Users,
  Package,
  BarChart3,
  ShieldCheck,
  History,
  Download,
  Truck,
  CreditCard,
  PhoneCall,
  Settings,
  Database,
  Cloud,
  RefreshCw,
  LogIn
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getNotifications, syncAllDataToFirestore } from '../../services/dataService';
import { resolvedConfig } from '../../firebase/config';
import { NotificationItem } from '../../types';

interface NavbarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  onOpenNewOrder: () => void;
  onOpenImport: () => void;
  onExportData: () => void;
  unreadNotificationCount: number;
  onToggleNotifications: () => void;
  searchQuery?: string;
  onSearch?: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeSection,
  onNavigate,
  onOpenNewOrder,
  onOpenImport,
  onExportData,
  unreadNotificationCount,
  onToggleNotifications,
  searchQuery = '',
  onSearch
}) => {
  const {
    currentUser,
    firebaseUser,
    activeRole,
    isSuperAdmin,
    isAgent,
    switchPersona,
    signInWithGoogle,
    availablePersonas,
    logout
  } = useAuth();
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [showThreeDotsMenu, setShowThreeDotsMenu] = useState(false);
  const [isSyncingToFirebase, setIsSyncingToFirebase] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const personaRef = useRef<HTMLDivElement>(null);

  const handleSyncToFirestore = async () => {
    setIsSyncingToFirebase(true);
    setSyncStatus('Syncing all records to Firestore...');
    try {
      const res = await syncAllDataToFirestore();
      if (res.success) {
        setSyncStatus(`Successfully pushed ${res.count} records directly to Firestore!`);
      } else {
        setSyncStatus(`Sync Notice: ${res.error}`);
      }
    } catch (e: any) {
      setSyncStatus(`Sync failed: ${e?.message || e}`);
    } finally {
      setIsSyncingToFirebase(false);
      setTimeout(() => setSyncStatus(null), 8000);
    }
  };

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowThreeDotsMenu(false);
      }
      if (personaRef.current && !personaRef.current.contains(event.target as Node)) {
        setShowPersonaMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuSelect = (section: string) => {
    onNavigate(section);
    setShowThreeDotsMenu(false);
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="w-full px-3 sm:px-6 py-2 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Dashboard Button (Logo) & Orders Switcher */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Logo as Dashboard Button */}
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="group flex items-center gap-2.5 p-1 -ml-1 rounded-lg hover:bg-slate-800 transition-colors text-left focus:outline-none focus:ring-1 focus:ring-amber-500"
            title="Click to go to Dashboard"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-slate-950 shadow-sm text-sm tracking-tighter transition-transform group-hover:scale-105 ${
              activeSection === 'dashboard'
                ? 'bg-gradient-to-tr from-amber-400 to-amber-300 ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900'
                : 'bg-gradient-to-tr from-amber-500 to-amber-400'
            }`}>
              KV
            </div>
            <div>
              <div className="font-bold text-sm leading-tight tracking-tight flex items-center gap-1.5 text-white">
                <span>GovSchool</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                  Dashboard
                </span>
              </div>
              <div className="text-[10px] text-slate-400 group-hover:text-amber-300 transition-colors">
                KV / JNV Portal
              </div>
            </div>
          </button>

          {/* Quick Primary Switcher: Orders View (Default & Full-Screen) */}
          <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-slate-800">
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSection === 'orders'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Orders Registry</span>
            </button>

            {activeSection !== 'orders' && (
              <span className="text-[11px] text-amber-400 font-medium px-2 py-0.5 bg-amber-950/60 rounded border border-amber-900/60 flex items-center gap-1">
                <span>Current View:</span>
                <span className="capitalize font-bold text-white">{activeSection}</span>
              </span>
            )}
          </div>
        </div>

        {/* Center / Search (if provided) */}
        {onSearch && (
          <div className="hidden lg:block flex-1 max-w-sm mx-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={isAgent ? "Search my orders by School, PO..." : "Search Order, School, PO, Docket..."}
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
                className="w-full bg-slate-800/90 text-white placeholder-slate-400 text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
              />
            </div>
          </div>
        )}

        {/* Right side controls: New Order, Notifications, Persona, and 3-DOTS MENU */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Quick Action: New Order */}
          {!isAgent && (
            <button
              type="button"
              onClick={onOpenNewOrder}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg transition-colors shadow-xs shrink-0"
              title="Create New KV / JNV Order"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Order</span>
              <span className="sm:hidden">New</span>
            </button>
          )}

          {/* Quick Action: Import Sheet */}
          {!isAgent && (
            <button
              type="button"
              onClick={onOpenImport}
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors shadow-xs"
              title="Import orders from Google Sheet / Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Import</span>
            </button>
          )}

          {/* Notification Bell */}
          <button
            type="button"
            onClick={onToggleNotifications}
            className="relative p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Persona / Role Switcher for Testing */}
          <div className="relative" ref={personaRef}>
            <button
              type="button"
              onClick={() => setShowPersonaMenu(!showPersonaMenu)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg px-2 py-1.5 text-left transition-colors"
              title="Switch Persona / Role"
            >
              <div className="w-5 h-5 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-[11px] font-bold text-amber-400">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden xl:block text-xs">
                <span className="truncate max-w-[100px] inline-block font-semibold text-slate-200">
                  {currentUser?.name?.split(' ')[0]}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Persona Switcher Dropdown */}
            {showPersonaMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 divide-y divide-slate-800 text-xs">
                <div className="px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Logged in as</div>
                  <div className="font-semibold text-slate-200 mt-0.5">{currentUser?.name}</div>
                  <div className="text-slate-400 font-mono text-[11px]">{currentUser?.email}</div>
                  <div className="text-amber-400 text-[11px] font-mono mt-0.5">Role: {activeRole}</div>
                </div>

                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    <span>Quick Role Testing</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {availablePersonas.map((persona) => {
                      const isSelected = persona.email === currentUser?.email;
                      return (
                        <button
                          key={persona.userId}
                          type="button"
                          onClick={() => {
                            switchPersona(persona.email);
                            setShowPersonaMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition-colors ${
                            isSelected ? 'bg-slate-800/80 text-amber-400 font-semibold' : 'text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span>{persona.name}</span>
                              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-400">
                                {persona.role}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{persona.email}</div>
                          </div>
                          {isSelected && <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Firebase Connection & Cloud Sync Box */}
                <div className="p-3 bg-slate-950/60 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cloud Firestore</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono border border-amber-500/20">
                      Live Sync
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 break-all font-mono leading-tight bg-slate-900/80 p-1.5 rounded border border-slate-800">
                    {resolvedConfig.projectId} ({resolvedConfig.firestoreDatabaseId || '(default)'})
                  </div>

                  {syncStatus && (
                    <div className="text-[11px] p-2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 leading-snug">
                      {syncStatus}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      disabled={isSyncingToFirebase}
                      onClick={handleSyncToFirestore}
                      className="flex-1 py-1.5 px-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncingToFirebase ? 'animate-spin' : ''}`} />
                      <span>{isSyncingToFirebase ? 'Pushing...' : 'Sync to Firestore'}</span>
                    </button>

                    {!firebaseUser ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await signInWithGoogle();
                          } catch (e: any) {
                            alert('Google sign-in error: ' + (e?.message || e));
                          }
                        }}
                        className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
                        title="Sign in with your Google account to get verified Firestore token"
                      >
                        <LogIn className="w-3 h-3 text-emerald-400" />
                        <span>Google</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-emerald-400 font-mono px-1">
                        Auth ✓
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-3 py-2 flex items-center justify-between bg-slate-950/40">
                  <span className="text-[11px] text-slate-400">Role-Based Access Control</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPersonaMenu(false);
                      logout();
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* THREE DOTS MENU (Schools, Agents, Users, Audit, Settings, etc.) */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowThreeDotsMenu(!showThreeDotsMenu)}
              className={`p-1.5 rounded-lg border transition-all ${
                showThreeDotsMenu
                  ? 'bg-amber-500 text-slate-950 border-amber-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="More Options (Schools, Agents, Products, Users, Audit Logs, Reports)"
              aria-label="More Navigation Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Three Dots Dropdown Menu */}
            {showThreeDotsMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 divide-y divide-slate-800 text-xs">
                {/* Views Section */}
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Main Workspaces
                  </div>
                  <button
                    type="button"
                    onClick={() => handleMenuSelect('orders')}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
                      activeSection === 'orders' ? 'text-amber-400 font-bold bg-slate-800/60' : 'text-slate-200'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4 text-amber-400" />
                    <span>Orders Registry (Full Screen)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMenuSelect('dashboard')}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
                      activeSection === 'dashboard' ? 'text-amber-400 font-bold bg-slate-800/60' : 'text-slate-200'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-blue-400" />
                    <span>Executive Dashboard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMenuSelect('dispatches')}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
                      activeSection === 'dispatches' ? 'text-amber-400 font-bold bg-slate-800/60' : 'text-slate-200'
                    }`}
                  >
                    <Truck className="w-4 h-4 text-purple-400" />
                    <span>Dispatch & Logistics</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMenuSelect('payments')}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
                      activeSection === 'payments' ? 'text-amber-400 font-bold bg-slate-800/60' : 'text-slate-200'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span>Payments & Treasury</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMenuSelect('followups')}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
                      activeSection === 'followups' ? 'text-amber-400 font-bold bg-slate-800/60' : 'text-slate-200'
                    }`}
                  >
                    <PhoneCall className="w-4 h-4 text-yellow-400" />
                    <span>Calling & Follow-ups</span>
                  </button>
                </div>

                {/* Master Registries Section */}
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Master Registries
                  </div>
                  <button
                    type="button"
                    onClick={() => handleMenuSelect('schools')}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
                      activeSection === 'schools' ? 'text-amber-400 font-bold bg-slate-800/60' : 'text-slate-200'
                    }`}
                  >
                    <Building className="w-4 h-4 text-sky-400" />
                    <span>School Registry (KV & JNV)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMenuSelect('agents')}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
                      activeSection === 'agents' ? 'text-amber-400 font-bold bg-slate-800/60' : 'text-slate-200'
                    }`}
                  >
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>Regional Agent Network</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMenuSelect('products')}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
                      activeSection === 'products' ? 'text-amber-400 font-bold bg-slate-800/60' : 'text-slate-200'
                    }`}
                  >
                    <Package className="w-4 h-4 text-teal-400" />
                    <span>Equipment & Packages</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMenuSelect('reports')}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
                      activeSection === 'reports' ? 'text-amber-400 font-bold bg-slate-800/60' : 'text-slate-200'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 text-rose-400" />
                    <span>Reports & Analytics</span>
                  </button>
                </div>

                {/* Admin Controls */}
                {isSuperAdmin && (
                  <div className="py-1">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Administration
                    </div>
                    <button
                      type="button"
                      onClick={() => handleMenuSelect('users')}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
                        activeSection === 'users' ? 'text-amber-400 font-bold bg-slate-800/60' : 'text-slate-200'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                      <span>User & Roles (RBAC)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMenuSelect('audit')}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
                        activeSection === 'audit' ? 'text-amber-400 font-bold bg-slate-800/60' : 'text-slate-200'
                      }`}
                    >
                      <History className="w-4 h-4 text-amber-400" />
                      <span>Audit Logs</span>
                    </button>
                  </div>
                )}

                {/* Quick Export & Cloud Actions */}
                <div className="py-1 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={isSyncingToFirebase}
                    onClick={() => {
                      handleSyncToFirestore();
                      setShowThreeDotsMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-800 text-amber-300 font-medium transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 text-amber-400 ${isSyncingToFirebase ? 'animate-spin' : ''}`} />
                    <span>{isSyncingToFirebase ? 'Pushing to Firebase...' : 'Push All Data to Firebase'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowThreeDotsMenu(false);
                      onExportData();
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-800 text-slate-300 transition-colors"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Export All to Excel (.xlsx)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
