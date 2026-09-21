import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Dashboard } from './components/dashboard/Dashboard';
import { OrderList } from './components/orders/OrderList';
import { OrderDetailModal } from './components/orders/OrderDetailModal';
import { NewOrderModal } from './components/orders/NewOrderModal';
import { ImportModal } from './components/orders/ImportModal';
import { SchoolManager } from './components/schools/SchoolManager';
import { AgentManager } from './components/agents/AgentManager';
import { ProductManager } from './components/products/ProductManager';
import { ReportsView } from './components/reports/ReportsView';
import { AuditLogViewer } from './components/admin/AuditLogViewer';
import { CredentialManager } from './components/admin/CredentialManager';
import { UserManager } from './components/admin/UserManager';
import { DataEntryDashboard } from './components/dataentry/DataEntryDashboard';
import { AgentPortalView } from './components/agents/AgentPortalView';
import { LoginPage } from './components/auth/LoginPage';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { CBPage } from './components/admin/CBPage';
import { InventoryMain } from './components/inventory/InventoryMain';
import { Order, AppNotification, OrderStatus } from './types';
import {
  getOrders,
  getNotifications,
  markNotificationsAsRead,
  softDeleteOrder,
  updateOrderStatus,
  subscribeToRealtimeOrders,
  migrateAllUsersToFirebaseAuth
} from './services/dataService';
import { exportOrdersToExcel } from './services/importExportService';
import { getDisplaySerialNo } from './utils/orderDisplay';
import { ArrowLeft, LayoutGrid } from 'lucide-react';
import funscholarLogo from './assets/funscholar-logo.png';

function MainApp() {
  const { currentUser, isSuperAdmin, isAgent, isDataEntry, isLoggedIn, authLoading } = useAuth();

  // Drives the splash screen's 0-100% progress bar. Firebase's own session
  // check has no real "progress" to report, so this eases up toward 90%
  // on its own while authLoading is true (slowing down as it approaches,
  // so a slow connection never leaves it looking stuck at a false 100%),
  // then races the rest of the way to 100% once authLoading actually
  // turns false. splashDone only flips after it visibly reaches 100%, so
  // the real page never cuts the animation off mid-count.
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [splashDone, setSplashDone] = useState(false);
  useEffect(() => {
    if (splashDone) return;
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (!authLoading) {
          const next = prev + 4;
          if (next >= 100) {
            setTimeout(() => setSplashDone(true), 250);
            return 100;
          }
          return next;
        }
        if (prev >= 90) return prev;
        return prev + Math.max(0.5, (90 - prev) * 0.06);
      });
    }, 40);
    return () => clearInterval(interval);
  }, [authLoading, splashDone]);

  // Orders is the default operations workspace
  const [activeSection, setActiveSection] = useState('orders');

  // /cb is a hidden standalone page, not one of the normal `activeSection`
  // tabs - tracked as its own bit of client-side "routing" state (updated
  // via history.pushState, never a real browser navigation) so opening or
  // leaving it never causes a full page reload, which would otherwise
  // re-run Firebase's session check and flash the "Verifying authorized
  // session..." loader every time.
  const [pathname, setPathname] = useState(window.location.pathname);
  const navigateToCB = () => {
    window.history.pushState({}, '', '/cb');
    setPathname('/cb');
  };
  const navigateHome = () => {
    window.history.pushState({}, '', '/');
    setPathname('/');
  };
  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Auto-route based on role when currentUser changes
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'DATA_ENTRY_OPERATOR') {
        setActiveSection('dataentry');
      } else if (currentUser.role === 'AGENT') {
        setActiveSection('agent_portal');
      }
    }
  }, [currentUser?.role]);

  // Restrict inventory section strictly to Super Admin and Admin; never accessible to Field Agents
  useEffect(() => {
    if (activeSection === 'inventory' && currentUser) {
      const isPrivilegedAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN';
      if (!isPrivilegedAdmin) {
        if (currentUser.role === 'AGENT') {
          setActiveSection('agent_portal');
        } else {
          setActiveSection('orders');
        }
      }
    }
  }, [activeSection, currentUser]);

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);

  // Load orders & notifications based on currentUser with automatic real-time Firestore sync
  const refreshData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [orderList, notifList] = await Promise.all([
        getOrders(currentUser),
        getNotifications(currentUser)
      ]);
      setOrders(orderList);
      setNotifications(notifList);
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Automatic real-time Firestore synchronization.
  //
  // initializeFirestoreSeed() USED to also run here on every app load, to
  // bootstrap Firestore from the hardcoded REAL_SHEET_ORDERS seed the very
  // first time the app ever ran against an empty database. It decided
  // "empty" by running a `limit(1)` query against `orders` - but that
  // query is subject to Firestore security rules, and an AGENT account's
  // reads are scoped to only orders matching their own agentId. A brand
  // new agent with zero orders assigned therefore sees that query come
  // back empty regardless of how much real data exists - and the seed
  // path then merge-writes the entire original hardcoded dataset back
  // over every live order, school, agent, product and user document,
  // silently reverting real statuses/dispatch info/school links to their
  // original import-time values. That is exactly what just happened on a
  // new agent's first login. The database has been live and populated for
  // a long time now - there is no legitimate scenario left where this
  // should ever run again, so it's removed outright rather than patched.
  useEffect(() => {
    if (!currentUser) return;

    // Connect to live real-time Firestore orders updates
    const unsubscribe = subscribeToRealtimeOrders(currentUser, (liveOrders) => {
      setOrders(liveOrders);
      setLoading(false);
    });

    // Initial notifications fetch
    getNotifications(currentUser).then(setNotifications).catch(console.error);

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  // Acknowledged payment-overdue alerts (by notificationId) - "Mark all as
  // read" adds the currently-shown ones here so the bell stops blinking,
  // without pretending the payment is any less overdue: the card stays
  // listed, just settles to the calm/read look. A DIFFERENT order that
  // crosses the 7-day mark later has its own notificationId, so it isn't
  // in this set and blinks again on its own. Persisted per-user so it
  // survives a refresh instead of re-blinking every reload.
  const getAcknowledgedStorageKey = () => `funscholar_acknowledged_critical_alerts_${currentUser?.userId || 'anon'}`;
  const [acknowledgedCriticalAlertIds, setAcknowledgedCriticalAlertIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(`funscholar_acknowledged_critical_alerts_${currentUser?.userId || 'anon'}`);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });

  // Payment-overdue-after-delivery alerts: computed live from the current
  // order list rather than stored, so they never need a background job to
  // create/update/expire them - an order drops off the instant its payment
  // is recorded, and a newly-crossed 7-day mark shows up the moment it's
  // loaded.
  const overduePaymentAlerts: AppNotification[] = useMemo(() => {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    return orders
      .filter(o => {
        if (o.isDeleted || o.status === 'CANCELLED' || !o.actualDeliveryDate) return false;
        if (o.paymentStatus === 'PAID') return false;
        const deliveredAt = new Date(o.actualDeliveryDate).getTime();
        if (Number.isNaN(deliveredAt)) return false;
        return now - deliveredAt >= SEVEN_DAYS_MS;
      })
      .map((o) => {
        const daysSinceDelivery = Math.floor((now - new Date(o.actualDeliveryDate!).getTime()) / (24 * 60 * 60 * 1000));
        const notificationId = `OVERDUE-PAYMENT-${o.orderId}`;
        return {
          notificationId,
          userId: currentUser?.userId || '',
          type: 'PAYMENT_OVERDUE',
          title: o.schoolName,
          message: `Delivered ${daysSinceDelivery} day${daysSinceDelivery === 1 ? '' : 's'} ago — ₹${(o.amountPending || 0).toLocaleString('en-IN')} payment still pending.`,
          orderId: o.orderId,
          isRead: acknowledgedCriticalAlertIds.has(notificationId),
          priority: 'CRITICAL',
          createdAt: o.actualDeliveryDate!
        } as AppNotification;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [orders, currentUser?.userId, acknowledgedCriticalAlertIds]);

  const allNotifications: AppNotification[] = [...overduePaymentAlerts, ...notifications];
  const hasUnacknowledgedCriticalAlert = overduePaymentAlerts.some((a) => !a.isRead);

  // One-time backfill: give every pre-existing staff account (created before
  // real Firebase Auth sessions existed) a real account + a users/{uid} role
  // doc, so Firestore's security rules can actually resolve their permissions.
  // Only the Super Admin can run this, and it's safe to run more than once.
  useEffect(() => {
    if (!isSuperAdmin) return;
    const FLAG_KEY = 'govschool_users_migrated_v1';
    try {
      if (localStorage.getItem(FLAG_KEY) === 'done') return;
    } catch (_) {}

    migrateAllUsersToFirebaseAuth(currentUser!)
      .then((res) => {
        console.log('User Firebase Auth migration:', res);
        try {
          localStorage.setItem(FLAG_KEY, 'done');
        } catch (_) {}
      })
      .catch((err) => console.warn('User migration notice:', err));
  }, [isSuperAdmin, currentUser]);

  // Order selection handler
  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleOrderUpdated = (updated?: Order) => {
    if (updated) {
      setSelectedOrder(updated);
    }
    refreshData();
  };

  const handleOrderCreated = (newOrder: Order) => {
    setShowNewOrderModal(false);
    refreshData();
    setSelectedOrder(newOrder);
  };

  const handleExportData = () => {
    if (!currentUser) return;
    const filename = `GovSchool_Orders_${currentUser.role}_${new Date().toISOString().split('T')[0]}.xlsx`;
    exportOrdersToExcel(orders, filename);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!currentUser) return;
    try {
      await softDeleteOrder(orderId, currentUser);
      await refreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete order');
    }
  };

  const handleBatchStatusUpdate = async (orderIds: string[], newStatus: OrderStatus) => {
    if (!currentUser) return;
    try {
      for (const id of orderIds) {
        await updateOrderStatus(id, newStatus, `Bulk status update to ${newStatus}`, true, currentUser);
      }
      await refreshData();
      alert(`Updated status for ${orderIds.length} orders to ${newStatus}.`);
    } catch (err: any) {
      alert(err.message || 'Failed to update orders');
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!currentUser) return;
    await markNotificationsAsRead(currentUser.userId);
    const updated = await getNotifications(currentUser);
    setNotifications(updated);

    // Also acknowledge every payment-overdue alert currently shown, so the
    // bell's red blinking stops - the cards stay listed (still genuinely
    // overdue), just settle to a calm/read look. A different order that
    // crosses the 7-day mark afterwards gets its own notificationId and
    // will blink again on its own.
    if (overduePaymentAlerts.length > 0) {
      setAcknowledgedCriticalAlertIds((prev) => {
        const next = new Set(prev);
        overduePaymentAlerts.forEach((a) => next.add(a.notificationId));
        try {
          localStorage.setItem(getAcknowledgedStorageKey(), JSON.stringify(Array.from(next)));
        } catch {
          // Local storage unavailable - acknowledgment just won't persist
          // across a refresh, which is a harmless degradation.
        }
        return next;
      });
    }
  };

  const handleSelectNotification = (notif: AppNotification) => {
    if (notif.orderId) {
      const found = orders.find(o => o.orderId === notif.orderId);
      if (found) {
        setSelectedOrder(found);
        setShowNotificationDrawer(false);
      }
    }
  };

  // While Firebase authentication is checking/restoring the existing session
  // (or the splash's own progress hasn't visibly reached 100% yet), do not
  // show the dashboard.
  if (authLoading || !splashDone) {
    const displayProgress = Math.round(loadingProgress);
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden">
        {/* Soft ambient glow behind the logo - the only departure from flat
            white, keeps the premium feel without competing with it. Needs
            an explicit centering transform: an absolutely-positioned box
            with no inset falls back to its normal-flow position (the top
            of this flex column), not the middle of the page. */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] rounded-full bg-orange-100/70 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col items-center space-y-7">
          <img src={funscholarLogo} alt="Funscholar" className="h-24 w-auto drop-shadow-sm" />
          <div className="text-center space-y-1.5">
            <p className="text-xs text-slate-400">Verifying authorized session...</p>
          </div>
          <div className="w-56 space-y-2">
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600"
                style={{ width: `${displayProgress}%` }}
              />
            </div>
            <p className="text-center text-[11px] font-bold text-orange-500 tabular-nums tracking-wide">
              {displayProgress}%
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If not logged in or no currentUser, show Login Credential Page
  if (!isLoggedIn || !currentUser) {
    return <LoginPage />;
  }

  // Hidden Super-Admin-only page, reachable only by typing /cb directly -
  // deliberately not part of the normal section shell (no Navbar, no menu
  // entry anywhere) so it stays undiscoverable by browsing the app. Any
  // other role hitting this URL just falls through to the normal dashboard
  // below, as if the path doesn't exist, rather than showing an "access
  // denied" that would hint something is here.
  if (pathname === '/cb' && isSuperAdmin) {
    return (
      <>
        <CBPage
          currentUser={currentUser}
          orders={orders}
          onBack={navigateHome}
          onSelectOrder={handleSelectOrder}
          onDeleteOrder={handleDeleteOrder}
          onBatchStatusUpdate={handleBatchStatusUpdate}
          onOpenNewOrder={() => {
            navigateHome();
            setShowNewOrderModal(true);
          }}
          onOpenImport={() => {
            navigateHome();
            setShowImportModal(true);
          }}
        />
        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            displaySerialNo={getDisplaySerialNo(selectedOrder, orders)}
            currentUser={currentUser}
            onClose={() => setSelectedOrder(null)}
            onOrderUpdated={handleOrderUpdated}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      {/* Top Navigation Bar with Logo (Dashboard trigger) & Top-Right 3-Dots Menu */}
      <Navbar
        onOpenNewOrder={() => setShowNewOrderModal(true)}
        onOpenImport={() => setShowImportModal(true)}
        onExportData={handleExportData}
        unreadNotificationCount={allNotifications.filter(n => !n.isRead).length}
        hasCriticalAlert={hasUnacknowledgedCriticalAlert}
        onToggleNotifications={() => setShowNotificationDrawer(true)}
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onLogoClick={() => setActiveSection('dashboard')}
        onNavigateToCB={navigateToCB}
      />

      {/* Main Full-Screen Workspace (No left sidebar taking space) */}
      <main className="flex-1 overflow-y-auto w-full px-2.5 sm:px-4 pt-0.5 pb-2.5 sm:pb-4 bg-slate-100">
        <div className="w-full space-y-3">
          {/* Breadcrumb / Return to Orders navigation bar when viewing non-order screens */}
          {activeSection !== 'orders' && !isAgent && (
            <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSection('orders')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs border border-amber-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Orders Registry</span>
                </button>
                <span className="text-slate-300">|</span>
                <span className="text-xs font-semibold text-slate-700 capitalize flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {activeSection === 'dashboard'
                      ? 'Executive Analytics Dashboard'
                      : activeSection === 'inventory'
                      ? 'Inventory & Procurement Management'
                      : activeSection === 'users'
                      ? 'User Management (Create, Edit, Delete)'
                      : activeSection === 'credentials'
                      ? 'Super Admin Credential Authority'
                      : activeSection === 'dataentry'
                      ? 'Data Entry Operator Workspace'
                      : activeSection === 'agent_portal'
                      ? 'Regional Field Partner Portal'
                      : activeSection === 'schools'
                      ? 'School Master Registry'
                      : activeSection === 'agents'
                      ? 'Partner & Commission Directory'
                      : activeSection === 'products'
                      ? 'Equipment & Lab Catalog'
                      : activeSection === 'reports'
                      ? 'Operational Reports & MIS'
                      : activeSection === 'audit'
                      ? 'Security & System Audit Logs'
                      : activeSection}
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('orders')}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                Close & Return
              </button>
            </div>
          )}

          {/* Primary Operations View: Orders Registry */}
          {activeSection === 'orders' && (
            <OrderList
              orders={orders}
              currentUser={currentUser}
              onSelectOrder={handleSelectOrder}
              onOrdersUpdated={refreshData}
              initialFilterCategory="ALL"
              onOpenNewOrder={() => setShowNewOrderModal(true)}
              onOpenImport={() => setShowImportModal(true)}
              onDeleteOrder={handleDeleteOrder}
              onBatchStatusUpdate={handleBatchStatusUpdate}
              // Super Admin only - same "CB" commission-paid badge the /cb
              // page's own order list already shows, surfaced here too so
              // Super Admin can see it without leaving the main registry.
              // Every other role's view of this same list is unaffected.
              showCommissionPaidBadge={isSuperAdmin}
            />
          )}

          {/* Executive Dashboard View (Accessed via Top Logo) */}
          {activeSection === 'dashboard' && (
            <Dashboard
              orders={orders}
              currentUser={currentUser}
              onSelectOrder={handleSelectOrder}
              onNavigateToOrders={() => setActiveSection('orders')}
            />
          )}

          {/* Dispatches Pipeline View */}
          {activeSection === 'dispatches' && (
            <OrderList
              orders={orders}
              currentUser={currentUser}
              onSelectOrder={handleSelectOrder}
              onOrdersUpdated={refreshData}
              initialFilterCategory="DISPATCHES"
              onOpenNewOrder={() => setShowNewOrderModal(true)}
              onOpenImport={() => setShowImportModal(true)}
              onDeleteOrder={handleDeleteOrder}
              onBatchStatusUpdate={handleBatchStatusUpdate}
            />
          )}

          {/* Payments & Receivables Pipeline View */}
          {activeSection === 'payments' && (
            <OrderList
              orders={orders}
              currentUser={currentUser}
              onSelectOrder={handleSelectOrder}
              onOrdersUpdated={refreshData}
              initialFilterCategory="PAYMENTS"
              onOpenNewOrder={() => setShowNewOrderModal(true)}
              onOpenImport={() => setShowImportModal(true)}
              onDeleteOrder={handleDeleteOrder}
              onBatchStatusUpdate={handleBatchStatusUpdate}
            />
          )}

          {/* Follow-ups Pipeline View */}
          {activeSection === 'followups' && (
            <OrderList
              orders={orders}
              currentUser={currentUser}
              onSelectOrder={handleSelectOrder}
              onOrdersUpdated={refreshData}
              initialFilterCategory="FOLLOWUPS"
              onOpenNewOrder={() => setShowNewOrderModal(true)}
              onOpenImport={() => setShowImportModal(true)}
              onDeleteOrder={handleDeleteOrder}
              onBatchStatusUpdate={handleBatchStatusUpdate}
            />
          )}

          {/* School Master Registry (from 3-dots menu) */}
          {activeSection === 'schools' && (
            <SchoolManager
              orders={orders}
              currentUser={currentUser}
              onSelectOrder={handleSelectOrder}
            />
          )}

          {/* Agent Directory (from 3-dots menu) */}
          {activeSection === 'agents' && (
            <AgentManager
              orders={orders}
              currentUser={currentUser}
              onSelectOrder={handleSelectOrder}
            />
          )}

          {/* Product & Equipment Catalog (from 3-dots menu) */}
          {activeSection === 'products' && (
            <ProductManager
              currentUser={currentUser}
            />
          )}

          {/* Reports & Analytics (from 3-dots menu) */}
          {activeSection === 'reports' && (
            <ReportsView
              orders={orders}
              currentUser={currentUser}
            />
          )}

          {/* Audit Logs (from 3-dots menu) */}
          {activeSection === 'audit' && isSuperAdmin && (
            <AuditLogViewer
              currentUser={currentUser}
            />
          )}

          {/* Super Admin Login Credentials Manager */}
          {activeSection === 'credentials' && isSuperAdmin && (
            <CredentialManager
              currentUser={currentUser}
            />
          )}

          {/* User Management (Create, Edit, Delete) */}
          {activeSection === 'users' && (isSuperAdmin || currentUser.role === 'ADMIN') && (
            <UserManager
              currentUser={currentUser}
            />
          )}

          {/* Data Entry Operator Dedicated View */}
          {activeSection === 'dataentry' && (
            <DataEntryDashboard />
          )}

          {/* Inventory & Procurement Management - Only accessible to Super Admin and Admin, never Field Agents */}
          {activeSection === 'inventory' && !isAgent && (isSuperAdmin || currentUser?.role === 'ADMIN') && (
            <InventoryMain
              orders={orders}
              currentUser={currentUser}
            />
          )}

          {/* Regional Field Agent Dedicated View */}
          {activeSection === 'agent_portal' && (
            <AgentPortalView
              orders={orders}
              currentUser={currentUser}
              onSelectOrder={handleSelectOrder}
              onOpenNewOrder={() => setShowNewOrderModal(true)}
            />
          )}
        </div>
      </main>

      {/* Modals and Drawers */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          displaySerialNo={!isAgent ? getDisplaySerialNo(selectedOrder, orders) : undefined}
          currentUser={currentUser}
          onClose={() => setSelectedOrder(null)}
          onOrderUpdated={handleOrderUpdated}
        />
      )}

      {showNewOrderModal && (
        <NewOrderModal
          currentUser={currentUser}
          onClose={() => setShowNewOrderModal(false)}
          onOrderCreated={handleOrderCreated}
        />
      )}

      {showImportModal && (
        <ImportModal
          currentUser={currentUser}
          onClose={() => setShowImportModal(false)}
          onImportComplete={refreshData}
        />
      )}

      <NotificationDrawer
        isOpen={showNotificationDrawer}
        onClose={() => setShowNotificationDrawer(false)}
        notifications={allNotifications}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
        onSelectNotification={handleSelectNotification}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
