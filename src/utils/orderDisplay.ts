import { Order } from '../types';

// The number shown as "SL. NO." / "Order No" throughout the app. This used
// to be a gap-free *position* recomputed among non-deleted orders, which
// meant every order's displayed number silently shifted whenever an earlier
// order was deleted - e.g. order #123 would start showing as "122" once
// order #122 was soft-deleted, making it look like the wrong order's data
// was on screen. It now just returns the order's own stored serial number,
// which never changes regardless of what else gets deleted.
export function getDisplaySerialNo(order: Order, _allOrders: Order[]): number | undefined {
  return order.serialNumber;
}
