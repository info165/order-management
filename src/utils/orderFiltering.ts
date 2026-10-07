import type { Order } from '../types';
import type { NumericFilterValue } from '../components/orders/ColumnFilterPopover';

export interface OrderFilterState {
  searchQuery: string;
  selectedFY: string;
  overdueDelivery: boolean;
  overduePayment: boolean;
  todayStr: string;
  contractSearch: string;
  schools: string[];
  categories: string[];
  agents: string[];
  companies: string[];
  statuses: string[];
  dispatchStatuses: string[];
  paymentStatuses: string[];
  valueFilter: NumericFilterValue;
  isAgentView: boolean;
}

export type FilterColumn = 'school' | 'category' | 'agent' | 'company' | 'status' | 'dispatch' | 'payment';

// The same rules the Orders Registry table applies (its "Core Filtering
// Pipeline"), kept in step with it, so a column's filter list can show only
// values from the orders that pass every OTHER filter. `skip` leaves out one
// column's own selection: ticking a school must not hide the other schools in
// the School list, or you could never tick a second one.
export function orderPassesFilters(o: Order, f: OrderFilterState, skip?: FilterColumn): boolean {
  if (o.isDeleted) return false;

  if (f.searchQuery.trim()) {
    const q = f.searchQuery.toLowerCase().trim();
    const contractStr = (o.contractNumber || o.purchaseOrderNumber || o.orderNumber || '').toLowerCase();
    const match =
      (o.serialNumber !== undefined && String(o.serialNumber).includes(q)) ||
      contractStr.includes(q) ||
      o.orderId.toLowerCase().includes(q) ||
      o.schoolName.toLowerCase().includes(q) ||
      (o.company && o.company.toLowerCase().includes(q)) ||
      (o.agentName && o.agentName.toLowerCase().includes(q)) ||
      (o.category && o.category.toLowerCase().includes(q)) ||
      (o.docketNumber && o.docketNumber.toLowerCase().includes(q)) ||
      (o.courierName && o.courierName.toLowerCase().includes(q));
    if (!match) return false;
  }

  if (f.selectedFY !== 'ALL' && o.financialYear !== f.selectedFY) return false;

  if (f.overdueDelivery) {
    const isOverdue =
      o.expectedDeliveryDate &&
      o.expectedDeliveryDate < f.todayStr &&
      o.deliveryStatus !== 'Delivered' &&
      o.status !== 'DELIVERED' &&
      o.status !== 'CANCELLED';
    if (!isOverdue) return false;
  }

  if (f.overduePayment) {
    const isOverdue =
      o.expectedPaymentDate &&
      o.expectedPaymentDate < f.todayStr &&
      o.paymentStatus !== 'PAID' &&
      o.status !== 'CANCELLED';
    if (!isOverdue) return false;
  }

  if (f.contractSearch.trim().length > 0) {
    const term = f.contractSearch.toLowerCase().trim();
    const contractStr = (o.contractNumber || o.purchaseOrderNumber || o.orderNumber || '').toLowerCase();
    const serialStr = o.serialNumber !== undefined ? String(o.serialNumber) : '';
    if (!contractStr.includes(term) && !serialStr.includes(term)) return false;
  }

  if (skip !== 'school' && f.schools.length > 0 && !f.schools.includes(o.schoolName)) return false;
  if (skip !== 'category' && f.categories.length > 0 && !f.categories.includes(o.category)) return false;
  if (skip !== 'agent' && !f.isAgentView && f.agents.length > 0 && !f.agents.includes(o.agentId || 'AGT-DIRECT')) return false;
  if (skip !== 'company' && f.companies.length > 0 && !f.companies.includes(o.company || 'FIPL')) return false;
  if (skip !== 'status' && f.statuses.length > 0 && !f.statuses.includes(o.status)) return false;
  if (skip !== 'dispatch' && f.dispatchStatuses.length > 0 && !f.dispatchStatuses.includes(o.dispatchStatus)) return false;
  if (skip !== 'payment' && f.paymentStatuses.length > 0 && !f.paymentStatuses.includes(o.paymentStatus)) return false;

  if (f.valueFilter.mode !== 'ANY') {
    const val = o.orderValue;
    const min = f.valueFilter.min ?? 0;
    const max = f.valueFilter.max ?? Infinity;
    if (f.valueFilter.mode === 'GT' && val < min) return false;
    if (f.valueFilter.mode === 'LT' && val > max) return false;
    if (f.valueFilter.mode === 'BETWEEN' && (val < min || val > max)) return false;
    if (f.valueFilter.mode === 'EQ' && val !== min) return false;
  }

  return true;
}
