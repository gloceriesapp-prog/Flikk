import type { Payout } from './partnerApi';

// DEMO DATA — same isDemo convention as Overview/Orders/Inventory: shown
// only while this store's real payout history is empty, so Payouts is
// never a blank page during setup. Weekly rows walking backward from the
// most recent Monday, matching the real weekly-release cadence
// (backend/migrations/012_weekly_payout_release.sql) — gone the instant
// one real payout row exists.
function mondayOf(weeksAgo: number): Date {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday - weeksAgo * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function weekRange(weeksAgo: number): { start: string; end: string } {
  const start = mondayOf(weeksAgo);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: start.toISOString(), end: end.toISOString() };
}

function payout(
  weeksAgo: number,
  gross: number,
  status: Payout['status'],
  paidDaysAfterWeekEnd: number | null,
): Payout {
  const { start, end } = weekRange(weeksAgo);
  const commission = Math.round(gross * 0.1);
  const paidAt =
    paidDaysAfterWeekEnd != null ? new Date(new Date(end).getTime() + paidDaysAfterWeekEnd * 86400000).toISOString() : null;
  return {
    id: `demo-payout-${weeksAgo}`,
    store_id: 'demo-store',
    week_start: start,
    week_end: end,
    gross_amount: gross,
    commission_deducted: commission,
    net_payout: gross - commission,
    status,
    paid_at: paidAt,
  };
}

export const DEMO_PAYOUTS: Payout[] = [
  payout(0, 3420, 'processing', null),
  payout(1, 5180, 'paid', 2),
  payout(2, 4760, 'paid', 2),
  payout(3, 2950, 'paid', 3),
  payout(4, 3860, 'failed', null),
  payout(5, 4310, 'paid', 2),
];
