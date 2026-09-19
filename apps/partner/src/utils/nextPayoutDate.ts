// Real "when does my money actually arrive" logic — mirrors backend's own
// cron.schedule('0 9 * * 1', { timezone: 'Asia/Kolkata' }) in index.ts
// exactly: payouts release every Monday, 9:00 AM IST. This is a fixed
// weekly cadence, not data that varies per store, so it's computed here
// client-side rather than round-tripping to an endpoint for it.
//
// India Standard Time is a fixed +5:30 offset, no DST — same safe-to-
// hardcode reasoning backend/src/jobs/weeklyPayouts.ts's own IST_OFFSET_MS
// already documents.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const PAYOUT_HOUR_IST = 9;

// The next real Monday-9AM-IST instant strictly after `now` — if `now` IS
// already Monday past 9 AM IST, this correctly rolls to next week rather
// than returning a time already in the past.
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

  // daysUntilMonday is 0 both when today IS Monday and the modulo wraps a
  // full week — the only way to tell "later today" from "a week from now"
  // is checking whether that computed instant already passed.
  if (istPayout <= istNow.getTime()) {
    istPayout += 7 * 24 * 60 * 60 * 1000;
  }

  return new Date(istPayout - IST_OFFSET_MS);
}

export interface PayoutCountdown {
  days: number;
  hours: number;
  minutes: number;
}

export function payoutCountdown(target: Date, now: Date = new Date()): PayoutCountdown {
  const totalMinutes = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 60_000));
  return {
    days: Math.floor(totalMinutes / (24 * 60)),
    hours: Math.floor((totalMinutes % (24 * 60)) / 60),
    minutes: totalMinutes % 60,
  };
}

export function formatPayoutCountdown({ days, hours, minutes }: PayoutCountdown): string {
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// "Mon, 24 Aug" — same real-date formatting weeklyPayouts.ts's own
// week_start/week_end already use, no separate date library.
export function formatPayoutDateLabel(date: Date): string {
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
}
