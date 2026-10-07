// Platform-wide ordering window (delivery_settings.ordering_opens_minute /
// ordering_closes_minute, migration 112), in IST minutes since midnight.
// Pure (no database client) so checkout, the settings reader and tests share
// one rule. SQL checkout_assert_store applies the same window.

export interface OrderingHours {
  // First minute orders are accepted (0..1439).
  opensMinute: number;
  // First minute orders are refused again (opensMinute+1..1440).
  closesMinute: number;
}

// Migration 112's column defaults: 6:00 AM to 10:30 PM IST.
export const PLATFORM_OPEN_MINUTE = 6 * 60;
export const PLATFORM_CLOSE_MINUTE = 22 * 60 + 30;
export const DEFAULT_ORDERING_HOURS: OrderingHours = { opensMinute: PLATFORM_OPEN_MINUTE, closesMinute: PLATFORM_CLOSE_MINUTE };

export function istMinutes(date = new Date()): number {
  const shifted = new Date(date.getTime() + 330 * 60_000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

export function platformIsOpen(date = new Date(), hours: OrderingHours = DEFAULT_ORDERING_HOURS): boolean {
  const minute = istMinutes(date);
  return minute >= hours.opensMinute && minute < hours.closesMinute;
}

// A row with missing or inconsistent values falls back to the defaults as a
// pair, never half-configured (the database CHECKs make this unreachable).
export function parseOrderingHours(opens: unknown, closes: unknown): OrderingHours {
  const o = Number(opens);
  const c = Number(closes);
  if (opens == null || closes == null || !Number.isInteger(o) || !Number.isInteger(c) || o < 0 || c > 1440 || o >= c) {
    return DEFAULT_ORDERING_HOURS;
  }
  return { opensMinute: o, closesMinute: c };
}

// 360 -> "6:00 AM", 1350 -> "10:30 PM", 0 and 1440 -> "12:00 AM". Matches
// the SQL message in checkout_assert_store.
export function formatIstMinute(minuteOfDay: number): string {
  const m = ((Math.trunc(minuteOfDay) % 1440) + 1440) % 1440;
  const hour = Math.floor(m / 60);
  const minute = m % 60;
  return `${hour % 12 === 0 ? 12 : hour % 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}
