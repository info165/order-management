import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
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
import { Order, AppNotification } from './types';
import {
  getOrders,
  getNotifications,
  markNotificationsAsRead,
  initializeFirestoreSeed
} from './services/dataService';
import { exportOrdersToExcel } from './services/importExportService';

function MainApp() {
  const { currentUser, isSuperAdmin, isAgent } = useAuth();

  const [activeSection, setActiveSection] = useState('dashboard');
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
      {/* Top Navigation */}
      <Navbar
        onOpenNewOrder={() => setShowNewOrderModal(true)}
        onOpenImport={() => setShowImportModal(true)}
        onExportData={handleExportData}
        unreadNotificationCount={notifications.filter(n => !n.isRead).length}
        onToggleNotifications={() => setShowNotificationDrawer(true)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Role-Aware Sidebar */}
        <Sidebar
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          orders={orders}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* View Switching */}
            {activeSection === 'dashboard' && (
              <Dashboard
                orders={orders}
                currentUser={currentUser}
                onSelectOrder={handleSelectOrder}
                onNavigateToOrders={() => setActiveSection('orders')}
              />
            )}

            {activeSection === 'orders' && (
              <OrderList
                orders={orders}
                currentUser={currentUser}
                onSelectOrder={handleSelectOrder}
                onOrdersUpdated={refreshData}
                initialFilterCategory="ALL"
              />
            )}

            {activeSection === 'dispatches' && (
              <OrderList
                orders={orders}
                currentUser={currentUser}
                onSelectOrder={handleSelectOrder}
                onOrdersUpdated={refreshData}
                initialFilterCategory="DISPATCHES"
              />
            )}

            {activeSection === 'payments' && (
              <OrderList
                orders={orders}
                currentUser={currentUser}
                onSelectOrder={handleSelectOrder}
                onOrdersUpdated={refreshData}
                initialFilterCategory="PAYMENTS"
              />
            )}

            {activeSection === 'followups' && (
              <OrderList
                orders={orders}
                currentUser={currentUser}
                onSelectOrder={handleSelectOrder}
                onOrdersUpdated={refreshData}
                initialFilterCategory="FOLLOWUPS"
              />
            )}

            {activeSection === 'schools' && (
              <SchoolManager
                orders={orders}
                currentUser={currentUser}
                onSelectOrder={handleSelectOrder}
              />
            )}

            {activeSection === 'agents' && (
              <AgentManager
                orders={orders}
                currentUser={currentUser}
                onSelectOrder={handleSelectOrder}
              />
            )}

            {activeSection === 'products' && (
              <ProductManager
                currentUser={currentUser}
              />
            )}

            {activeSection === 'reports' && (
              <ReportsView
                orders={orders}
                currentUser={currentUser}
              />
            )}

            {activeSection === 'users' && isSuperAdmin && (
              <UserRoleManager
                currentUser={currentUser}
              />
            )}

            {activeSection === 'audit' && isSuperAdmin && (
              <AuditLogViewer
                currentUser={currentUser}
              />
            )}
          </div>
        </main>
      </div>

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
