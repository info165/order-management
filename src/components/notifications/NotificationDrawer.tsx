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
      <style>{`
        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.35); border-left-color: rgb(225 29 72); }
          50% { box-shadow: 0 0 0 4px rgba(225, 29, 72, 0); border-left-color: rgb(251 113 133); }
        }
        .critical-alert-blink { animation: pulse-border 1.8s ease-in-out infinite; }
      `}</style>
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
              notifications.map((n) => {
                const isCritical = n.priority === 'CRITICAL';
                return (
                  <div
                    key={n.notificationId}
                    onClick={() => onSelectNotification(n)}
                    className={`relative p-3.5 rounded-lg text-xs cursor-pointer transition-colors overflow-hidden ${
                      isCritical
                        ? 'bg-gradient-to-r from-rose-50 to-rose-50/40 hover:from-rose-100 hover:to-rose-50/60 border-l-4 border-rose-600 shadow-sm shadow-rose-200 critical-alert-blink'
                        : n.isRead
                          ? 'bg-white hover:bg-slate-50 opacity-75'
                          : 'bg-amber-50/40 hover:bg-amber-50/70 border-l-3 border-amber-500'
                    }`}
                  >
                    {isCritical && (
                      <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
                      </span>
                    )}

                    <div className="flex items-start gap-2.5">
                      {isCritical ? (
                        <span className="relative shrink-0 mt-0.5">
                          <span className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-40" />
                          <AlertTriangle className="w-4 h-4 text-rose-600 relative" />
                        </span>
                      ) : n.type === 'ERROR' || n.priority === 'HIGH' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      ) : n.type === 'WARNING' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      )}

                      <div className="flex-1 space-y-1 pr-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 min-w-0">
                            {isCritical && (
                              <span className="shrink-0 text-[9px] font-extrabold tracking-wider text-white bg-rose-600 px-1.5 py-0.5 rounded uppercase">
                                Overdue
                              </span>
                            )}
                            <span className={`font-bold truncate ${isCritical ? 'text-rose-950' : 'text-slate-900'}`}>
                              {n.title}
                            </span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" />
                            {new Date(n.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className={`text-xs leading-relaxed ${isCritical ? 'text-rose-800 font-semibold' : 'text-slate-600'}`}>
                          {n.message}
                        </p>
                        {n.orderId && (
                          <div className={`font-mono text-[10px] font-bold pt-0.5 ${isCritical ? 'text-rose-700' : 'text-slate-700'}`}>
                            Order: {n.orderId}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
