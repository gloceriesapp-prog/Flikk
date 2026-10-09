// Real payout display shapes — GET /partner/payouts (api/payouts.ts) is
// the only source of every figure here (gross/commission/net), computed
// server-side by jobs/weeklyPayouts.ts from that store's actually
// delivered orders for the week. This file only ever reshapes that real
// response for display (real date labels, a real next-settlement date),
// it never invents or re-derives a payout figure itself.

import { colors } from '../../theme/tokens';
import type { ApiPayout, ApiPayoutOrder, PayoutStatus } from '../../api/payouts';

export type { PayoutStatus };

export interface WeeklyPayout {
  id: string;
  weekLabel: string;
  orderCount: number;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  status: PayoutStatus;
  paidAt: string | null;
  // Bank reference (UTR) the founder recorded when marking this paid —
  // null until paid. Shown with a copy button to match a bank statement.
  utr: string | null;
  paymentNote?: string | null;
  // True only for SAMPLE_PAYOUTS below — never set on anything built from
  // a real GET /partner/payouts row. Every consumer that renders a
  // WeeklyPayout checks this before treating its numbers as real money,
  // so a brand-new store (zero delivered orders, zero real payouts yet)
  // still has something to look at instead of a blank screen, without
  // ever being mistakable for an actual balance.
  isSample?: boolean;
}

// "YYYY-MM-DD" (a plain Postgres `date`, no time/timezone component) is
// parsed as UTC midnight by `new Date(...)` — fine here since this only
// ever feeds a date-only display label, never a real instant comparison.
function formatDateOnly(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function weekLabel(weekStart: string, weekEnd: string): string {
  // week_end is exclusive (weeklyPayouts.ts's own note) — the real last
  // day this settlement covers is the day before it, not week_end itself.
  const lastDay = new Date(`${weekEnd}T00:00:00Z`);
  lastDay.setUTCDate(lastDay.getUTCDate() - 1);
  const endLabel = lastDay.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${formatDateOnly(weekStart)} – ${endLabel}`;
}

export function toWeeklyPayout(row: ApiPayout): WeeklyPayout {
  return {
    id: row.id,
    weekLabel: weekLabel(row.week_start, row.week_end),
    orderCount: row.order_count,
    grossAmount: row.gross_amount,
    commissionAmount: row.commission_deducted,
    netAmount: row.net_payout,
    status: row.status,
    paidAt: row.paidAt ?? row.paid_at,
    utr: row.utr ?? null,
    paymentNote: row.payment_note ?? null,
  };
}

// Sample data — shown only while a store has zero real payouts yet
// (PayoutsScreen's own fallback, gated on the real GET /partner/payouts
// response actually being empty). Dates are computed relative to `now`
// (real weeks-ago math), never hardcoded strings
// like "11–17 Aug" that go stale and eventually read as a real-but-wrong
// date — the whole reason the original placeholder version of this file
// was a problem. The money figures themselves ARE made up (there are no
// real orders yet to sum), which is exactly what `isSample: true` on
// every row exists to flag to the UI.
function sampleWeekLabel(weeksAgo: number, now: Date): string {
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() - weeksAgo * 7);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function buildSamplePayouts(now: Date = new Date()): WeeklyPayout[] {
  return [
    {
      id: 'sample-current',
      weekLabel: sampleWeekLabel(0, now),
      orderCount: 18,
      grossAmount: 2432,
      commissionAmount: 292,
      netAmount: 2140,
      status: 'pending',
      paidAt: null,
      utr: null,
      isSample: true,
    },
    {
      id: 'sample-1',
      weekLabel: sampleWeekLabel(1, now),
      orderCount: 24,
      grossAmount: 3500,
      commissionAmount: 420,
      netAmount: 3080,
      status: 'paid',
      paidAt: null,
      utr: null,
      isSample: true,
    },
    {
      id: 'sample-2',
      weekLabel: sampleWeekLabel(2, now),
      orderCount: 21,
      grossAmount: 2972,
      commissionAmount: 357,
      netAmount: 2615,
      status: 'paid',
      paidAt: null,
      utr: null,
      isSample: true,
    },
    {
      id: 'sample-3',
      weekLabel: sampleWeekLabel(3, now),
      orderCount: 16,
      grossAmount: 2182,
      commissionAmount: 262,
      netAmount: 1920,
      status: 'paid',
      paidAt: null,
      utr: null,
      isSample: true,
    },
  ];
}

// Sample order-by-order breakdown for a SAMPLE payout only (id starting
// "sample-") — PayoutOrderHistoryScreen checks that prefix and renders
// this instead of calling the real GET /partner/payouts/:id/orders, which
// would 404 on a fake id. Splits evenly across a fake order count, same
// spirit as the original placeholder version's own buildOrderLines, kept
// ONLY for this sample path now rather than as the real data source.
export function buildSamplePayoutOrders(totals: { orderCount: number; grossAmount: number; commissionAmount: number }): ApiPayoutOrder[] {
  const { orderCount: count, grossAmount, commissionAmount } = totals;
  const baseGross = Math.floor(grossAmount / count);
  const baseCommission = Math.floor(commissionAmount / count);
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const deliveredAt = new Date(today);
    deliveredAt.setUTCDate(deliveredAt.getUTCDate() - (i % 7));
    const gross = baseGross + (i < grossAmount % count ? 1 : 0);
    const commission = baseCommission + (i < commissionAmount % count ? 1 : 0);
    return {
      orderNumber: `SAMPLE-${1000 + i}`,
      deliveredAt: deliveredAt.toISOString(),
      grossAmount: gross,
      commissionAmount: commission,
      netAmount: gross - commission,
    };
  });
}

export interface PayoutStatusPresentation {
  label: string;
  color: string;
  bgClassName: string;
  // blocked/failed only — what went wrong, shown with an
  // "Update payout details" CTA.
  problem?: string;
}

function formatPaidDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

// One mapping used by both the hero card and every history row. Payouts
// are sent by hand weekly after verification (backend/PAYOUTS.md) —
// 'pending' means waiting to be sent, not stuck.
export function payoutStatusPresentation(payout: Pick<WeeklyPayout, 'status' | 'paidAt'>): PayoutStatusPresentation {
  switch (payout.status) {
    case 'paid':
      return { label: payout.paidAt ? `Paid on ${formatPaidDate(payout.paidAt)}` : 'Paid', color: colors.limeDeep, bgClassName: 'bg-lime-soft' };
    case 'pending':
      return { label: 'Pending (paid weekly)', color: colors.gold, bgClassName: 'bg-gold/15' };
    case 'blocked':
      return { label: 'Action needed', color: colors.danger, bgClassName: 'bg-danger/15', problem: 'We can’t send this payout until you add valid payout details.' };
    case 'failed':
      return { label: 'Payment failed', color: colors.danger, bgClassName: 'bg-danger/15', problem: 'This payout didn’t go through. Check your payout details so we can resend it.' };
  }
}
