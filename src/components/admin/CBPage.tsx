import React, { useEffect, useState } from 'react';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Order, OrderStatus, School, UserProfile } from '../../types';
import { subscribeToRealtimeSchools } from '../../services/dataService';
import { OrderList } from '../orders/OrderList';
import { CommissionCalculationPage } from './CommissionCalculationPage';

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

  const sortedSchools = [...schools].sort((a, b) => a.schoolName.localeCompare(b.schoolName));
  const selectedSchool = schools.find(s => s.schoolId === selectedSchoolId) || null;

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
        onBack={() => setCommissionOrderIds(null)}
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

      <div className={`flex-1 flex flex-col p-4 sm:p-6 pt-2 ${selectedSchool ? '' : 'items-center justify-start'}`}>
        <div className={selectedSchool ? 'w-full max-w-md mb-4' : 'w-full max-w-md mt-16'}>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>Which school do you want to select?</span>
            </label>
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              disabled={loadingSchools}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
            >
              <option value="">{loadingSchools ? 'Loading schools…' : `Select a school... (${schools.length})`}</option>
              {sortedSchools.map((s) => (
                <option key={s.schoolId} value={s.schoolId}>
                  {s.schoolName}{s.state ? ` — ${s.state}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedSchool && (
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
            />
          </div>
        )}
      </div>
    </div>
  );
};
