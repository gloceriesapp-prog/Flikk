// Platform-wide ordering window, in IST. The hours are admin settings
// (delivery_settings.ordering_opens_minute / ordering_closes_minute,
// migration 112; edited on admin's Settings page) served by GET
// /delivery-settings. The defaults below are those columns' defaults and are
// only used until the settings arrive. The backend and SQL checkout guard
// apply the same window, so this is display only.
//
// Computed in IST regardless of the device's own timezone/locale — a
// customer's phone set to a different timezone (or just wrong) must not
// see a different open/closed state than everyone else ordering from the
// same launch zone. This shifts the current UTC instant by the fixed
// +5:30 IST offset and reads hours/minutes off THAT — no dependency on
// Intl timezone-database support (Hermes doesn't always ship full-icu),
// no reliance on the device's own configured timezone.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export interface OrderingHours {
  // First minute orders are accepted, IST minutes since midnight.
  opensMinute: number;
  // First minute orders are refused again (up to 1440).
  closesMinute: number;
}

export const DEFAULT_ORDERING_HOURS: OrderingHours = { opensMinute: 6 * 60, closesMinute: 22 * 60 + 30 };

export function currentIstMinutesOfDay(now = Date.now()): number {
  const istDate = new Date(now + IST_OFFSET_MS);
  return istDate.getUTCHours() * 60 + istDate.getUTCMinutes();
}

// True outside [opens, closes) — e.g. 10:30 PM through 5:59 AM by default.
export function isOutsideOperatingHours(hours: OrderingHours = DEFAULT_ORDERING_HOURS, now = Date.now()): boolean {
  const minutesOfDay = currentIstMinutesOfDay(now);
  return minutesOfDay >= hours.closesMinute || minutesOfDay < hours.opensMinute;
}

// 360 -> "6:00 AM", 750 -> "12:30 PM". Same format as the backend message.
export function formatIstMinute(minuteOfDay: number): string {
  const m = ((Math.trunc(minuteOfDay) % 1440) + 1440) % 1440;
  const hour = Math.floor(m / 60);
  return `${hour % 12 === 0 ? 12 : hour % 12}:${String(m % 60).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}

// "today" before opening time, "tomorrow" after closing time.
export function reopenDayLabel(hours: OrderingHours = DEFAULT_ORDERING_HOURS, now = Date.now()): 'today' | 'tomorrow' {
  return currentIstMinutesOfDay(now) < hours.opensMinute ? 'today' : 'tomorrow';
}

// Invalid or missing values (an older backend) fall back to the defaults as a pair.
export function orderingHoursFrom(settings: { orderingOpensMinute?: unknown; orderingClosesMinute?: unknown } | null | undefined): OrderingHours {
  const opens = Number(settings?.orderingOpensMinute);
  const closes = Number(settings?.orderingClosesMinute);
  if (settings?.orderingOpensMinute == null || settings?.orderingClosesMinute == null
    || !Number.isInteger(opens) || !Number.isInteger(closes) || opens < 0 || closes > 1440 || opens >= closes) return DEFAULT_ORDERING_HOURS;
  return { opensMinute: opens, closesMinute: closes };
}
