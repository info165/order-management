import { Order } from '../types';

// Gap-free position of an order among all currently active (non-deleted)
// orders, i.e. the same number shown as "SL. NO." in the Orders Registry -
// as opposed to order.orderId, whose numeric suffix only reflects a
// creation-time counter that drifts away from that position once earlier
// orders get deleted.
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
    .filter(o => !o.isDeleted)
    .sort((a, b) => (a.serialNumber || 0) - (b.serialNumber || 0))
    .findIndex(o => o.orderId === order.orderId) + 1;
  return position || undefined;
}
