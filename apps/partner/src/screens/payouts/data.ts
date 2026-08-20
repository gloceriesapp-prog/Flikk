// Placeholder payouts (P5) — same no-auth caveat as ../orders/data.ts.
// Purely a display shape for `payouts` (specs/00-foundation/data-model.md);
// per specs/02-partner-app/screens.md this screen must never compute a
// payout figure itself — every number here stands in for a server-computed
// value the real `GET /partner/payouts` would return.

export type PayoutStatus = 'pending' | 'paid';

export interface WeeklyPayout {
  weekLabel: string;
  orderCount: number;
  amount: number;
  status: PayoutStatus;
}

export const PLACEHOLDER_PAYOUTS: WeeklyPayout[] = [
  { weekLabel: 'This week (11–17 Aug)', orderCount: 18, amount: 2140, status: 'pending' },
  { weekLabel: '4–10 Aug', orderCount: 24, amount: 3080, status: 'paid' },
  { weekLabel: '28 Jul–3 Aug', orderCount: 21, amount: 2615, status: 'paid' },
  { weekLabel: '21–27 Jul', orderCount: 16, amount: 1920, status: 'paid' },
];
