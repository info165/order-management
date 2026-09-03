import React from 'react';
import { X, Bell, CheckCircle2, AlertTriangle, Info, Clock, Check } from 'lucide-react';
import { AppNotification, Order } from '../../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onSelectNotification: (notif: AppNotification) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onSelectNotification
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm text-white">System Alerts & Notifications</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Subheader action */}
          <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              {notifications.filter(n => !n.isRead).length} unread alerts
            </span>
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="text-amber-600 hover:text-amber-700 font-semibold inline-flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark all as read</span>
            </button>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No active notifications or alerts.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.notificationId}
                  onClick={() => onSelectNotification(n)}
                  className={`p-3.5 rounded-lg text-xs cursor-pointer transition-colors ${
                    n.isRead ? 'bg-white hover:bg-slate-50 opacity-75' : 'bg-amber-50/40 hover:bg-amber-50/70 border-l-3 border-amber-500'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {n.type === 'ERROR' || n.priority === 'HIGH' ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    ) : n.type === 'WARNING' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    )}

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{n.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(n.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-slate-600 text-xs leading-relaxed">{n.message}</p>
                      {n.orderId && (
                        <div className="font-mono text-[10px] font-bold text-slate-700 pt-0.5">
                          Order: {n.orderId}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
