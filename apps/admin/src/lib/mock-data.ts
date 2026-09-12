// Placeholder data — same convention as PLACEHOLDER_ORDERS/PLACEHOLDER_PRODUCTS
// in apps/customer and apps/partner: every screen here is built against a
// real, believable shape from day one, so wiring the actual /admin/*
// endpoints later (specs/04-admin-dashboard/api.md) is a data-source swap,
// not a redesign. Single zone throughout (Kaup/outer Udupi) — CLAUDE.md.

import type {
  ActiveRider,
  AppDownloadStats,
  Application,
  Order,
  Payout,
  ProductPerformance,
  RevenuePoint,
  Store,
  WalletBalance,
  Zone,
  ZoneRequest,
} from './types';

export const ZONE_NAME = 'Kaup, Udupi';

export const PLACEHOLDER_APP_DOWNLOADS: AppDownloadStats = {
  android: 812,
  ios: 341,
  changePctThisWeek: 6.4,
  lastSyncedAt: '12 minutes ago',
  androidStatus: { health: 'issue', message: 'Crash reported on checkout screen — Android 13 devices' },
  iosStatus: { health: 'operational', message: 'No issues reported' },
};

export const PLACEHOLDER_WALLET: WalletBalance = {
  availableToWithdraw: 42890,
  lastWithdrawnAmount: 30828,
  lastWithdrawnAt: '8 Dec 2025',
  pendingSettlement: 6218,
  pendingSettlementNote: 'Clears in 2 days',
  bankName: 'HDFC Bank',
  bankAccountLast4: '4521',
  grossCollected: 312600,
  owedToStores: 263492,
};

export const PLACEHOLDER_ORDERS: Order[] = [
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

// Onboarding-document fields (addressLine..drugLicenseNumber) are only
// real on actual DB rows created via AddStoreModal now — this array feeds
// other still-mocked widgets (TopStoresCard, StorePerformanceList, revenue/
// zones placeholders), not the real Stores page (stores/page.tsx reads
// lib/supabase/stores.ts instead), so these are filled with plausible
// values just to satisfy Store's type, not real documents.
const MOCK_DOC_FIELDS = {
  addressLine: 'Main Road',
  city: 'Kaup',
  state: 'Karnataka',
  country: 'India',
  fssaiNumber: '21425000000000',
  shopEstablishmentNumber: 'SE-0000',
  panNumber: 'AAAPZ0000A',
  aadhaarLast4: '0000',
  bankName: 'HDFC Bank',
  bankAccountLast4: '0000',
  turnoverExceedsGstThreshold: false,
};

export const PLACEHOLDER_STORES: Store[] = [
  { id: 's1', name: 'Ganesh Kirana Store', category: 'Kirana & Grocery', zone: ZONE_NAME, district: 'Kaup', phone: '+91 98765 43210', openTime: '8:00 AM', closeTime: '9:00 PM', isActive: true, ownerName: 'Ganesh Rao', joinedAt: '12 Nov 2025', ...MOCK_DOC_FIELDS },
  { id: 's2', name: 'Shree Pharmacy', category: 'Pharmacy', zone: ZONE_NAME, district: 'Udupi', phone: '+91 98456 12309', openTime: '7:30 AM', closeTime: '10:00 PM', isActive: true, ownerName: 'Shreesha Bhat', joinedAt: '18 Nov 2025', ...MOCK_DOC_FIELDS, drugLicenseNumber: 'DL-0000' },
  { id: 's3', name: 'Malpe Fresh Mart', category: 'Fruits & Vegetables', zone: ZONE_NAME, district: 'Malpe', phone: '+91 99800 45671', openTime: '6:00 AM', closeTime: '8:30 PM', isActive: true, ownerName: 'Vinod Kamath', joinedAt: '2 Dec 2025', ...MOCK_DOC_FIELDS },
  { id: 's4', name: 'Kaup General Store', category: 'General Store', zone: ZONE_NAME, district: 'Kaup', phone: '+91 97401 22334', openTime: '9:00 AM', closeTime: '9:00 PM', isActive: true, ownerName: 'Prakash Shetty', joinedAt: '9 Dec 2025', ...MOCK_DOC_FIELDS },
  { id: 's5', name: 'Udupi Daily Needs', category: 'Kirana & Grocery', zone: ZONE_NAME, district: 'Udupi', phone: '+91 96117 88123', openTime: '7:00 AM', closeTime: '9:30 PM', isActive: false, ownerName: 'Ramesh Pai', joinedAt: '15 Dec 2025', ...MOCK_DOC_FIELDS },
];

export const PLACEHOLDER_PAYOUTS: Payout[] = [
  { id: 'p1', storeName: 'Ganesh Kirana Store', cycleLabel: 'Week of 15 Dec', grossSales: 18420, commissionRate: 0.15, netPayout: 15657, status: 'pending', paidAt: null, bankName: 'HDFC Bank', bankAccountLast4: '2210' },
  { id: 'p2', storeName: 'Shree Pharmacy', cycleLabel: 'Week of 15 Dec', grossSales: 9260, commissionRate: 0.12, netPayout: 8149, status: 'pending', paidAt: null, bankName: 'Canara Bank', bankAccountLast4: '7734' },
  { id: 'p3', storeName: 'Malpe Fresh Mart', cycleLabel: 'Week of 8 Dec', grossSales: 21030, commissionRate: 0.18, netPayout: 17245, status: 'paid', paidAt: '9 Dec 2025', bankName: 'SBI', bankAccountLast4: '5561' },
  { id: 'p4', storeName: 'Ganesh Kirana Store', cycleLabel: 'Week of 8 Dec', grossSales: 15980, commissionRate: 0.15, netPayout: 13583, status: 'paid', paidAt: '9 Dec 2025', bankName: 'HDFC Bank', bankAccountLast4: '2210' },
  { id: 'p5', storeName: 'Kaup General Store', cycleLabel: 'Week of 1 Dec', grossSales: 11200, commissionRate: 0.15, netPayout: 9520, status: 'paid', paidAt: '2 Dec 2025', bankName: 'Axis Bank', bankAccountLast4: '9042' },
];

// Per-order commission — Order itself carries no commission field (PRD's
// order_items schema doesn't either), so it's derived here from each
// store's own rate on PLACEHOLDER_PAYOUTS, same 12-18% range as Payout's
// own commissionRate (PRD Section 22). Falls back to a 15% platform
// average for a store with no payout cycle yet.
const DEFAULT_COMMISSION_RATE = 0.15;

export const STORE_COMMISSION_RATE: Record<string, number> = PLACEHOLDER_PAYOUTS.reduce<Record<string, number>>(
  (acc, payout) => {
    if (!(payout.storeName in acc)) acc[payout.storeName] = payout.commissionRate;
    return acc;
  },
  {},
);

export function commissionForOrder(order: Order): number {
  const rate = STORE_COMMISSION_RATE[order.storeName] ?? DEFAULT_COMMISSION_RATE;
  return Math.round(order.amount * rate);
}

// No payment-gateway payout automation exists yet (Razorpay payout API is
// a later integration) — every settlement is founder-triggered today.
// SETTLEMENT_CADENCE_LABEL is just the expected rhythm, not a cron; the
// Transactions tab's "Release" button is the real mechanism until
// automation ships.
export const SETTLEMENT_CADENCE_LABEL = 'Weekly · every Monday';
export const AUTO_RELEASE_ENABLED = false;

export const PLACEHOLDER_ZONES: Zone[] = [
  { id: 'z1', name: 'Kaup, Udupi', isActive: true, storeCount: PLACEHOLDER_STORES.length, riderCount: PLACEHOLDER_ACTIVE_RIDERS.length },
  { id: 'z2', name: 'Karkala', isActive: false, storeCount: 0, riderCount: 0 },
  { id: 'z3', name: 'Kundapura', isActive: false, storeCount: 0, riderCount: 0 },
];

// Each store's share of the active zone's delivered revenue — sums to
// 100% by construction (every store's slice of the same total), not
// picked independently per store. A store with zero delivered orders
// still gets a 0% row rather than being dropped, so the zone's own store
// count and this breakdown's row count always agree.
export interface StoreRevenueShare {
  storeId: string;
  storeName: string;
  category: string;
  revenue: number;
  sharePct: number;
}

export function storeRevenueShares(zoneName: string): StoreRevenueShare[] {
  const storesInZone = PLACEHOLDER_STORES.filter((s) => s.zone === zoneName);
  const revenueByStore = new Map<string, number>();
  for (const order of PLACEHOLDER_ORDERS) {
    if (order.status !== 'delivered') continue;
    revenueByStore.set(order.storeId, (revenueByStore.get(order.storeId) ?? 0) + order.amount);
  }
  const zoneTotal = storesInZone.reduce((sum, s) => sum + (revenueByStore.get(s.id) ?? 0), 0);

  return storesInZone
    .map((s) => {
      const revenue = revenueByStore.get(s.id) ?? 0;
      return {
        storeId: s.id,
        storeName: s.name,
        category: s.category,
        revenue,
        sharePct: zoneTotal > 0 ? Math.round((revenue / zoneTotal) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

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

// Revenue tab's own trend — total commission earned per week, distinct
// from Payouts' per-store breakdown of that same money.
export const PLACEHOLDER_REVENUE_TREND: RevenuePoint[] = [
  { label: 'Wk 24 Nov', commission: 6840 },
  { label: 'Wk 1 Dec', commission: 8120 },
  { label: 'Wk 8 Dec', commission: 30828 },
  { label: 'Wk 15 Dec', commission: 23806 },
];
