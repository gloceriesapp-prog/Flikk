// Real payout display shapes — GET /partner/payouts (api/payouts.ts) is
// the only source of every figure here (gross/commission/net), computed
// server-side by jobs/weeklyPayouts.ts from that store's actually
// delivered orders for the week. This file only ever reshapes that real
// response for display (real date labels, a real next-settlement date),
// it never invents or re-derives a payout figure itself.

import { colors } from '../../theme/tokens';
import type { ApiPayout, PayoutStatus } from '../../api/payouts';

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
