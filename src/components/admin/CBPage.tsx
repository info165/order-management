import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Building2, ChevronDown, ChevronRight, Receipt } from 'lucide-react';
import { Order, OrderStatus, School, UserProfile } from '../../types';
import { subscribeToRealtimeSchools } from '../../services/dataService';
import { OrderList } from '../orders/OrderList';
import { CommissionCalculationPage } from './CommissionCalculationPage';
import { TransactionDetailsPage } from './TransactionDetailsPage';

interface CBPageProps {
  currentUser: UserProfile;
  orders: Order[];
  onBack: () => void;
  onSelectOrder: (order: Order) => void;
  onDeleteOrder: (orderId: string) => void;
  onBatchStatusUpdate: (orderIds: string[], newStatus: OrderStatus) => void;
  onOpenNewOrder: () => void;
  onOpenImport: () => void;
}

// Reachable only at the /cb URL, typed directly - there is no link, button,
// or menu entry anywhere in the app that points here (aside from a
// deliberately plain, Super-Admin-only entry tucked into the 3-dots menu),
// and it is not part of the normal Navbar/section shell.
export const CBPage: React.FC<CBPageProps> = ({
  currentUser,
  orders,
  onBack,
  onSelectOrder,
  onDeleteOrder,
  onBatchStatusUpdate,
  onOpenNewOrder,
  onOpenImport
}) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [commissionOrderIds, setCommissionOrderIds] = useState<string[] | null>(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const schoolDropdownRef = useRef<HTMLDivElement>(null);

  // Same live Firestore subscription the School Registry page uses, so this
  // dropdown is never a stale snapshot - a school added, renamed, or removed
  // anywhere in the app shows up here immediately, with no refresh needed.
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeSchools((data) => {
      setSchools(data);
      setLoadingSchools(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (schoolDropdownRef.current && !schoolDropdownRef.current.contains(e.target as Node)) {
        setShowSchoolDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortedSchools = [...schools].sort((a, b) => a.schoolName.localeCompare(b.schoolName));
  const selectedSchool = schools.find(s => s.schoolId === selectedSchoolId) || null;
  const filteredSchools = sortedSchools.filter((s) => {
    const q = schoolSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      s.schoolName.toLowerCase().includes(q) ||
      (s.schoolCode && s.schoolCode.toLowerCase().includes(q)) ||
      (s.state && s.state.toLowerCase().includes(q))
    );
  });

  const handlePickSchool = (s: School) => {
    setSelectedSchoolId(s.schoolId);
    setSchoolSearch(s.schoolName);
    setShowSchoolDropdown(false);
  };

  // Same ID-or-name match SchoolManager.tsx uses for a school's order count,
  // so this list always agrees with what the School Registry page itself
  // would show for the same school.
  const schoolOrders = selectedSchool
    ? orders.filter(
        o =>
          o.schoolId === selectedSchool.schoolId ||
          o.schoolName.toLowerCase() === selectedSchool.schoolName.toLowerCase()
      )
    : [];

  if (commissionOrderIds) {
    return (
      <CommissionCalculationPage
        orders={orders.filter(o => commissionOrderIds.includes(o.orderId))}
        currentUser={currentUser}
        onBack={() => setCommissionOrderIds(null)}
      />
    );
  }

  if (showTransactionDetails) {
    return <TransactionDetailsPage onBack={() => setShowTransactionDetails(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <div className="p-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <p className="text-xs text-slate-500">Signed in as {currentUser.name}</p>
      </div>

      <div className={`flex-1 flex flex-col p-4 sm:p-6 ${selectedSchool ? '' : 'items-center justify-center'}`}>
        {!selectedSchool && (
          <div className="w-full max-w-lg">
            <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-2xl shadow-black/40 p-8 space-y-6 overflow-hidden">
              {/* Subtle premium glow accents */}
              <div className="pointer-events-none absolute -top-24 -right-24 w-56 h-56 rounded-full bg-amber-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-24 w-56 h-56 rounded-full bg-sky-500/10 blur-3xl" />

              <div className="relative text-center space-y-1.5">
                <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-amber-400" />
                </div>
                <h2 className="text-lg font-bold text-slate-100">Which school do you want to select?</h2>
                <p className="text-xs text-slate-500">Search or browse the full registry below</p>
              </div>

              <div className="relative" ref={schoolDropdownRef}>
                <div className="relative">
                  <input
                    type="text"
                    value={schoolSearch}
                    onChange={(e) => {
                      setSchoolSearch(e.target.value);
                      setSelectedSchoolId('');
                      setShowSchoolDropdown(true);
                    }}
                    onFocus={() => setShowSchoolDropdown(true)}
                    disabled={loadingSchools}
                    placeholder={loadingSchools ? 'Loading schools…' : `Search a school... (${schools.length})`}
                    className="w-full pl-4 pr-9 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                  />
                  {/* Explicit toggle so the full list can be browsed with one
                      click, not just found by typing. */}
                  <button
                    type="button"
                    disabled={loadingSchools}
                    onClick={() => setShowSchoolDropdown((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-200 disabled:opacity-50"
                    title="Show all schools"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showSchoolDropdown ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {showSchoolDropdown && !loadingSchools && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 max-h-64 overflow-y-auto divide-y divide-slate-700/60 text-xs">
                    {filteredSchools.length > 0 ? (
                      filteredSchools.map((s) => (
                        <button
                          key={s.schoolId}
                          type="button"
                          onClick={() => handlePickSchool(s)}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-slate-700/60 transition-colors"
                        >
                          <div className="font-semibold text-slate-100">{s.schoolName}</div>
                          {s.state && <div className="text-[11px] text-slate-500">{s.state}</div>}
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-slate-500 text-center">No school found.</div>
                    )}
                  </div>
                )}
              </div>

              <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              <button
                type="button"
                onClick={() => setShowTransactionDetails(true)}
                className="relative w-full group flex items-center gap-3.5 p-4 rounded-xl bg-slate-800/60 border border-slate-700 hover:border-amber-500/50 hover:bg-slate-800 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-bold text-slate-100">Transaction Details</div>
                  <div className="text-[11px] text-slate-400">History of commissions paid</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>
        )}

        {selectedSchool && (
          <>
            {/* Compact school switcher - the full premium picker only
                shows on the landing state above, but switching schools
                without going Back needs to stay possible. */}
            <div className="w-full max-w-md mb-4 relative" ref={schoolDropdownRef}>
              <div className="relative">
                <input
                  type="text"
                  value={schoolSearch}
                  onChange={(e) => {
                    setSchoolSearch(e.target.value);
                    setSelectedSchoolId('');
                    setShowSchoolDropdown(true);
                  }}
                  onFocus={() => setShowSchoolDropdown(true)}
                  placeholder={`Search a school... (${schools.length})`}
                  className="w-full pl-3 pr-8 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSchoolDropdown((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-200"
                  title="Show all schools"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showSchoolDropdown ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {showSchoolDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 max-h-64 overflow-y-auto divide-y divide-slate-700/60 text-xs">
                  {filteredSchools.length > 0 ? (
                    filteredSchools.map((s) => (
                      <button
                        key={s.schoolId}
                        type="button"
                        onClick={() => handlePickSchool(s)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-700/60 transition-colors"
                      >
                        <div className="font-semibold text-slate-100">{s.schoolName}</div>
                        {s.state && <div className="text-[11px] text-slate-500">{s.state}</div>}
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-slate-500 text-center">No school found.</div>
                  )}
                </div>
              )}
            </div>

            <div className="w-full flex-1 min-h-0 bg-slate-100 rounded-xl p-2.5 sm:p-4 -mx-1">
            <OrderList
              orders={schoolOrders}
              currentUser={currentUser}
              onSelectOrder={onSelectOrder}
              onOpenNewOrder={onOpenNewOrder}
              onOpenImport={onOpenImport}
              onDeleteOrder={onDeleteOrder}
              onBatchStatusUpdate={onBatchStatusUpdate}
              initialFilterCategory="ALL"
              extraBulkAction={{
                label: 'Commission Calculation',
                onClick: (selectedOrderIds) => setCommissionOrderIds(selectedOrderIds)
              }}
              showCommissionPaidBadge
            />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
