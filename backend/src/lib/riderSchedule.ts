// Rider weekly-availability rules — the pure logic behind GET/PATCH
// /rider/availability (routes/rider.ts) and migration 055's `availability`
// JSONB column. No DB imports on purpose: validation + the "is now inside a
// window" check are trivially unit-testable this way (see the sibling
// riderSchedule.selfcheck.ts, run with `npx tsx`).
//
// IST-wall-clock-stored / UTC-DB reasoning: a rider types "I work 09:00-18:00"
// meaning IST wall-clock, but Postgres/`Date` deal in UTC instants. Rather than
// store an offset-baked timestamp, we store the bare 'HH:MM' IST string and
// compare it against `now` RE-FORMATTED into IST. Intl.DateTimeFormat with timeZone:'Asia/Kolkata'
// does the offset (a fixed +5:30, no DST) correctly for us, so there's no
// hand-rolled offset arithmetic here.
//
// v1 limitation: no overnight windows — end must be strictly after start, so a
// window like 22:00-02:00 is rejected rather than silently mis-handled.
// ponytail: single same-day [start,end) window per weekday. If riders ever need
// split shifts or past-midnight windows, make each day's schedule an array of
// windows and treat an end<=start entry as wrapping into the next day — both
// here (isWithinSchedule) and in validateAvailability.

export type DaySchedule = { day: number; enabled: boolean; start: string; end: string };

// 'HH:MM' 24-hour, 00:00..23:59.
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// Throws Error (clear message) on any malformed input; returns the normalized
// array sorted ascending by day on success. Rules: exactly 7 entries covering
// days 0..6 once each; for an ENABLED day, start/end must both match HHMM and
// end > start. A DISABLED day may keep placeholder times — its strings are only
// format-checked when non-empty, and '' is allowed (start/end are meaningless
// while disabled).
export function validateAvailability(input: unknown): DaySchedule[] {
  if (!Array.isArray(input)) throw new Error('availability must be an array');
  if (input.length !== 7) throw new Error(`availability must have exactly 7 entries (got ${input.length})`);

  const seen = new Set<number>();
  const normalized: DaySchedule[] = [];

  for (const raw of input) {
    if (typeof raw !== 'object' || raw === null) throw new Error('each availability entry must be an object');
    const { day, enabled, start, end } = raw as Record<string, unknown>;

    if (typeof day !== 'number' || !Number.isInteger(day) || day < 0 || day > 6) {
      throw new Error('each entry.day must be an integer 0..6');
    }
    if (seen.has(day)) throw new Error(`duplicate day ${day} — days 0..6 must each appear exactly once`);
    seen.add(day);

    if (typeof enabled !== 'boolean') throw new Error(`entry.enabled for day ${day} must be a boolean`);
    if (typeof start !== 'string' || typeof end !== 'string') {
      throw new Error(`entry.start and entry.end for day ${day} must be strings`);
    }

    if (enabled) {
      if (!HHMM.test(start)) throw new Error(`day ${day} start "${start}" must be HH:MM 24-hour`);
      if (!HHMM.test(end)) throw new Error(`day ${day} end "${end}" must be HH:MM 24-hour`);
      if (end <= start) throw new Error(`day ${day} end "${end}" must be after start "${start}" (no overnight windows in v1)`);
    } else {
      // Disabled: allow '' placeholder, but reject a garbage non-empty string.
      if (start !== '' && !HHMM.test(start)) throw new Error(`day ${day} start "${start}" must be HH:MM 24-hour or empty`);
      if (end !== '' && !HHMM.test(end)) throw new Error(`day ${day} end "${end}" must be HH:MM 24-hour or empty`);
    }

    normalized.push({ day, enabled, start, end });
  }

  // seen has 7 unique values in 0..6 (length===7 + range-checked + dedup'd), so
  // it's guaranteed to be exactly {0..6}; sort to the ascending contract shape.
  return normalized.sort((a, b) => a.day - b.day);
}

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
