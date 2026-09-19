// Placeholder order queue (P2) — no auth/login exists yet (see App.tsx),
// so there's no session token to call the real `GET /partner/orders`
// (backend/src/routes/partner.ts already implements it). `PartnerOrder`
// intentionally mirrors that endpoint's shape (orders + order_items) so
// swapping this for a real fetch is a data change, not a redesign.
//
// 'out_for_delivery' is shown here read-only — the real endpoint queries
// `orders` scoped only by `store_id`, with no status filter, so a store
// owner can already see an order that's out for delivery, they just can't
// act on it. Per specs/02-partner-app/screens.md, "partner app triggers no
// status transition other than `packed`" — that's a restriction on writes,
// not on what this screen may display. 'delivered' still isn't shown: once
// delivered, an order has nothing left for a store owner to track.

export type PartnerOrderStatus = 'placed' | 'packed' | 'out_for_delivery';

export interface OrderLineItem {
  name: string;
  quantity: number;
  unit: string;
  // Line price (quantity already factored in) — shown per-item in
  // OrderDetailScreen's item list. Sums to PartnerOrder.total.
  price: number;
  // Real products.image_url — ItemAvatarStack's own note on why this
  // replaces the shared PLACEHOLDER_IMAGE_URI stand-in it used to always
  // show regardless of whether a product actually had a photo.
  imageUrl: string | null;
}

export interface PartnerOrder {
  // Real orders.id (UUID) — what PATCH /orders/:id/status and every
  // action callback (markPacked, rejectOrder, acknowledgeOrder) actually
  // use. Never rendered as text — orderNumber is what's shown.
  id: string;
  // Real orders.order_number ("FLK-100042") — what OrderCard/
  // OrderDetailScreen display instead of the raw UUID above.
  orderNumber: string;
  customerName: string;
  items: OrderLineItem[];
  total: number;
  // Real orders.item_total/commission_amount (api/orders.ts's ApiOrder,
  // backend's own COMMISSION_RATE) — netPayout = itemTotal - commissionAmount,
  // never order.total - commission: delivery fee is never store revenue,
  // so commission is only ever taken off the item total, matching exactly
  // how backend/src/routes/orders.ts itself computes commission_amount at
  // order-creation time (calcCommission(itemTotal, COMMISSION_RATE), never
  // against the full order total).
  itemTotal: number;
  commissionAmount: number;
  netPayout: number;
  status: PartnerOrderStatus;
  placedAtLabel: string;
  // Clock time the order was placed — shown alongside orderCount in
  // OrderDetailScreen ("Ramesh's 7th order · 12:40 pm"), distinct from the
  // relative placedAtLabel used in the queue.
  placedAtTime: string;
  // How many orders this customer has placed at this store, this one
  // included — a repeat-customer signal for the store owner.
  orderCount: number;
  // 'cod' means the store owner collects cash on delivery — 'prepaid'
  // means Razorpay already settled it, nothing to collect. Shown up top in
  // OrderDetailScreen since it changes what the store owner does when the
  // order goes out, unlike the relative placedAtLabel it replaced there.
  paymentMode: 'prepaid' | 'cod';
  // Two-line drop-off — shown on the incoming-order alert's "Deliver to"
  // section (features/incoming-order-alert/). Not the full addresses
  // table shape from specs/00-foundation/data-model.md (label, landmark,
  // zone_id) — just the two lines a store owner actually needs to read at
  // a glance before accepting.
  deliveryAddress: [string, string];
  // Real tel: number — the alert's call button actually dials this via
  // Linking.openURL, not a stub. A store owner deciding whether to accept
  // an order sometimes needs to reach the customer before committing to
  // it (address unclear, item substitution question), not only after.
  customerPhone: string;
  // Epoch ms — the anchor for the total accept window
  // (features/order-expiry/orderExpiry.ts's ORDER_ACCEPT_WINDOW_MS), not
  // derivable from placedAtLabel ("2 min ago" isn't a timestamp) or
  // placedAtTime ("12:40 pm" has no date and drifts stale by the next
  // day). A real fetch populates this from orders.placed_at.
  placedAtTimestamp: number;
}

// StoreProfile's canonical shape/data now lives in
// ../store-settings/data.ts (P6 owns it — it's a fuller store-settings
// object now: category, hours, avg prep time, phone, none of which
// belongs in an order-queue data file). Re-exported here since
// OrdersScreen/StoreProfileHeader already import it from './data' — this
// keeps that import path working without every caller needing to know the
// type moved. Live mutations (the Open/Closed toggle, settings edits) go
// through ../../store/useStoreProfileStore.ts, not this constant directly.
export type { StoreProfile } from '../store-settings/data';

// Real order queue now — mapApiOrder converts one GET /partner/orders row
// (api/orders.ts's own ApiOrder) into this screen's display shape.
// orderCount (repeat-customer signal) is computed across the *other*
// already-fetched rows passed in, not a separate query — GET /partner/orders
// already returns this store's entire order history in one call, so
// counting a customer's prior orders at this store is free.

import type { ApiOrder } from '../../api/orders';

// Same rounding backend/src/lib/pricing.ts's own round2 does — item_total
// and commission_amount are each already 2dp from the server, but a plain
// JS subtraction of two such values can still land on something like
// 123.99999999999997 depending on the exact inputs.
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function mapApiOrder(order: ApiOrder, allOrders: ApiOrder[]): PartnerOrder {
  // Every order this same customer has placed at this store, oldest first
  // — this order's own 1-based position in that list is "the Nth order",
  // matching the original "Ramesh's 7th order" convention.
  const sameCustomerOrdered = allOrders
    .filter((o) => o.users?.phone === order.users?.phone)
    .sort((a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime());
  const orderCount = sameCustomerOrdered.findIndex((o) => o.id === order.id) + 1;

  return {
    id: order.id,
    orderNumber: order.order_number,
    customerName: order.users?.name?.trim() || order.users?.phone || 'Customer',
    items: order.order_items.map((item) => ({
      name: item.products?.name ?? 'Item',
      quantity: item.quantity,
      unit: item.products?.unit ?? '',
      price: item.unit_price_at_order * item.quantity,
      imageUrl: item.products?.image_url ?? null,
    })),
    total: order.total,
    itemTotal: order.item_total,
    commissionAmount: order.commission_amount,
    netPayout: round2(order.item_total - order.commission_amount),
    // 'delivered'/'cancelled' orders are filtered out before this ever
    // runs (useOrdersStore's own loadOrders) — this screen's queue has no
    // use for either, same as the placeholder data it replaces.
    status: order.status as PartnerOrderStatus,
    placedAtLabel: formatRelativeTime(order.placed_at),
    placedAtTime: new Date(order.placed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    orderCount,
    // No real payment_mode column on `orders` yet — a captured Razorpay
    // payment id is the honest proxy available today (see backend's own
    // POST /payments/confirm-simulated note): if one exists, the order was
    // paid online; if not, it's COD. A real payment_mode field belongs on
    // the schema once COD stops routing through the same simulated-payment
    // call prepaid orders do — a real, separate gap, not invented here.
    paymentMode: order.razorpay_payment_id ? 'prepaid' : 'cod',
    deliveryAddress: [order.addresses?.line1 ?? 'Address unavailable', order.addresses?.landmark ?? ''],
    customerPhone: order.users?.phone ?? '',
    placedAtTimestamp: new Date(order.placed_at).getTime(),
  };
}
