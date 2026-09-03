import React, { useState, useEffect } from 'react';
import {
  Search,
  Bell,
  User,
  PlusCircle,
  FileSpreadsheet,
  ShieldAlert,
  ChevronDown,
  CheckCircle,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getNotifications } from '../../services/dataService';
import { NotificationItem } from '../../types';

interface NavbarProps {
  onOpenNewOrder: () => void;
  onOpenImport: () => void;
  onOpenNotifications: () => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNewOrder,
  onOpenImport,
  onOpenNotifications,
  onSearch,
  searchQuery
}) => {
  const { currentUser, activeRole, isSuperAdmin, isAgent, switchPersona, availablePersonas, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  useEffect(() => {
    if (currentUser?.userId) {
      getNotifications(currentUser.userId).then((items: NotificationItem[]) => {
        setUnreadCount(items.filter(i => !i.isRead).length);
      });
    }
  }, [currentUser]);

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-sm">
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left branding & search */}
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center font-black text-slate-950 shadow-sm text-sm tracking-tighter">
              KV
            </div>
            <div className="hidden lg:block">
              <div className="font-semibold text-sm leading-tight tracking-tight flex items-center gap-1.5 text-white">
                GovSchool Portal
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                  KV / JNV
                </span>
              </div>
              <div className="text-[11px] text-slate-400">Order Management & Agent Tracking</div>
            </div>
          </div>

          {/* Global Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={isAgent ? "Search my orders by School, PO, or Docket..." : "Search Order ID, PO, School, Agent, Docket..."}
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full bg-slate-800 text-white placeholder-slate-400 text-xs sm:text-sm pl-9 pr-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Right side controls & Persona Switcher */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Action Buttons for Admins */}
          {!isAgent && (
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenImport}
                className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors shadow-sm"
                title="Import orders from Google Sheet / Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Import Sheet</span>
              </button>

              <button
                type="button"
                onClick={onOpenNewOrder}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Order</span>
              </button>
            </div>
          )}

          {/* Notification Bell */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-bounce-short">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Persona / Role Switcher for Testing */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPersonaMenu(!showPersonaMenu)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-left transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-amber-400">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block text-xs">
                <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                  <span className="truncate max-w-[120px]">{currentUser?.name}</span>
                  <span className={`text-[10px] px-1 rounded font-mono ${
                    isSuperAdmin ? 'bg-purple-900/60 text-purple-300 border border-purple-700' :
                    isAgent ? 'bg-amber-950/60 text-amber-300 border border-amber-800' :
                    'bg-blue-900/60 text-blue-300 border border-blue-700'
                  }`}>
                    {activeRole}
                  </span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {/* Persona Switcher Dropdown */}
            {showPersonaMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 divide-y divide-slate-800 text-xs">
                <div className="px-3 py-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Login</div>
                  <div className="font-medium text-slate-200 mt-0.5">{currentUser?.name}</div>
                  <div className="text-slate-400 font-mono text-[11px]">{currentUser?.email}</div>
                  {currentUser?.agentCode && (
                    <div className="text-amber-400 text-[11px] font-mono mt-0.5">Agent Code: {currentUser.agentCode}</div>
                  )}
                </div>

                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    <span>Quick Role Testing Switcher</span>
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

                <div className="px-3 py-2 flex items-center justify-between bg-slate-950/40">
                  <span className="text-[11px] text-slate-400">Testing RBAC Isolation</span>
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
        </div>
      </div>
    </header>
  );
};
