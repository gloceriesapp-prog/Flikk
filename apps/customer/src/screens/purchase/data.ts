// Real order history for the Purchase tab — mapped from ApiOrder
// (api/orders.ts, GET /orders) into this screen's own display shape.
// PurchaseOrder.id is the real order_number ("FLK-100042") for a
// single-store order, or a trip-derived label for a multi-store one, shown
// to the customer; orderId is the real UUID PK (or trip_id for a trip),
// used only for navigation (TrackOrder's own route param).
//
// One card per trip, not one per store leg — mapOrderGroup takes every
// real per-store order row sharing a trip_id (utils/tripLegs.ts's own
// groupOrdersByTrip, same grouping PurchaseScreen calls before mapping)
// and combines them: items are the real union of every leg's own
// order_items, status/ETA come from whichever leg is genuinely furthest
// behind (representativeLeg — the real bottleneck, not a guess), and the
// total is the trip's own real combined total (GET /orders' own
// trips(total, delivery_fee) join) rather than summing each leg's own
// total, which is deliberately just item_total with delivery_fee 0 per
// leg (backend's own note on why that split exists).

import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import { joinStoreNames, representativeLeg } from '../../utils/tripLegs';
import type { ApiOrder } from '../../api/orders';

export interface OrderItemSummary {
  productId: string;
  name: string;
  imageUri: string;
  quantity: number;
  // Real order_items.unit_price_at_order — the price actually paid, not a
  // live re-lookup (CLAUDE.md: never derive an order's total from current
  // product prices).
  price: number;
}

export interface PurchaseOrder {
  id: string; // display order_number (or a trip-derived label)
  orderId: string; // real UUID — TrackOrder navigation target (trip_id for a trip)
  isTrip: boolean;
  status: 'placed' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';
  storeId: string;
  storeName: string;
  items: OrderItemSummary[];
  statusLabel: string;
  etaLabel: string;
  placedAtLabel: string;
  total: number;
  // Real order.placed_at (ISO) + the store's own avg_prep_minutes — what
  // OrderRow.tsx feeds into estimateDeliveryTime (utils/estimateDelivery.ts,
  // the same real ETA math TrackOrderScreen/ReceiptScreen already use) to
  // show "Arriving in X min" for a still-in-progress order, instead of a
  // static status word. null avgPrepMinutes is valid — that util already
  // falls back to a default prep time.
  placedAtIso: string;
  avgPrepMinutes: number | null;
}

const STATUS_LABEL: Record<PurchaseOrder['status'], string> = {
  placed: 'Order Placed',
  packed: 'Packed',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function formatRelativeDateTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time}`;
}

export function mapOrderGroup(group: ApiOrder[]): PurchaseOrder {
  const isTrip = group.length > 1;
  const leg = representativeLeg(group);
  const status = leg.status;
  const deliveredOrCancelled = status === 'delivered' || status === 'cancelled';
  const timestamp = leg.delivered_at ?? leg.picked_up_at ?? leg.packed_at ?? leg.placed_at;

  return {
    id: isTrip ? `TRIP-${leg.trip_id!.slice(0, 6).toUpperCase()}` : leg.order_number,
    orderId: isTrip ? leg.trip_id! : leg.id,
    isTrip,
    status,
    storeId: leg.store_id,
    storeName: isTrip ? joinStoreNames(group.map((o) => o.stores?.name ?? 'Store')) : leg.stores?.name ?? 'Store',
    items: group.flatMap((order) =>
      order.order_items.map((item) => ({
        productId: item.product_id,
        name: item.products?.name ?? 'Item',
        imageUri: item.products?.image_url ?? PLACEHOLDER_IMAGE_URI,
        quantity: item.quantity,
        price: item.unit_price_at_order,
      })),
    ),
    statusLabel: STATUS_LABEL[status],
    etaLabel: deliveredOrCancelled ? `${STATUS_LABEL[status]} at ${formatRelativeDateTime(timestamp)}` : 'Your order is on its way',
    // PastOrderCard shows this next to statusLabel ("Delivered · <label>") —
    // the terminal-status timestamp (delivered/cancelled), not when the
    // order was placed, same as every real delivery app's own history list.
    placedAtLabel: formatRelativeDateTime(timestamp),
    total: isTrip ? (leg.trips?.total ?? group.reduce((sum, order) => sum + order.total, 0)) : leg.total,
    placedAtIso: leg.placed_at,
    avgPrepMinutes: leg.stores?.avg_prep_minutes ?? leg.avg_prep_minutes ?? null,
  };
}
