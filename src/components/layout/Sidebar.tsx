import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  GraduationCap,
  Users,
  Package,
  CreditCard,
  Truck,
  BarChart3,
  Bell,
  ShieldCheck,
  FileText,
  Settings,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavSection =
  | 'dashboard'
  | 'orders'
  | 'schools'
  | 'agents'
  | 'products'
  | 'payments'
  | 'dispatch'
  | 'reports'
  | 'notifications'
  | 'users'
  | 'audit'
  | 'settings'
  | 'profile';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentSection, onSelectSection }) => {
  const { isAgent, isSuperAdmin, activeRole } = useAuth();

  // Navigation Items for Admin/Ops/Accounts/Dispatch
  const adminNavItems = [
    { id: 'dashboard' as NavSection, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders' as NavSection, label: 'Orders', icon: ShoppingCart },
    { id: 'schools' as NavSection, label: 'Schools', icon: GraduationCap },
    { id: 'agents' as NavSection, label: 'Partners', icon: Users },
    { id: 'products' as NavSection, label: 'Products & Labs', icon: Package },
    { id: 'payments' as NavSection, label: 'Payments', icon: CreditCard },
    { id: 'dispatch' as NavSection, label: 'Dispatch & Courier', icon: Truck },
    { id: 'reports' as NavSection, label: 'Reports', icon: BarChart3 },
    { id: 'notifications' as NavSection, label: 'Notifications', icon: Bell }
  ];

  // Super Admin security items
  const superAdminItems = [
    { id: 'users' as NavSection, label: 'Users & Roles', icon: ShieldCheck },
    { id: 'audit' as NavSection, label: 'Audit Logs', icon: FileText },
    { id: 'settings' as NavSection, label: 'Settings', icon: Settings }
  ];

  // Agent navigation items (STRICT AGENT VIEW)
  const agentNavItems = [
    { id: 'dashboard' as NavSection, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders' as NavSection, label: 'My Orders', icon: ShoppingCart },
    { id: 'notifications' as NavSection, label: 'Notifications', icon: Bell },
    { id: 'profile' as NavSection, label: 'My Profile', icon: UserCheck }
  ];

  const items = isAgent ? agentNavItems : adminNavItems;

  return (
    <aside className="w-60 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col justify-between select-none min-h-[calc(100vh-53px)]">
      <div className="py-4 px-3">
        {/* Role banner */}
        <div className="mb-4 px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Portal View</div>
          <div className="text-xs font-semibold text-slate-100 flex items-center justify-between mt-0.5">
            <span>{isAgent ? 'Partner Portal' : 'Operations Console'}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium ${
              isAgent ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-blue-950 text-blue-300 border border-blue-800'
            }`}>
              {isAgent ? 'PARTNER' : activeRole}
            </span>
          </div>
        </div>

        {/* Main Nav Items */}
        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Super Admin Section */}
          {!isAgent && isSuperAdmin && (
            <>
              <div className="pt-4 pb-1 px-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Administration
                </span>
              </div>
              {superAdminItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </>
          )}
        </nav>
      </div>

      {/* System Footer Info */}
      <div className="p-3 border-t border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center justify-between text-slate-400 font-mono">
          <span>FY 2026-27</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </div>
      </div>
    </aside>
  );
};
