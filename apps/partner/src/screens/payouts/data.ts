// Placeholder payouts (P5) — same no-auth caveat as ../orders/data.ts.
// Purely a display shape for `payouts` (specs/00-foundation/data-model.md);
// per specs/02-partner-app/screens.md this screen must never compute a
// payout figure itself — every number here (including the gross/commission
// split and the per-order lines) stands in for a server-computed value the
// real `GET /partner/payouts` would return, mirroring that table's own
// `gross_amount` / `commission_deducted` / `net_payout` columns so a real
// fetch is a data swap, not a shape change.

export type PayoutStatus = 'pending' | 'paid';

// One order's contribution to a settlement — what a shop owner checks a
// weekly total against order by order, the same way they'd check a bank
// statement line by line. `amount` is that order's net contribution
// (after commission), so the full list always sums to exactly
// `WeeklyPayout.netAmount` — the whole point is that the total is provably
// built from real orders, not a number to take on faith.
export interface PayoutOrderLine {
  orderId: string;
  dayLabel: string;
  amount: number;
}

export interface WeeklyPayout {
  weekLabel: string;
  orderCount: number;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  status: PayoutStatus;
  // Only the current (pending) week has one — a paid week has nothing left
  // to settle.
  nextSettlementLabel?: string;
  orders: PayoutOrderLine[];
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Splits netAmount evenly across orderCount lines, remainder distributed to
// the first few so the sum is always exact — real per-order amounts once
// `GET /partner/payouts` exists, this just needs to add up correctly.
function buildOrderLines(startId: number, orderCount: number, netAmount: number): PayoutOrderLine[] {
  const base = Math.floor(netAmount / orderCount);
  const remainder = netAmount - base * orderCount;
  return Array.from({ length: orderCount }, (_, i) => ({
    orderId: `#OD${startId - i}`,
    dayLabel: WEEKDAY_LABELS[i % 7],
    amount: base + (i < remainder ? 1 : 0),
  }));
}

export const PLACEHOLDER_PAYOUTS: WeeklyPayout[] = [
  {
    weekLabel: 'This week (11–17 Aug)',
    orderCount: 18,
    grossAmount: 2432,
    commissionAmount: 292,
    netAmount: 2140,
    status: 'pending',
    nextSettlementLabel: 'Mon, 18 Aug',
    orders: buildOrderLines(48213, 18, 2140),
  },
  {
    weekLabel: '4–10 Aug',
    orderCount: 24,
    grossAmount: 3500,
    commissionAmount: 420,
    netAmount: 3080,
    status: 'paid',
    orders: buildOrderLines(48185, 24, 3080),
  },
  {
    weekLabel: '28 Jul–3 Aug',
    orderCount: 21,
    grossAmount: 2972,
    commissionAmount: 357,
    netAmount: 2615,
    status: 'paid',
    orders: buildOrderLines(48151, 21, 2615),
  },
  {
    weekLabel: '21–27 Jul',
    orderCount: 16,
    grossAmount: 2182,
    commissionAmount: 262,
    netAmount: 1920,
    status: 'paid',
    orders: buildOrderLines(48120, 16, 1920),
  },
];
