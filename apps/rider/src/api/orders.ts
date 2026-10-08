// Real GET /rider/assignments + PATCH /orders/:id/status — replaces
// data/mockOrders.ts's generateMockOrder as this app's actual order
// source. toRiderOrder below is the one place backend truth gets
// translated into the RiderOrder shape every screen already renders, so
// screens themselves never needed to change.

import { distanceKm } from '../utils/geo';
import type { OrderItemLine, RiderOrder } from '../data/mockOrders';

// Payout comes from the backend (rider_payout, backend/src/lib/
// riderDeliveryMoney.ts): what this order — or, on a trip leg, the whole
// trip — pays the rider under the admin pay settings, or the earning already
// recorded once delivered. No surge or tips exist in the schema, so surge
// stays 0.

type BackendOrderStatus = 'placed' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'failed';

interface RawOrderItem {
  quantity: number;
  unit_at_order?: string | null;
  products: { name: string; unit: string } | null;
}

interface RawAssignment {
  id: string;
  status: BackendOrderStatus;
  placed_at: string;
  delivered_at: string | null;
  cancel_reason: string | null;
  // Real orders.trip_id (backend/migrations/014_trips.sql) — null for the
  // common single-store order, set when this is one leg of a multi-store
  // checkout. RiderOrder's own note explains what this drives.
  trip_id: string | null;
  order_items: RawOrderItem[];
  stores: { name: string; phone: string | null; lat: number | null; lng: number | null; manual_address: string | null; address_line: string | null; zones: { name: string } | null } | null;
  users: { name: string | null; phone: string } | null;
  addresses: { line1: string; landmark: string | null; latitude: number | null; longitude: number | null; delivery_instructions: string | null } | null;
  // Backend-derived (lib/riderDeliveryMoney.ts): how the customer pays and,
  // for cash on delivery, how much to collect for the whole order/trip.
  payment_method: 'cod' | 'online';
  cash_to_collect: number;
  rider_payout: number;
  rider_payout_base: number;
  rider_payout_extra_stop: number;
}

// client (and its auth-store → RN chain) is imported lazily so this module's
// pure mapping (toRiderOrder) can be unit-tested under plain node/tsx without
// dragging in react-native. Metro caches the module — no per-call cost.
export async function fetchAssignments(): Promise<RawAssignment[]> {
  const { apiRequest } = await import('./client');
  const result: RawAssignment[] = [];
  let cursor: string | null = null;
  do {
    const page: { items: RawAssignment[]; nextCursor: string | null } = await apiRequest(`/rider/assignments?view=sync&page=1&limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    result.push(...page.items); cursor = page.nextCursor;
  } while (cursor);
  return result;
}

export async function updateOrderStatus(orderId: string, status: BackendOrderStatus, reason?: string, otp?: string): Promise<void> {
  const { apiRequest } = await import('./client');
  return apiRequest(`/orders/${orderId}/status`, { method: 'PATCH', body: { status, reason, otp } });
}

// packed/out_for_delivery are the only statuses a rider ever actually acts
// on (an order becomes visible to them at 'packed', per admin's own
// assign-rider guard) — 'placed' should never reach this app at all
// (defensive filter below), and out_for_delivery always maps to
// 'picked_up' here: whether a specific order is further along, at its own
// local-only 'arrived_at_customer' milestone (no backend column for
// this — it's a client-side sub-stage, see useRiderOrdersStore.ts's own
// note), is merged in by the store, not decided here.
function toLocalStatus(status: BackendOrderStatus): RiderOrder['status'] | null {
  switch (status) {
    case 'packed':
      return 'assigned';
    case 'out_for_delivery':
      return 'picked_up';
    case 'delivered':
      return 'delivered';
    case 'cancelled':
      return 'cancelled';
    // A failed (post-pickup) order is terminal and paid server-side — it has
    // no place in the rider's ACTIVE list, so drop it here (returns null). The
    // rider app has no separate "failed" list surface yet; see failOrder in
    // useRiderOrdersStore.ts (optimistic removal on the action itself).
    case 'failed':
      return null;
    default:
      return null;
  }
}

export function toRiderOrder(row: RawAssignment): RiderOrder | null {
  const status = toLocalStatus(row.status);
  if (!status) return null;

  const items: OrderItemLine[] = row.order_items.map((oi) => ({
    name: oi.products?.name ?? 'Item',
    quantity: oi.quantity,
    unit: oi.unit_at_order ?? oi.products?.unit ?? undefined,
  }));
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  // Trip legs all share the one trip-level payout (same value on every
  // leg's card, not multiplied per leg) — MultiStopJobCard's own note on
  // why it doesn't sum this across legs.
  const payout = Number(row.rider_payout) || 0;

  const storeCoords =
    row.stores?.lat != null && row.stores?.lng != null ? { latitude: row.stores.lat, longitude: row.stores.lng } : null;
  const customerCoords =
    row.addresses?.latitude != null && row.addresses?.longitude != null
      ? { latitude: row.addresses.latitude, longitude: row.addresses.longitude }
      : null;

  return {
    id: row.id,
    // Real backend orders have no separate human-readable order number —
    // derived from the order's own real uuid, not fabricated.
    orderNumber: `FLK-${row.id.slice(0, 6).toUpperCase()}`,
    storeName: row.stores?.name ?? 'Store',
    // Real fixed store address the owner typed at onboarding
    // (stores.manual_address, e.g. "Near Bus Stand, opp. Xyz") — falls back
    // to the reverse-geocoded pin address, then the zone name. NOT a live
    // location: a shopfront is static, geocoded once at approval.
    storeAddress: row.stores?.manual_address || row.stores?.address_line || row.stores?.zones?.name || '',
    storePhone: row.stores?.phone ?? undefined,
    // Unused by any current screen (grep confirms) — falls back to the
    // real customer location rather than 0,0 so it's at least "somewhere
    // in the right zone" if a future screen ever renders it.
    storeCoords: storeCoords ?? customerCoords ?? { latitude: 0, longitude: 0 },
    customerName: row.users?.name ?? 'Customer',
    // Address text (line1) is display context for the rider; landmark and
    // deliveryNote are kept SEPARATE (drop-nav renders each in its own row)
    // rather than joined into one string. The drop MAP still routes by
    // customerCoords (the live pin) only — this text never drives routing.
    customerAddress: row.addresses?.line1 ?? '',
    landmark: row.addresses?.landmark ?? undefined,
    deliveryNote: row.addresses?.delivery_instructions ?? undefined,
    customerCoords: customerCoords ?? { latitude: 0, longitude: 0 },
    customerPhone: row.users?.phone ?? '',
    itemCount,
    items,
    payout,
    baseFare: Number(row.rider_payout_base) || 0,
    extraStopFare: Number(row.rider_payout_extra_stop) || 0,
    surge: 0,
    distanceKm: storeCoords && customerCoords ? distanceKm(storeCoords, customerCoords) : 0,
    status,
    placedAt: row.placed_at,
    deliveredAt: row.delivered_at ?? undefined,
    cancelReason: row.cancel_reason ?? undefined,
    tripId: row.trip_id ?? undefined,
    paymentMethod: row.payment_method === 'online' ? 'online' : 'cod',
    cashToCollect: Number(row.cash_to_collect) || 0,
  };
}
