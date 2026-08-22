// Placeholder data — same convention as PLACEHOLDER_ORDERS/PLACEHOLDER_PRODUCTS
// in apps/customer and apps/partner: every screen here is built against a
// real, believable shape from day one, so wiring the actual /admin/*
// endpoints later (specs/04-admin-dashboard/api.md) is a data-source swap,
// not a redesign. Single zone throughout (Kaup/outer Udupi) — CLAUDE.md.

import type { ActiveRider, Application, Order, Payout, RevenuePoint, Store, SystemStatus, WalletBalance, Zone } from './types';

export const ZONE_NAME = 'Kaup, Udupi';

export const PLACEHOLDER_SYSTEM_STATUS: SystemStatus = {
  health: 'operational',
  message: 'All systems live',
  lastUpdatedAt: '2 minutes ago',
};

export const PLACEHOLDER_WALLET: WalletBalance = {
  availableToWithdraw: 42890,
  lastWithdrawnAmount: 30828,
  lastWithdrawnAt: '8 Dec 2025',
  pendingSettlement: 6218,
  pendingSettlementNote: 'Clears in 2 days',
  bankName: 'HDFC Bank',
  bankAccountLast4: '4521',
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
    gstNumber: '29ABCDE1234F1Z5',
    district: 'Udupi',
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
    gstNumber: undefined,
    district: 'Udupi',
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
  },
];

export const PLACEHOLDER_ACTIVE_RIDERS: ActiveRider[] = [
  { id: 'r1', name: 'Adam Schleifer', phone: '+91 99001 12233', activeOrders: 2, zone: ZONE_NAME, isOnline: true },
  { id: 'r2', name: 'Naveen Shetty', phone: '+91 98802 44556', activeOrders: 1, zone: ZONE_NAME, isOnline: true },
  { id: 'r3', name: 'Rakesh Poojary', phone: '+91 97406 77889', activeOrders: 1, zone: ZONE_NAME, isOnline: false },
];

export const PLACEHOLDER_STORES: Store[] = [
  { id: 's1', name: 'Ganesh Kirana Store', category: 'Kirana & Grocery', zone: ZONE_NAME, district: 'Udupi', phone: '+91 98765 43210', openTime: '8:00 AM', closeTime: '9:00 PM', isActive: true, ownerName: 'Ganesh Rao', joinedAt: '12 Nov 2025' },
  { id: 's2', name: 'Shree Pharmacy', category: 'Pharmacy', zone: ZONE_NAME, district: 'Udupi', phone: '+91 98456 12309', openTime: '7:30 AM', closeTime: '10:00 PM', isActive: true, ownerName: 'Shreesha Bhat', joinedAt: '18 Nov 2025' },
  { id: 's3', name: 'Malpe Fresh Mart', category: 'Fruits & Vegetables', zone: ZONE_NAME, district: 'Udupi', phone: '+91 99800 45671', openTime: '6:00 AM', closeTime: '8:30 PM', isActive: true, ownerName: 'Vinod Kamath', joinedAt: '2 Dec 2025' },
  { id: 's4', name: 'Kaup General Store', category: 'General Store', zone: ZONE_NAME, district: 'Udupi', phone: '+91 97401 22334', openTime: '9:00 AM', closeTime: '9:00 PM', isActive: true, ownerName: 'Prakash Shetty', joinedAt: '9 Dec 2025' },
  { id: 's5', name: 'Udupi Daily Needs', category: 'Kirana & Grocery', zone: ZONE_NAME, district: 'Udupi', phone: '+91 96117 88123', openTime: '7:00 AM', closeTime: '9:30 PM', isActive: false, ownerName: 'Ramesh Pai', joinedAt: '15 Dec 2025' },
];

export const PLACEHOLDER_PAYOUTS: Payout[] = [
  { id: 'p1', storeName: 'Ganesh Kirana Store', cycleLabel: 'Week of 15 Dec', grossSales: 18420, commissionRate: 0.15, netPayout: 15657, status: 'pending', paidAt: null },
  { id: 'p2', storeName: 'Shree Pharmacy', cycleLabel: 'Week of 15 Dec', grossSales: 9260, commissionRate: 0.12, netPayout: 8149, status: 'pending', paidAt: null },
  { id: 'p3', storeName: 'Malpe Fresh Mart', cycleLabel: 'Week of 8 Dec', grossSales: 21030, commissionRate: 0.18, netPayout: 17245, status: 'paid', paidAt: '9 Dec 2025' },
  { id: 'p4', storeName: 'Ganesh Kirana Store', cycleLabel: 'Week of 8 Dec', grossSales: 15980, commissionRate: 0.15, netPayout: 13583, status: 'paid', paidAt: '9 Dec 2025' },
  { id: 'p5', storeName: 'Kaup General Store', cycleLabel: 'Week of 1 Dec', grossSales: 11200, commissionRate: 0.15, netPayout: 9520, status: 'paid', paidAt: '2 Dec 2025' },
];

export const PLACEHOLDER_ZONES: Zone[] = [
  { id: 'z1', name: 'Kaup, Udupi', isActive: true, storeCount: PLACEHOLDER_STORES.length, riderCount: PLACEHOLDER_ACTIVE_RIDERS.length },
  { id: 'z2', name: 'Karkala', isActive: false, storeCount: 0, riderCount: 0 },
  { id: 'z3', name: 'Kundapura', isActive: false, storeCount: 0, riderCount: 0 },
];

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

// Revenue tab's own trend — total commission earned per week, distinct
// from Payouts' per-store breakdown of that same money.
export const PLACEHOLDER_REVENUE_TREND: RevenuePoint[] = [
  { label: 'Wk 24 Nov', commission: 6840 },
  { label: 'Wk 1 Dec', commission: 8120 },
  { label: 'Wk 8 Dec', commission: 30828 },
  { label: 'Wk 15 Dec', commission: 23806 },
];
