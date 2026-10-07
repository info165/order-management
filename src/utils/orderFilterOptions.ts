import type { Order } from '../types';

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

const byLabel = (a: FilterOption, b: FilterOption) => a.label.localeCompare(b.label);

export function schoolOptionsFrom(orders: Order[]): FilterOption[] {
  const counts = new Map<string, number>();
  orders.forEach(o => {
    if (o.schoolName) {
      counts.set(o.schoolName, (counts.get(o.schoolName) || 0) + 1);
    }
  });
  return Array.from(counts.entries())
    .map(([name, count]) => ({ value: name, label: name, count }))
    .sort(byLabel);
}

export function categoryOptionsFrom(orders: Order[]): FilterOption[] {
  const counts = new Map<string, number>();
  orders.forEach(o => {
    if (o.category) {
      counts.set(o.category, (counts.get(o.category) || 0) + 1);
    }
  });
  return Array.from(counts.entries())
    .map(([name, count]) => ({ value: name, label: name, count }))
    .sort(byLabel);
}

export function agentOptionsFrom(orders: Order[]): FilterOption[] {
  const counts = new Map<string, { name: string; count: number }>();
  orders.forEach(o => {
    const id = o.agentId || 'AGT-DIRECT';
    const name = o.agentName || 'In-House / Direct';
    const existing = counts.get(id);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(id, { name, count: 1 });
    }
  });
  return Array.from(counts.entries())
    .map(([id, info]) => ({ value: id, label: info.name, count: info.count }))
    .sort(byLabel);
}

export function companyOptionsFrom(orders: Order[]): FilterOption[] {
  const counts = new Map<string, number>();
  orders.forEach(o => {
    const comp = o.company || 'FIPL';
    counts.set(comp, (counts.get(comp) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([comp, count]) => ({ value: comp, label: comp, count }))
    .sort(byLabel);
}

// A value that is ticked but has no orders under the current year is kept in
// the list with a count of 0, so it can still be seen and unticked instead of
// silently filtering the table with no visible reason. When nothing is missing
// the original list is returned untouched.
export function keepSelectedVisible(
  options: FilterOption[],
  selected: string[],
  labelFor: (value: string) => string = v => v
): FilterOption[] {
  const have = new Set(options.map(o => o.value));
  const missing = selected.filter(v => !have.has(v)).map(v => ({ value: v, label: labelFor(v), count: 0 }));
  return missing.length === 0 ? options : [...options, ...missing].sort(byLabel);
}
