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
}

export interface StoreProfile {
  storeName: string;
  location: string;
  avatarSeed: string;
  hasUnreadNotifications: boolean;
}

// Same no-auth caveat — real profile comes from the session once P1/P6
// exist. Kaup/outer Udupi per CLAUDE.md's single launch zone.
export const STORE_PROFILE: StoreProfile = {
  storeName: 'Ganesh Kirana Store',
  location: 'Kaup Main Road, Udupi',
  avatarSeed: 'partner-owner-ganesh',
  hasUnreadNotifications: true,
};

export const PLACEHOLDER_ORDERS: PartnerOrder[] = [
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
  },
  {
    id: '#OD48209',
    customerName: 'Anjali S.',
    items: [{ name: 'Basmati Rice 1kg', quantity: 1, unit: '1 kg', price: 95 }],
    total: 95,
    status: 'placed',
    placedAtLabel: '6 min ago',
    placedAtTime: '12:36 pm',
    orderCount: 2,
    paymentMode: 'cod',
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
  },
];
