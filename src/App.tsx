import React, { useState, useEffect, useCallback } from 'react';
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
import { Order, AppNotification, OrderStatus } from './types';
import {
  getOrders,
  getNotifications,
  markNotificationsAsRead,
  initializeFirestoreSeed,
  softDeleteOrder,
  updateOrderStatus,
  subscribeToRealtimeOrders
} from './services/dataService';
import { exportOrdersToExcel } from './services/importExportService';
import { ArrowLeft, LayoutGrid, Building2 } from 'lucide-react';

function MainApp() {
  const { currentUser, isSuperAdmin, isAgent, isDataEntry, isLoggedIn, authLoading } = useAuth();

  // Orders is the default operations workspace
  const [activeSection, setActiveSection] = useState('orders');
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

  // Initial seed and automatic real-time Firestore synchronization
  useEffect(() => {
    async function init() {
      await initializeFirestoreSeed();
    }
    init();

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

  // While Firebase authentication is checking/restoring the existing session, do not show the dashboard
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-200">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-bold text-slate-950 shadow-lg animate-pulse">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-base font-bold text-white tracking-tight">GovSchool Order ERP</h2>
            <p className="text-xs text-slate-400">Verifying authorized session...</p>
          </div>
        </div>
      </div>
    );
  }

  // If not logged in or no currentUser, show Login Credential Page
  if (!isLoggedIn || !currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      {/* Top Navigation Bar with Logo (Dashboard trigger) & Top-Right 3-Dots Menu */}
      <Navbar
        onOpenNewOrder={() => setShowNewOrderModal(true)}
        onOpenImport={() => setShowImportModal(true)}
        onExportData={handleExportData}
        unreadNotificationCount={notifications.filter(n => !n.isRead).length}
        onToggleNotifications={() => setShowNotificationDrawer(true)}
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onLogoClick={() => setActiveSection('dashboard')}
      />

      {/* Main Full-Screen Workspace (No left sidebar taking space) */}
      <main className="flex-1 overflow-y-auto w-full p-2.5 sm:p-4 bg-slate-100">
        <div className="w-full space-y-3">
          {/* Breadcrumb / Return to Orders navigation bar when viewing non-order screens */}
          {activeSection !== 'orders' && (
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
                      : activeSection === 'users'
                      ? 'User Management (Create, Edit, Delete)'
                      : activeSection === 'credentials'
                      ? 'Super Admin Credential Authority'
                      : activeSection === 'dataentry'
                      ? 'Data Entry Operator Workspace'
                      : activeSection === 'agent_portal'
                      ? 'Regional Field Agent Portal'
                      : activeSection === 'schools'
                      ? 'School Master Registry'
                      : activeSection === 'agents'
                      ? 'Agent & Commission Directory'
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
        notifications={notifications}
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
