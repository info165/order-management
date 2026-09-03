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
import { UserRoleManager } from './components/admin/UserRoleManager';
import { AuditLogViewer } from './components/admin/AuditLogViewer';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { Order, AppNotification, OrderStatus } from './types';
import {
  getOrders,
  getNotifications,
  markNotificationsAsRead,
  initializeFirestoreSeed,
  softDeleteOrder,
  updateOrderStatus
} from './services/dataService';
import { exportOrdersToExcel } from './services/importExportService';
import { ArrowLeft, LayoutGrid } from 'lucide-react';

function MainApp() {
  const { currentUser, isSuperAdmin, isAgent } = useAuth();

  // Orders is the default operations workspace
  const [activeSection, setActiveSection] = useState('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);

  // Load orders & notifications based on currentUser
  const refreshData = useCallback(async () => {
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

  // Initial seed and data load
  useEffect(() => {
    async function init() {
      await initializeFirestoreSeed();
      await refreshData();
    }
    init();
  }, [refreshData]);

  // Order selection handler
  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleOrderUpdated = (updated: Order) => {
    setSelectedOrder(updated);
    refreshData();
  };

  const handleOrderCreated = (newOrder: Order) => {
    setShowNewOrderModal(false);
    refreshData();
    setSelectedOrder(newOrder);
  };

  const handleExportData = () => {
    const filename = `GovSchool_Orders_${currentUser.role}_${new Date().toISOString().split('T')[0]}.xlsx`;
    exportOrdersToExcel(orders, filename);
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await softDeleteOrder(orderId, currentUser);
      await refreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete order');
    }
  };

  const handleBatchStatusUpdate = async (orderIds: string[], newStatus: OrderStatus) => {
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
                      : activeSection === 'schools'
                      ? 'School Master Registry'
                      : activeSection === 'agents'
                      ? 'Agent & Commission Directory'
                      : activeSection === 'products'
                      ? 'Equipment & Lab Catalog'
                      : activeSection === 'reports'
                      ? 'Operational Reports & MIS'
                      : activeSection === 'users'
                      ? 'Users, Access & Permissions'
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

          {/* Users & Roles (from 3-dots menu) */}
          {activeSection === 'users' && isSuperAdmin && (
            <UserRoleManager
              currentUser={currentUser}
            />
          )}

          {/* Audit Logs (from 3-dots menu) */}
          {activeSection === 'audit' && isSuperAdmin && (
            <AuditLogViewer
              currentUser={currentUser}
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
