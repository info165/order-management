import { Order } from '../types';

// Gap-free position of an order among all currently active (non-deleted)
// orders IN THE SAME FINANCIAL YEAR, i.e. the "SL. NO." shown in the Orders
// Registry - as opposed to order.orderId, whose numeric suffix only reflects
// a creation-time counter that drifts away from that position once earlier
// orders get deleted, and as opposed to order.serialNumber, which is a single
// counter shared across every financial year (so it keeps climbing rather
// than starting at 1 for each new year). Scoping the position to the order's
// own financial year is what makes every year's list start at 1 - an order's
// number here depends only on its own year, never on whatever other filter
// happens to be applied in the UI at the time.
//
// `allOrders` MUST be the full, unfiltered order list this session can see
// (never a subset already filtered down to one agent/school/etc.), or the
// computed position will be wrong. Callers on a page that only ever holds a
// scoped subset (e.g. an Agent/Partner's own restricted view) should not
// call this at all - there's no way to compute a true global position from
// a partial list, and Firestore's security rules don't allow that session
// to fetch the full list to begin with.
export function getDisplaySerialNo(order: Order, allOrders: Order[]): number | undefined {
  const position = [...allOrders]
    .filter(o => !o.isDeleted && o.financialYear === order.financialYear)
    .sort((a, b) => (a.serialNumber || 0) - (b.serialNumber || 0))
    .findIndex(o => o.orderId === order.orderId) + 1;
  return position || undefined;
}
