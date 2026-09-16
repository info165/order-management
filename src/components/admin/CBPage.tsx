import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
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
  // Transaction Details is the landing view for /cb - opens straight to the
  // payment history rather than requiring a school pick first. Its own
  // "+ Add Payments" button is what reveals the school picker below.
  const [showTransactionDetails, setShowTransactionDetails] = useState(true);
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
    return (
      <TransactionDetailsPage
        currentUser={currentUser}
        onBack={onBack}
        onAddPayment={() => setShowTransactionDetails(false)}
      />
    );
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

      <div className="flex-1 flex flex-col p-4 sm:p-6">
        {/* School switcher - always visible, whether or not a school is
            picked yet. Picking one populates the order list below; before
            that, the list is simply empty rather than hidden behind a
            separate landing card. */}
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
              disabled={loadingSchools}
              placeholder={loadingSchools ? 'Loading schools…' : `Search a school... (${schools.length})`}
              className="w-full pl-3 pr-8 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
            />
            <button
              type="button"
              disabled={loadingSchools}
              onClick={() => setShowSchoolDropdown((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-200 disabled:opacity-50"
              title="Show all schools"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showSchoolDropdown ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {showSchoolDropdown && !loadingSchools && (
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
              allOrders={orders}
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
      </div>
    </div>
  );
};
