import type { Order } from '../types';

// Orders saved without a financial year are treated as this one - the same
// fallback the Orders Registry shows for them.
const UNSET_FINANCIAL_YEAR = '2026-27';

export type FinancialYearOrder = Pick<Order, 'financialYear'>;

export const fyOf = (o: FinancialYearOrder): string => o.financialYear || UNSET_FINANCIAL_YEAR;

// Every year present in the orders, newest first ("2026-27" sorts after
// "2025-26" as plain text).
export function listFinancialYears(orders: FinancialYearOrder[]): string[] {
  return Array.from(new Set(orders.map(fyOf))).sort().reverse();
}

export function countByFinancialYear(orders: FinancialYearOrder[]): Record<string, number> {
  const counts: Record<string, number> = {};
  orders.forEach(o => {
    const fy = fyOf(o);
    counts[fy] = (counts[fy] || 0) + 1;
  });
  return counts;
}

// 'ALL' passes everything through untouched.
export function filterByFinancialYear<T extends FinancialYearOrder>(orders: T[], fy: string): T[] {
  return fy === 'ALL' ? orders : orders.filter(o => fyOf(o) === fy);
}

// The newest year that has orders, or 'ALL' when there are none yet. Used as the
// starting view so the list opens on the current year without a year being
// hard-coded here.
export function latestFinancialYear(orders: FinancialYearOrder[]): string {
  return listFinancialYears(orders)[0] ?? 'ALL';
}
