// Real day-boundary math for TodayStatsCard's own auto-refresh — a
// store owner who leaves the Orders screen open across midnight (IST)
// should see "Orders today"/"Today's earning"/"Pending" reset to the new
// day on their own, not keep showing yesterday's numbers until the next
// manual reload. Same fixed +5:30 offset (no DST) reasoning every other
// IST calendar-day computation in this app already uses (backend's own
// jobs/weeklyPayouts.ts, routes/partner.ts's todayIstRange).
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function msUntilNextIstMidnight(now: Date = new Date()): number {
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const istNextMidnight = Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() + 1);
  const nextMidnightUtc = istNextMidnight - IST_OFFSET_MS;
  return nextMidnightUtc - now.getTime();
}
