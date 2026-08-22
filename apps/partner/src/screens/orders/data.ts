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
}

// Flikk's cut, shown to the store owner as a transparent breakdown on
// OrderDetailScreen (order total → platform fee → net payout) rather than
// making them take the total on faith. Store-wide flat rate for now — no
// per-store negotiated rate exists yet.
export const PLATFORM_COMMISSION_PERCENT = 12;

export interface PartnerOrder {
  id: string;
  customerName: string;
  items: OrderLineItem[];
  total: number;
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
export { STORE_PROFILE } from '../store-settings/data';

// Anchors every placeholder order's placedAtTimestamp to app-load time,
// offset to match its own placedAtLabel — so the order-expiry grace
// window (5 min total) reflects what the label already says instead of
// contradicting it. Kept under 5 min for every 'placed' order on purpose:
// a demo order that's already past the window would get silently
// auto-rejected by useOrderExpiryWatcher the instant the app opens, which
// reads as a bug, not a feature, to whoever's looking at this data.
const NOW = Date.now();
const MINUTES = 60 * 1000;

export const PLACEHOLDER_ORDERS: PartnerOrder[] = [
  // Newest first, matching the "new order" reference this app's own alert
  // (src/features/incoming-order-alert/) is built to match — see that
  // folder's own note on why it's mounted unconditionally for now.
  {
    id: '#OD48221',
    customerName: 'Nishal P.',
    items: [
      { name: 'Toor Dal', quantity: 1, unit: '500 g', price: 156 },
      { name: 'Kori Rotti Masala', quantity: 1, unit: '100 g', price: 68 },
      { name: 'Milk', quantity: 1, unit: '500 ml', price: 80 },
    ],
    total: 304,
    status: 'placed',
    placedAtLabel: 'Just now',
    placedAtTime: '12:44 pm',
    orderCount: 3,
    paymentMode: 'prepaid',
    deliveryAddress: ['Koramangala 4th Block', 'Kaup Main Road, Udupi'],
    customerPhone: '+919845012345',
    placedAtTimestamp: NOW,
  },
  {
    id: '#OD48213',
    customerName: 'Ramesh K.',
    items: [
      { name: 'Nandini Pouch Curd', quantity: 2, unit: '400 g pouch', price: 60 },
      { name: 'Onion (Eerulli)', quantity: 1, unit: '1 kg', price: 28 },
      { name: 'Tomato', quantity: 1, unit: '500 g', price: 40 },
    ],
    total: 128,
    status: 'placed',
    placedAtLabel: '2 min ago',
    placedAtTime: '12:40 pm',
    orderCount: 7,
    paymentMode: 'prepaid',
    deliveryAddress: ['Vidya Nagar 2nd Cross', 'Near Kaup Beach Road, Udupi'],
    customerPhone: '+919845098765',
    placedAtTimestamp: NOW - 2 * MINUTES,
  },
  {
    id: '#OD48209',
    customerName: 'Anjali S.',
    items: [{ name: 'Basmati Rice 1kg', quantity: 1, unit: '1 kg', price: 95 }],
    total: 95,
    status: 'placed',
    // Was '6 min ago' — moved inside the 5-minute window (see NOW/MINUTES
    // note above) so this order doesn't vanish on app load.
    placedAtLabel: '3 min ago',
    placedAtTime: '12:36 pm',
    orderCount: 2,
    paymentMode: 'cod',
    deliveryAddress: ['Santhekatte Junction', 'Kaup, Udupi'],
    customerPhone: '+919845011223',
    placedAtTimestamp: NOW - 3 * MINUTES,
  },
  {
    id: '#OD48198',
    customerName: 'Vinod P.',
    items: [
      { name: 'Cow Ghee', quantity: 1, unit: '500 ml', price: 300 },
      { name: 'Toor Dal', quantity: 2, unit: '500 g', price: 156 },
    ],
    total: 456,
    status: 'packed',
    placedAtLabel: '22 min ago',
    placedAtTime: '12:20 pm',
    orderCount: 4,
    paymentMode: 'prepaid',
    deliveryAddress: ['Church Road', 'Kaup Main Road, Udupi'],
    customerPhone: '+919845033445',
    placedAtTimestamp: NOW - 22 * MINUTES,
  },
  {
    id: '#OD48187',
    customerName: 'Lakshmi N.',
    items: [
      { name: 'Sunflower Oil', quantity: 1, unit: '1 L', price: 140 },
      { name: 'Basmati Rice 1kg', quantity: 1, unit: '1 kg', price: 100 },
    ],
    total: 240,
    status: 'out_for_delivery',
    placedAtLabel: '38 min ago',
    placedAtTime: '12:04 pm',
    orderCount: 1,
    paymentMode: 'cod',
    deliveryAddress: ['Mangalpady Road', 'Kaup, Udupi'],
    customerPhone: '+919845066778',
    placedAtTimestamp: NOW - 38 * MINUTES,
  },
];
