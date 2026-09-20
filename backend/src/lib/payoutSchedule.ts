// Real "when does this money actually arrive" schedule — mirrors
// apps/partner's own utils/nextPayoutDate.ts exactly (same fixed Monday
// 9:00 AM IST cadence jobs/weeklyPayouts.ts's own cron.schedule runs on,
// see index.ts). Kept as its own small lib, not folded into
// weeklyPayouts.ts, because this is describing the schedule in human
// terms for a notification — routes/orders.ts's own delivered-transition
// push needs a real date to tell a store owner, not just "next Monday".
//
// India Standard Time is a fixed +5:30 offset, no DST — safe to hardcode.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const PAYOUT_HOUR_IST = 9;

// The next real Monday-9AM-IST instant strictly after `now`.
export function nextPayoutDate(now: Date = new Date()): Date {
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const daysUntilMonday = (8 - istNow.getUTCDay()) % 7; // Sunday=0..Saturday=6; Monday itself -> 0

  let istPayout = Date.UTC(
    istNow.getUTCFullYear(),
    istNow.getUTCMonth(),
    istNow.getUTCDate() + daysUntilMonday,
    PAYOUT_HOUR_IST,
    0,
    0,
  );

  if (istPayout <= istNow.getTime()) {
    istPayout += 7 * 24 * 60 * 60 * 1000;
  }

  return new Date(istPayout - IST_OFFSET_MS);
}

// "Mon, 24 Aug" — same real-date formatting weeklyPayouts.ts's own
// week_start/week_end already use.
export function formatPayoutDateLabel(date: Date): string {
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
}
