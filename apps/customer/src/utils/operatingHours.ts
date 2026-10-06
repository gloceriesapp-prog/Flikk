// Platform-wide ordering window — 10:30 PM to 6:00 AM IST, every day, closed.
// Single-zone MVP (CLAUDE.md) with one operating window for the whole app,
// not per-store — this is deliberately simpler than stores.open_time/
// close_time (which is a real per-store toggle an owner controls). If a
// founder ever needs to change these hours without a code deploy, that's
// the moment to move this to a zones table column and read it from the
// backend instead; hardcoded constants are the right amount of engineering
// for "one fixed nightly window" today.
//
// Computed in IST regardless of the device's own timezone/locale — a
// customer's phone set to a different timezone (or just wrong) must not
// see a different open/closed state than everyone else ordering from the
// same launch zone. This shifts the current UTC instant by the fixed
// +5:30 IST offset and reads hours/minutes off THAT — no dependency on
// Intl timezone-database support (Hermes doesn't always ship full-icu),
// no reliance on the device's own configured timezone.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const CLOSE_MINUTES_OF_DAY = 22 * 60 + 30; // 10:30 PM IST
const OPEN_MINUTES_OF_DAY = 6 * 60; // 6:00 AM IST

function currentIstMinutesOfDay(): number {
  const istDate = new Date(Date.now() + IST_OFFSET_MS);
  return istDate.getUTCHours() * 60 + istDate.getUTCMinutes();
}

// True from 10:30 PM through 5:59 AM IST — the window wraps past midnight,
// so this is "at or after close" OR "before open", not a simple range.
export function isOutsideOperatingHours(): boolean {
  const minutesOfDay = currentIstMinutesOfDay();
  return minutesOfDay >= CLOSE_MINUTES_OF_DAY || minutesOfDay < OPEN_MINUTES_OF_DAY;
}

export const REOPEN_TIME_LABEL = '6:00 AM';
