// Real GET /rider/assignments + PATCH /orders/:id/status — replaces
// data/mockOrders.ts's generateMockOrder as this app's actual order
// source. toRiderOrder below is the one place backend truth gets
// translated into the RiderOrder shape every screen already renders, so
// screens themselves never needed to change.

import { apiRequest } from './client';
import { distanceKm } from '../utils/geo';
import type { OrderItemLine, RiderOrder } from '../data/mockOrders';

// Every delivery pays this flat fee — backend/src/routes/orders.ts's own
// DELIVERY_FEE constant (rider_earnings is written with exactly this
// amount on every 'delivered' transition). No distance-based fare, no
// surge, no tips exist anywhere in the schema yet — baseFare/distanceFare/
// surge below are zeroed out to match that real model honestly rather
// than fabricate a breakdown the backend doesn't actually compute or pay.
// Keep this in sync with that constant by hand until a shared constants
// module exists (packages/shared) — not worth one for a single number at
// this scale.
const DELIVERY_FEE = 25;

type BackendOrderStatus = 'placed' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';

interface RawOrderItem {
  quantity: number;
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
  stores: { name: string; lat: number | null; lng: number | null; zones: { name: string } | null } | null;
  users: { name: string | null; phone: string } | null;
  addresses: { line1: string; landmark: string | null; latitude: number | null; longitude: number | null } | null;
}

export function fetchAssignments(): Promise<RawAssignment[]> {
  return apiRequest('/rider/assignments');
}

export function updateOrderStatus(orderId: string, status: BackendOrderStatus, reason?: string): Promise<void> {
  return apiRequest(`/orders/${orderId}/status`, { method: 'PATCH', body: { status, reason } });
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
  }));
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

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
    storeAddress: row.stores?.zones?.name ?? '',
    // Unused by any current screen (grep confirms) — falls back to the
    // real customer location rather than 0,0 so it's at least "somewhere
    // in the right zone" if a future screen ever renders it.
    storeCoords: storeCoords ?? customerCoords ?? { latitude: 0, longitude: 0 },
    customerName: row.users?.name ?? 'Customer',
    customerAddress: [row.addresses?.line1, row.addresses?.landmark].filter(Boolean).join(', '),
    customerCoords: customerCoords ?? { latitude: 0, longitude: 0 },
    customerPhone: row.users?.phone ?? '',
    itemCount,
    items,
    payout: DELIVERY_FEE,
    baseFare: DELIVERY_FEE,
    distanceFare: 0,
    surge: 0,
    distanceKm: storeCoords && customerCoords ? distanceKm(storeCoords, customerCoords) : 0,
    status,
    placedAt: row.placed_at,
    deliveredAt: row.delivered_at ?? undefined,
    cancelReason: row.cancel_reason ?? undefined,
    tripId: row.trip_id ?? undefined,
  };
}
