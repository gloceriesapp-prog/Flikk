// Placeholder data — same convention as PLACEHOLDER_ORDERS/PLACEHOLDER_PRODUCTS
// in apps/customer and apps/partner: every screen here is built against a
// real, believable shape from day one, so wiring the actual /admin/*
// endpoints later (specs/04-admin-dashboard/api.md) is a data-source swap,
// not a redesign. Single zone throughout (Kaup/outer Udupi) — CLAUDE.md.

import type { ActiveRider, AppDownloadStats, Application, Order, ProductPerformance, ZoneRequest } from './types';

export const ZONE_NAME = 'Kaup, Udupi';

export const PLACEHOLDER_APP_DOWNLOADS: AppDownloadStats = {
  android: 812,
  ios: 341,
  changePctThisWeek: 6.4,
  lastSyncedAt: '12 minutes ago',
  androidStatus: { health: 'issue', message: 'Crash reported on checkout screen — Android 13 devices' },
  iosStatus: { health: 'operational', message: 'No issues reported' },
};

// commissionAmount added via .map below — Order now carries a real
// commission_amount-shaped field (see lib/types.ts), computed here at a
// flat 15% for these still-mock rows since DeliveryTrackingCard (Overview)
// is the only remaining reader and doesn't care about the exact figure.
const PLACEHOLDER_ORDERS_RAW: Omit<Order, 'commissionAmount'>[] = [
  { id: 'FLK-2031', storeName: 'Ganesh Kirana Store', storeId: 's1', zone: ZONE_NAME, placedAt: '10:12 AM', amount: 486, status: 'delivered', riderId: 'r1', minutesSinceStatusChange: 42 },
  { id: 'FLK-2032', storeName: 'Shree Pharmacy', storeId: 's2', zone: ZONE_NAME, placedAt: '10:24 AM', amount: 212, status: 'out_for_delivery', riderId: 'r2', minutesSinceStatusChange: 8 },
  { id: 'FLK-2033', storeName: 'Malpe Fresh Mart', storeId: 's3', zone: ZONE_NAME, placedAt: '10:31 AM', amount: 730, status: 'packed', riderId: null, minutesSinceStatusChange: 23 },
  { id: 'FLK-2034', storeName: 'Kaup General Store', storeId: 's4', zone: ZONE_NAME, placedAt: '10:44 AM', amount: 155, status: 'placed', riderId: null, minutesSinceStatusChange: 31 },
  { id: 'FLK-2035', storeName: 'Udupi Daily Needs', storeId: 's5', zone: ZONE_NAME, placedAt: '10:52 AM', amount: 998, status: 'delivered', riderId: 'r1', minutesSinceStatusChange: 51 },
  { id: 'FLK-2036', storeName: 'Ganesh Kirana Store', storeId: 's1', zone: ZONE_NAME, placedAt: '11:03 AM', amount: 340, status: 'cancelled', riderId: null, minutesSinceStatusChange: 12 },
  { id: 'FLK-2037', storeName: 'Shree Pharmacy', storeId: 's2', zone: ZONE_NAME, placedAt: '11:15 AM', amount: 178, status: 'out_for_delivery', riderId: 'r3', minutesSinceStatusChange: 4 },
  // Earlier this month — not "today's" orders (those are FLK-2031 onward
  // above), but real completed sales feeding Balance's monthly total and
  // the Top Performing Stores leaderboard, which need more than one day
  // of history to say anything meaningful.
  { id: 'FLK-1988', storeName: 'Ganesh Kirana Store', storeId: 's1', zone: ZONE_NAME, placedAt: '2 Dec', amount: 612, status: 'delivered', riderId: 'r1', minutesSinceStatusChange: 0 },
  { id: 'FLK-1994', storeName: 'Ganesh Kirana Store', storeId: 's1', zone: ZONE_NAME, placedAt: '5 Dec', amount: 890, status: 'delivered', riderId: 'r2', minutesSinceStatusChange: 0 },
  { id: 'FLK-2001', storeName: 'Malpe Fresh Mart', storeId: 's3', zone: ZONE_NAME, placedAt: '7 Dec', amount: 1240, status: 'delivered', riderId: 'r1', minutesSinceStatusChange: 0 },
  { id: 'FLK-2008', storeName: 'Malpe Fresh Mart', storeId: 's3', zone: ZONE_NAME, placedAt: '9 Dec', amount: 940, status: 'delivered', riderId: 'r3', minutesSinceStatusChange: 0 },
  { id: 'FLK-2014', storeName: 'Shree Pharmacy', storeId: 's2', zone: ZONE_NAME, placedAt: '12 Dec', amount: 455, status: 'delivered', riderId: 'r2', minutesSinceStatusChange: 0 },
  { id: 'FLK-2019', storeName: 'Udupi Daily Needs', storeId: 's5', zone: ZONE_NAME, placedAt: '14 Dec', amount: 720, status: 'delivered', riderId: 'r1', minutesSinceStatusChange: 0 },
  { id: 'FLK-2025', storeName: 'Kaup General Store', storeId: 's4', zone: ZONE_NAME, placedAt: '16 Dec', amount: 380, status: 'delivered', riderId: 'r3', minutesSinceStatusChange: 0 },
];

export const PLACEHOLDER_ORDERS: Order[] = PLACEHOLDER_ORDERS_RAW.map((o) => ({
  ...o,
  commissionAmount: o.status === 'cancelled' ? 0 : Math.round(o.amount * 0.15),
}));

// Threshold past which an order counts as "needs attention" on the Home
// snapshot — no real SLA config exists yet, this is a reasonable founder
// default until a real one is defined.
export const ATTENTION_THRESHOLD_MINUTES = 20;

// completionRate is a real derived number, not a hand-picked one — delivered
// ÷ (delivered + cancelled), i.e. of every order that reached a terminal
// outcome, how many actually succeeded. Orders still placed/packed/in
// transit aren't counted either way yet since they haven't reached one.
const terminalOrders = PLACEHOLDER_ORDERS.filter((o) => o.status === 'delivered' || o.status === 'cancelled');
const deliveredCount = terminalOrders.filter((o) => o.status === 'delivered').length;

export const PLACEHOLDER_PRODUCT_PERFORMANCE: ProductPerformance = {
  completionRate: terminalOrders.length > 0 ? Math.round((deliveredCount / terminalOrders.length) * 100) : 100,
  avgDeliveryMinutes: 27,
  repeatCustomerRate: 64,
};

export const PLACEHOLDER_APPLICATIONS: Application[] = [
  {
    id: 'app1',
    kind: 'store',
    name: 'Brahmavar Kirana',
    category: 'Kirana & Grocery',
    zone: ZONE_NAME,
    submittedAt: '2 hours ago',
    status: 'pending',
    phone: '+91 98450 11223',
    photoUrl: undefined,
    district: 'Udupi',
    // Small kirana under ₹40L — legitimately GST-exempt, not a missing
    // document. Bank details still outstanding — a real gap the founder
    // needs to see before approving.
    fssaiNumber: '11421234000123',
    shopEstablishmentNumber: 'SE-UD-2025-0442',
    panNumber: 'ABCDE1234F',
    aadhaarLast4: '8821',
    bankAccountLast4: undefined,
    turnoverExceedsGstThreshold: false,
    gstNumber: undefined,
  },
  {
    id: 'app2',
    kind: 'rider',
    name: 'Suresh K.',
    category: null,
    zone: ZONE_NAME,
    submittedAt: '5 hours ago',
    status: 'pending',
    phone: '+91 97400 55667',
  },
  {
    id: 'app3',
    kind: 'store',
    name: 'Santhekatte Fresh',
    category: 'Fruits & Vegetables',
    zone: ZONE_NAME,
    submittedAt: '1 day ago',
    status: 'pending',
    phone: '+91 96110 88990',
    district: 'Udupi',
    // Above the GST threshold — GSTIN is genuinely required here, and
    // still missing, alongside the Shop & Establishment license.
    fssaiNumber: '11421234000456',
    shopEstablishmentNumber: undefined,
    panNumber: 'PQRSX5678K',
    aadhaarLast4: '4410',
    bankAccountLast4: '6631',
    turnoverExceedsGstThreshold: true,
    gstNumber: undefined,
  },
  {
    id: 'app4',
    kind: 'store',
    name: 'Kalyanpur Bakery',
    category: 'Bakery',
    zone: ZONE_NAME,
    submittedAt: '2 days ago',
    status: 'approved',
    phone: '+91 94480 33445',
    district: 'Udupi',
    fssaiNumber: '11421234000789',
    shopEstablishmentNumber: 'SE-UD-2025-0298',
    panNumber: 'KLMNO9012P',
    aadhaarLast4: '2290',
    bankAccountLast4: '1187',
    turnoverExceedsGstThreshold: false,
    gstNumber: undefined,
  },
  {
    id: 'app5',
    kind: 'store',
    name: 'Shree Medicals',
    category: 'Pharmacy',
    zone: ZONE_NAME,
    submittedAt: '6 hours ago',
    status: 'pending',
    phone: '+91 98807 66123',
    district: 'Udupi',
    // Pharmacy — the stricter path. Every general document plus a Drug
    // License, not a substitute for one.
    fssaiNumber: '11421234001122',
    shopEstablishmentNumber: 'SE-UD-2025-0511',
    panNumber: 'FGHIJ3456L',
    aadhaarLast4: '5567',
    bankAccountLast4: '9903',
    turnoverExceedsGstThreshold: true,
    gstNumber: '29FGHIJ3456L1Z8',
    drugLicenseNumber: undefined,
  },
];

export const PLACEHOLDER_ACTIVE_RIDERS: ActiveRider[] = [
  { id: 'r1', name: 'Adam Schleifer', phone: '+91 99001 12233', activeOrders: 2, zone: ZONE_NAME, isOnline: true },
  { id: 'r2', name: 'Naveen Shetty', phone: '+91 98802 44556', activeOrders: 1, zone: ZONE_NAME, isOnline: true },
  { id: 'r3', name: 'Rakesh Poojary', phone: '+91 97406 77889', activeOrders: 1, zone: ZONE_NAME, isOnline: false },
];

// No payment-gateway payout automation exists yet (Razorpay payout API is
// a later integration) — every settlement is founder-triggered today.
// SETTLEMENT_CADENCE_LABEL is just the expected rhythm, not a cron; the
// Transactions tab's "Release" button is the real mechanism until
// automation ships.
export const SETTLEMENT_CADENCE_LABEL = 'Weekly · every Monday';
export const AUTO_RELEASE_ENABLED = false;

// "We want Flikk here" — places a customer has searched/entered in the
// customer app that fall outside the active zone (see ZoneRequest's own
// note in lib/types.ts). Real collection doesn't exist yet — this is
// what the admin view looks like once it does, sorted by demand.
export const PLACEHOLDER_ZONE_REQUESTS: ZoneRequest[] = [
  { id: 'zr1', placeName: 'Manipal', district: 'Udupi', upvotes: 214, firstRequestedAt: '3 Nov 2025' },
  { id: 'zr2', placeName: 'Brahmavar', district: 'Udupi', upvotes: 132, firstRequestedAt: '11 Nov 2025' },
  { id: 'zr3', placeName: 'Padubidri', district: 'Udupi', upvotes: 96, firstRequestedAt: '18 Nov 2025' },
  { id: 'zr4', placeName: 'Karkala', district: 'Udupi', upvotes: 71, firstRequestedAt: '25 Nov 2025' },
  { id: 'zr5', placeName: 'Santhekatte', district: 'Udupi', upvotes: 48, firstRequestedAt: '2 Dec 2025' },
  { id: 'zr6', placeName: 'Kundapura', district: 'Udupi', upvotes: 39, firstRequestedAt: '6 Dec 2025' },
  { id: 'zr7', placeName: 'Yellapur', district: 'Udupi', upvotes: 12, firstRequestedAt: '14 Dec 2025' },
];

// Peak order hours — Top Performing Stores' own heatmap strip. Aggregated
// by 2-hour band across the store day (8 AM-10 PM, matching PLACEHOLDER_
// STORES' own open/close range), not derived from PLACEHOLDER_ORDERS'
// individual placedAt values — that array only carries a handful of
// timestamped rows, nowhere near enough to say anything about "when" with
// a straight face. Keyed by district so the card's place filter can
// actually change what's shown, not just relabel the same numbers.
export const PLACEHOLDER_HOURLY_ORDER_VOLUME: Record<string, { hourLabel: string; count: number }[]> = {
  Kaup: [
    { hourLabel: '8–10 AM', count: 6 },
    { hourLabel: '10–12 PM', count: 11 },
    { hourLabel: '12–2 PM', count: 22 },
    { hourLabel: '2–4 PM', count: 9 },
    { hourLabel: '4–6 PM', count: 14 },
    { hourLabel: '6–8 PM', count: 27 },
    { hourLabel: '8–10 PM', count: 13 },
  ],
  Malpe: [
    { hourLabel: '8–10 AM', count: 14 },
    { hourLabel: '10–12 PM', count: 19 },
    { hourLabel: '12–2 PM', count: 16 },
    { hourLabel: '2–4 PM', count: 8 },
    { hourLabel: '4–6 PM', count: 12 },
    { hourLabel: '6–8 PM', count: 21 },
    { hourLabel: '8–10 PM', count: 10 },
  ],
  Udupi: [
    { hourLabel: '8–10 AM', count: 5 },
    { hourLabel: '10–12 PM', count: 9 },
    { hourLabel: '12–2 PM', count: 18 },
    { hourLabel: '2–4 PM', count: 11 },
    { hourLabel: '4–6 PM', count: 16 },
    { hourLabel: '6–8 PM', count: 24 },
    { hourLabel: '8–10 PM', count: 17 },
  ],
};

// Bar chart series for the Overview screen's "Orders Statistics" widget —
// two bars per day (orders placed vs. delivered) mirroring the reference's
// shipment/delivery split.
export const PLACEHOLDER_ORDER_STATS = [
  { day: '10', orders: 48, delivered: 34 },
  { day: '11', orders: 62, delivered: 44 },
  { day: '12', orders: 43, delivered: 31 },
  { day: '13', orders: 39, delivered: 28 },
  { day: '14', orders: 21, delivered: 12 },
  { day: '15', orders: 30, delivered: 19 },
  { day: '16', orders: 47, delivered: 36 },
  { day: '17', orders: 29, delivered: 15 },
  { day: '18', orders: 35, delivered: 27 },
  { day: '19', orders: 58, delivered: 41 },
];

// Admin-defined preset list for Product.freshnessTag — a store owner
// picks one of these, they don't type free text, so the customer app's
// ProductCard ribbon (apps/customer/src/screens/home/products/ProductCard.tsx)
// never ends up with a dozen near-duplicate strings across stores. "None"
// isn't a real option here — omit freshnessTag entirely for that.
export const FRESHNESS_TAG_PRESETS = ["Today's Fresh", 'Fresh Catch', 'Farm Fresh', 'Fresh Baked'];

// Inventory itself has no placeholder data anymore — the Inventory screen
// reads real rows from Supabase (lib/supabase/products.ts) and starts
// empty until a founder adds something through the Add product modal.

