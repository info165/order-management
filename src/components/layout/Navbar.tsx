import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  ChevronDown,
  LogOut,
  MoreVertical,
  LayoutDashboard,
  ShoppingCart,
  Building,
  Users,
  Package,
  BarChart3,
  Download,
  Truck,
  CreditCard,
  PhoneCall,
  FileEdit,
  GraduationCap,
  Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  onOpenNewOrder?: () => void;
  onOpenImport?: () => void;
  onExportData: () => void;
  unreadNotificationCount: number;
  onToggleNotifications: () => void;
  searchQuery?: string;
  onSearch?: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeSection,
  onNavigate,
  onExportData,
  unreadNotificationCount,
  onToggleNotifications
}) => {
  const { currentUser, activeRole, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuSelect = (section: string) => {
    onNavigate(section);
    setShowMoreMenu(false);
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        
        {/* Left: Brand Identity & Active Navigation */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Logo & Brand Title */}
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className={`flex items-center gap-2.5 px-2 py-1 rounded-xl transition-all text-left focus:outline-none cursor-pointer ${
              activeSection === 'dashboard'
                ? 'bg-slate-800/80 ring-1 ring-amber-500/50'
                : 'hover:bg-slate-800/50'
            }`}
            title="Funscholar Order Management - Go to Dashboard"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-xs">
              <GraduationCap className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base leading-none tracking-tight text-white flex items-center gap-2">
                <span>Funscholar Order Management</span>
              </div>
            </div>
          </button>

          {/* Clean Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-800">
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSection === 'orders'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Orders Registry</span>
            </button>
          </nav>
        </div>

        {/* Center/Right: Secondary Controls */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Notifications Bell */}
          <button
            type="button"
            onClick={onToggleNotifications}
            className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Activity Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadNotificationCount}
              </span>
            )}
          </button>

          {/* User Account / Profile */}
          <div className="relative" ref={userRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg px-2.5 py-1.5 transition-colors text-left"
              title="Account Options"
            >
              <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[10px] font-bold text-amber-400">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden lg:block text-xs">
                <div className="font-semibold text-slate-200 leading-tight">
                  {currentUser?.name?.split(' ')[0]}
                </div>
                <div className="text-[10px] text-slate-400 leading-none">
                  {activeRole}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-2 z-50 text-xs">
                <div className="px-3 py-2 border-b border-slate-800">
                  <div className="font-bold text-slate-100">{currentUser?.name}</div>
                  <div className="text-slate-400 text-[11px] font-mono truncate">{currentUser?.email}</div>
                  <div className="mt-1 inline-block px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-400 font-mono text-[10px]">
                    Role: {activeRole}
                  </div>
                </div>

                {(activeRole === 'SUPER_ADMIN' || activeRole === 'ADMIN') && (
                  <div className="p-2 border-b border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onNavigate('users');
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-200 font-medium flex items-center gap-2 transition-colors"
                    >
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span>User Management</span>
                    </button>
                  </div>
                )}

                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-medium flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Three-Dots Menu (Additional Modules) */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`p-2 rounded-lg border transition-all ${
                showMoreMenu
                  ? 'bg-amber-500 text-slate-950 border-amber-500'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700'
              }`}
              title="More Modules"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown for Secondary Tools */}
            {showMoreMenu && (
              <div className="absolute right-0 mt-2 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 divide-y divide-slate-800 text-xs">
                
                {/* Core Workspaces */}
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Workspaces
                  </div>

                  <button
                    type="button"
                    onClick={() => handleMenuSelect('orders')}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
                      activeSection === 'orders' ? 'text-amber-400 font-bold bg-slate-800/60' : 'text-slate-200'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4 text-amber-400" />
                    <span>Orders Registry</span>
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
                    onClick={() => handleMenuSelect('dataentry')}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
                      activeSection === 'dataentry' ? 'text-sky-400 font-bold bg-slate-800/60' : 'text-slate-200'
                    }`}
                  >
                    <FileEdit className="w-4 h-4 text-sky-400" />
                    <span>Data Entry View</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMenuSelect('agent_portal')}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
                      activeSection === 'agent_portal' ? 'text-amber-400 font-bold bg-slate-800/60' : 'text-slate-200'
                    }`}
                  >
                    <Users className="w-4 h-4 text-amber-400" />
                    <span>Agent Portal View</span>
                  </button>

                  {(activeRole === 'SUPER_ADMIN' || activeRole === 'ADMIN') && (
                    <button
                      type="button"
                      onClick={() => handleMenuSelect('users')}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
                        activeSection === 'users' ? 'text-amber-400 font-bold bg-slate-800/60' : 'text-slate-200'
                      }`}
                    >
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span>Users (User Management)</span>
                    </button>
                  )}
                </div>

                {/* Operations Pipelines */}
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Pipelines
                  </div>

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

                {/* Masters & Reports */}
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Masters & Reports
                  </div>

                  <button
                    type="button"
                    onClick={() => handleMenuSelect('schools')}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
                      activeSection === 'schools' ? 'text-amber-400 font-bold bg-slate-800/60' : 'text-slate-200'
                    }`}
                  >
                    <Building className="w-4 h-4 text-sky-400" />
                    <span>School Registry</span>
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
                    <span>Reports & MIS</span>
                  </button>
                </div>

                {/* Export Action */}
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onExportData();
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Export Orders to Excel</span>
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
