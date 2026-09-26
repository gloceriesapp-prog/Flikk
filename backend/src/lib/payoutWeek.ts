// Settlement-week math, shared by the store payout job (weeklyPayouts.ts)
// and the rider payout job (weeklyRiderPayouts.ts) — extracted so both agree
// on exactly what "the week that just ended" means. Was previously private to
// weeklyPayouts.ts; the rider job needs the identical IST-anchored window, so
// it lives here rather than being duplicated or cross-imported job-to-job.

// India Standard Time is a fixed +5:30 offset, no DST — safe to hardcode.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export interface WeekRange {
  // Real UTC instants — the actual boundaries to query timestamptz
  // columns (delivered_at) against.
  start: Date;
  end: Date;
  // IST calendar dates, "YYYY-MM-DD" — what the payout tables'
  // week_start/week_end (plain `date` columns) actually store. NOT derived
  // from start/end's own .toISOString() — that reads the UTC calendar date,
  // which can land on the wrong day relative to IST near midnight.
  startDate: string;
  endDate: string;
}

// The week that just ended relative to "now" — always IST Monday 00:00 to
// the following IST Monday 00:00 (exclusive). Computed entirely in IST,
// not the server's own system timezone: this app is single-zone,
// India-only (CLAUDE.md), so "the week" always means the India calendar
// week regardless of what timezone the backend happens to be deployed in
// (Railway/Render default to UTC). Using local Date methods here was the
// actual bug this replaced — caught by weeklyPayouts.test.ts failing
// under a non-IST system timezone.
export function previousWeekRange(now: Date): WeekRange {
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const daysSinceMonday = (istNow.getUTCDay() + 6) % 7; // Monday itself -> 0

  const istThisMonday = Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() - daysSinceMonday);
  const istStart = istThisMonday - 7 * 24 * 60 * 60 * 1000;
  const istEnd = istThisMonday;

  return {
    start: new Date(istStart - IST_OFFSET_MS),
    end: new Date(istEnd - IST_OFFSET_MS),
    startDate: new Date(istStart).toISOString().slice(0, 10),
    endDate: new Date(istEnd).toISOString().slice(0, 10),
  };
}
