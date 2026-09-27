// Rider weekly-availability "is now inside a window" check — the read-only
// half of the rules the rider app configures and the backend enforces.
//
// Intentionally duplicated from backend/src/lib/riderSchedule.ts (this admin
// Next.js app and the Express backend aren't set up to share code — no
// packages/shared yet, per CLAUDE.md's "no premature sharing" rule; same
// pattern as lib/notification.ts mirroring backend/src/lib/notifications.ts).
// This is the SAME logic as the backend/rider copies — keep it identical in
// behavior. Only isWithinSchedule is copied here (admin reads availability,
// never validates/writes it, so validateAvailability isn't needed).
//
// IST-wall-clock-stored / UTC-DB reasoning: a rider types "I work 09:00-18:00"
// meaning IST wall-clock, but the DB deals in UTC instants. We store the bare
// 'HH:MM' IST string and compare it against `now` RE-FORMATTED into IST via
// Intl.DateTimeFormat (timeZone:'Asia/Kolkata', a fixed +5:30, no DST) — no
// hand-rolled offset arithmetic. v1 has no overnight windows (end > start).

export type DaySchedule = { day: number; enabled: boolean; start: string; end: string };

// True iff `now`, viewed in IST, falls on an enabled DaySchedule whose
// [start, end) half-open window contains the current IST HH:MM. '[]' (never
// configured) or a disabled/out-of-window day -> false.
export function isWithinSchedule(availability: DaySchedule[], now: Date = new Date(), tz = 'Asia/Kolkata'): boolean {
  if (!Array.isArray(availability) || availability.length === 0) return false;

  // Weekday index in tz: 'short' weekday -> 0..6 (Sun..Sat) matching entry.day.
  const weekdayIdx: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekdayStr = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: tz }).format(now);
  const day = weekdayIdx[weekdayStr];
  if (day === undefined) return false;

  const today = availability.find((d) => d.day === day);
  if (!today || !today.enabled) return false;

  // 'HH:MM' in tz. hour12:false yields '24:MM' at midnight in some engines —
  // normalize that to '00:MM' so string compare against a 00:00 start works.
  const hhmm = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })
    .format(now)
    .replace(/^24:/, '00:');

  // Lexical compare is correct for fixed-width zero-padded 'HH:MM'.
  return hhmm >= today.start && hhmm < today.end;
}
