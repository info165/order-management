import React from 'react';
import { OrderProcurementStatus } from '../../types';
import { CheckCircle2, AlertTriangle, Clock, ShoppingCart, Truck, MinusCircle } from 'lucide-react';

interface Props {
  status?: OrderProcurementStatus;
  label?: string;
  size?: 'sm' | 'md';
}

export const OrderProcurementBadge: React.FC<Props> = ({ status, label, size = 'sm' }) => {
  if (!status) return null;

  const config: Record<OrderProcurementStatus, { bg: string; text: string; border: string; icon: any; defaultLabel: string }> = {
    READY_TO_PACK: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-500/30',
      icon: CheckCircle2,
      defaultLabel: 'Stock Ready'
    },
    PROCUREMENT_REQUIRED: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-500/30',
      icon: AlertTriangle,
      defaultLabel: 'Procurement Needed'
    },
    PO_PLACED: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-500/30',
      icon: ShoppingCart,
      defaultLabel: 'PO Placed'
    },
    PARTIALLY_RECEIVED: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-500/30',
      icon: Clock,
      defaultLabel: 'Partially Received'
    },
    PACKED: {
      bg: 'bg-indigo-500/10',
      text: 'text-indigo-700 dark:text-indigo-400',
      border: 'border-indigo-500/30',
      icon: CheckCircle2,
      defaultLabel: 'Packed'
    },
    DISPATCHED: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-700 dark:text-purple-400',
      border: 'border-purple-500/30',
      icon: Truck,
      defaultLabel: 'Dispatched'
    },
    NOT_REQUIRED: {
      bg: 'bg-slate-500/10',
      text: 'text-slate-600 dark:text-slate-400',
      border: 'border-slate-500/30',
      icon: MinusCircle,
      defaultLabel: 'N/A'
    }
  };

  const current = config[status] || config.NOT_REQUIRED;
  const Icon = current.icon;
  const displayLabel = label || current.defaultLabel;

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-md border ${current.bg} ${current.text} ${current.border} ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{displayLabel}</span>
    </span>
  );
};
