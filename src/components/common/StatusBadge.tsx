import React from 'react';
import { OrderStatus, PaymentStatus, DispatchStatus } from '../../types';

interface StatusBadgeProps {
  status: OrderStatus | PaymentStatus | DispatchStatus | string;
  type?: 'order' | 'payment' | 'dispatch';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'order', className = '' }) => {
  let label = status.replace(/_/g, ' ');
  let colorStyles = 'bg-slate-100 text-slate-700 border-slate-200';

  if (type === 'order') {
    switch (status) {
      case 'PO_PENDING':
        colorStyles = 'bg-slate-50 text-slate-600 border-slate-200';
        break;
      case 'PO_RECEIVED':
        colorStyles = 'bg-sky-50 text-sky-700 border-sky-200';
        break;
      case 'PO_VERIFIED':
        colorStyles = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        break;
      case 'PROCESSING':
        colorStyles = 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse-slow';
        break;
      case 'READY_FOR_DISPATCH':
        colorStyles = 'bg-cyan-50 text-cyan-800 border-cyan-200';
        break;
      case 'DISPATCHED':
      case 'IN_TRANSIT':
        colorStyles = 'bg-purple-50 text-purple-700 border-purple-200';
        break;
      case 'DELIVERED':
        colorStyles = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold';
        break;
      case 'CLOSED':
        colorStyles = 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold';
        break;
      case 'ON_HOLD':
        colorStyles = 'bg-amber-50 text-amber-800 border-amber-200';
        break;
      case 'CANCELLED':
        colorStyles = 'bg-rose-50 text-rose-700 border-rose-200';
        break;
      default:
        colorStyles = 'bg-slate-50 text-slate-700 border-slate-200';
    }
  } else if (type === 'payment') {
    switch (status) {
      case 'PAID':
        colorStyles = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-medium';
        break;
      case 'PARTIALLY_PAID':
        colorStyles = 'bg-amber-50 text-amber-800 border-amber-200 font-medium';
        break;
      case 'PAYMENT_PENDING':
        colorStyles = 'bg-orange-50 text-orange-800 border-orange-200';
        break;
      case 'INVOICE_GENERATED':
        colorStyles = 'bg-blue-50 text-blue-700 border-blue-200';
        break;
      case 'NOT_INVOICED':
        colorStyles = 'bg-slate-50 text-slate-600 border-slate-200';
        break;
      case 'OVERDUE':
        colorStyles = 'bg-rose-50 text-rose-800 border-rose-300 font-semibold';
        break;
    }
  } else if (type === 'dispatch') {
    switch (status) {
      case 'DELIVERED':
        colorStyles = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        break;
      case 'DISPATCHED':
      case 'IN_TRANSIT':
        colorStyles = 'bg-purple-50 text-purple-700 border-purple-200';
        break;
      case 'READY':
        colorStyles = 'bg-cyan-50 text-cyan-700 border-cyan-200';
        break;
      case 'NOT_READY':
        colorStyles = 'bg-slate-50 text-slate-600 border-slate-200';
        break;
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs tracking-wide uppercase border whitespace-nowrap ${colorStyles} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 opacity-80 bg-current" />
      {label}
    </span>
  );
};
