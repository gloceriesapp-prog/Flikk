// Placeholder order queue (P2) — no auth/login exists yet (see App.tsx),
// so there's no session token to call the real `GET /partner/orders`
// (backend/src/routes/partner.ts already implements it). `PartnerOrder`
// intentionally mirrors that endpoint's shape (orders + order_items) so
// swapping this for a real fetch is a data change, not a redesign.
//
// 'out_for_delivery'/'delivered' are shown here read-only — the real
// endpoint queries `orders` scoped only by `store_id`, with no status
// filter, so a store owner can already see an order in either state, they
// just can't act on it. Per specs/02-partner-app/screens.md, "partner app
// triggers no status transition other than `packed`" — that's a
// restriction on writes, not on what this screen may display.
// 'delivered' orders ARE shown now (useOrdersStore's own loadOrders scopes
// them to today only, see that file's own note on why) — a store owner
// still wants confirmation an order actually completed, not just that it
// left for delivery.

// 'failed' = rider couldn't complete the drop after pickup (goods already
// left the store) — terminal, shown read-only so the owner knows their
// stock is stranded and can follow up. Distinct from 'cancelled' (dropped
// before anything left the shop, filtered out entirely — useOrdersStore).
export type PartnerOrderStatus = 'placed' | 'packed' | 'out_for_delivery' | 'delivered' | 'failed';

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
  // Only ever true for buildSampleOrders()'s own rows — never set on a
  // mapApiOrder() result. Lets OrdersScreen show a plain banner instead of
  // silently mixing fake orders into what looks like a real queue.
  isSample?: boolean;
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

// Dev/preview-only queue — four orders covering the states OrderCard
// actually renders differently (placed/packed/out_for_delivery/delivered,
// cod/prepaid, single-item/multi-item, with/without a product photo) so the UI
// can be checked without a real store's order history. Same "isSample:
// true, shown only when the real fetch is empty" gate as payouts' own
// buildSamplePayouts (screens/payouts/data.ts) — never mixed with real
// rows, never persisted anywhere. useOrdersStore.loadOrders() only calls
// this once (keeps the same placedAtTimestamp across every later poll) —
// see that file's own note on why regenerating it every poll broke the
// countdown.
export function buildSampleOrders(now: number = Date.now()): PartnerOrder[] {
  return [
    {
      id: 'sample-order-1',
      orderNumber: 'FLK-100042',
      customerName: 'Ramesh Shetty',
      items: [
        { name: 'Toor Dal', quantity: 1, unit: '1 kg', price: 145, imageUrl: null },
        { name: 'Sunflower Oil', quantity: 2, unit: '1 L', price: 320, imageUrl: null },
        { name: 'Amul Milk', quantity: 4, unit: '500 ml', price: 112, imageUrl: null },
      ],
      total: 607,
      itemTotal: 577,
      commissionAmount: 34.62,
      netPayout: 542.38,
      status: 'placed',
      placedAtLabel: 'Just now',
      placedAtTime: new Date(now).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      orderCount: 7,
      paymentMode: 'cod',
      deliveryAddress: ['12, Bunts Hostel Road', 'Near Kapu Junction'],
      customerPhone: '+919900011122',
      placedAtTimestamp: now, // 0 mins elapsed (Just now)
      isSample: true,
    },
    {
      id: 'sample-order-2',
      orderNumber: 'FLK-100041',
      customerName: 'Anitha Poojary',
      items: [{ name: 'Basmati Rice', quantity: 1, unit: '5 kg', price: 460, imageUrl: null }],
      total: 490,
      itemTotal: 460,
      commissionAmount: 27.6,
      netPayout: 432.4,
      status: 'packed',
      placedAtLabel: '4 min ago',
      placedAtTime: new Date(now - 4 * 60_000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      orderCount: 2,
      paymentMode: 'prepaid',
      deliveryAddress: ['4th Cross, Malpe Road', ''],
      customerPhone: '+919900022233',
      placedAtTimestamp: now - 4 * 60_000, // 4 mins elapsed
      isSample: true,
    },
    {
      id: 'sample-order-3',
      orderNumber: 'FLK-100039',
      customerName: 'Prakash Kamath',
      items: [
        { name: 'Colgate Toothpaste', quantity: 1, unit: '150 g', price: 89, imageUrl: null },
        { name: 'Lifebuoy Soap', quantity: 3, unit: '125 g', price: 105, imageUrl: null },
      ],
      total: 224,
      itemTotal: 194,
      commissionAmount: 11.64,
      netPayout: 182.36,
      status: 'out_for_delivery',
      placedAtLabel: '8 min ago',
      placedAtTime: new Date(now - 8 * 60_000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      orderCount: 1,
      paymentMode: 'cod',
      deliveryAddress: ['Shanthi Nagar, 2nd Main', 'Opposite water tank'],
      customerPhone: '+919900033344',
      placedAtTimestamp: now - 8 * 60_000, // 8 mins elapsed
      isSample: true,
    },
    {
      id: 'sample-order-4',
      orderNumber: 'FLK-100037',
      customerName: 'Divya Rao',
      items: [{ name: 'Aashirvaad Atta', quantity: 1, unit: '5 kg', price: 285, imageUrl: null }],
      total: 315,
      itemTotal: 285,
      commissionAmount: 17.1,
      netPayout: 267.9,
      status: 'delivered',
      placedAtLabel: '55 min ago',
      placedAtTime: new Date(now - 55 * 60_000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      orderCount: 4,
      paymentMode: 'prepaid',
      deliveryAddress: ['Hotel Sea Rock Road', 'Near Kaup Beach'],
      customerPhone: '+919900044455',
      placedAtTimestamp: now - 55 * 60_000,
      isSample: true,
    },
  ];
}

// Dev-only — fires the exact real "new order" path (useOrdersStore's own
// simulateIncomingOrder injects this into `orders` AND newlyArrivedOrderIds
// together, which is the one condition useIncomingOrderAlert.ts's effect
// actually watches for) so previewing the full-screen alert + its sound
// means testing the real production trigger, not a separate mock screen
// that could quietly drift from what a genuine incoming order does.
// 'sample-' id prefix reuses the same short-circuit markPacked/rejectOrder
// already have for sample data — tapping Accept/Reject on this never hits
// the real backend with a fake id.
let simulatedOrderCounter = 0;

export function buildSimulatedIncomingOrder(now: number = Date.now()): PartnerOrder {
  simulatedOrderCounter += 1;
  const orderNumber = `FLK-${100050 + simulatedOrderCounter}`;
  return {
    id: `sample-sim-${now}-${simulatedOrderCounter}`,
    orderNumber,
    customerName: 'Test Customer',
    items: [
      { name: 'Toor Dal', quantity: 1, unit: '1 kg', price: 145, imageUrl: null },
      { name: 'Amul Milk', quantity: 2, unit: '500 ml', price: 56, imageUrl: null },
    ],
    total: 231,
    itemTotal: 201,
    commissionAmount: 12.06,
    netPayout: 188.94,
    status: 'placed',
    placedAtLabel: 'Just now',
    placedAtTime: new Date(now).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    orderCount: 1,
    paymentMode: 'cod',
    deliveryAddress: ['12, Bunts Hostel Road', 'Near Kapu Junction'],
    customerPhone: '+919900099999',
    placedAtTimestamp: now,
    isSample: true,
  };
}

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
  if (minutes <= 10) return `${minutes} min ago`;

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
      unit: item.unit_at_order ?? item.products?.unit ?? '',
      price: item.unit_price_at_order * item.quantity,
      imageUrl: item.products?.image_url ?? null,
    })),
    total: order.total,
    itemTotal: order.item_total,
    commissionAmount: order.commission_amount,
    netPayout: round2(order.item_total - order.commission_amount),
    // 'cancelled' orders are filtered out before this ever runs
    // (useOrdersStore's own loadOrders) — this screen's queue has no use
    // for them. 'delivered' (today only) and 'failed' DO reach here — the
    // cast below is always one of the five real PartnerOrderStatus values.
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
