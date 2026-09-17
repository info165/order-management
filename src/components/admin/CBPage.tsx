import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Order, OrderStatus, UserProfile } from '../../types';
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
  const [commissionOrderIds, setCommissionOrderIds] = useState<string[] | null>(null);
  // Transaction Details is the landing view for /cb - opens straight to the
  // payment history rather than requiring a school pick first. Its own
  // "+ Add Payments" button is what reveals the order list below.
  const [showTransactionDetails, setShowTransactionDetails] = useState(true);

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
        orders={orders}
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
          onClick={() => setShowTransactionDetails(true)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <p className="text-xs text-slate-500">Signed in as {currentUser.name}</p>
      </div>

      {/* No separate school picker here - OrderList's own Instant Search bar
          and School filter (the same white toolbar/table the main Orders
          tab uses) is how a school is found and selected, exactly like
          browsing the main order list. */}
      <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-6">
        <div className="w-full flex-1 min-h-0 bg-slate-100 rounded-xl p-2.5 sm:p-4 -mx-1">
          <OrderList
            orders={orders}
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
            requireSchoolSelection
            freezeCheckboxColumn
          />
        </div>
      </div>
    </div>
  );
};
