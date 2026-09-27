// Pure client copy of the "is the rider inside a working-hours window right
// now" check. Intentionally DUPLICATED from backend/src/lib/riderSchedule.ts
// (the backend owns the same DaySchedule contract and the authoritative
// auto-dispatch gating) — there is no packages/shared to share it through yet
// (CLAUDE.md's own no-monorepo-tooling rule), and one small pure function is
// well under the threshold where a shared package earns its keep. Keep the two
// copies in sync by hand until that package exists.
//
// IST-anchored on purpose: a schedule is "Mon 09:00–18:00" in the rider's own
// local time regardless of the device timezone, so weekday + HH:MM are both
// derived from Asia/Kolkata via Intl.DateTimeFormat, never from the raw Date's
// local getters. Half-open window [start, end): 18:00 is already outside an
// …–18:00 shift, matching how a closing time reads.

import type { DaySchedule } from '../api/availability';

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

// 'HH:MM' → minutes since midnight, for a plain numeric [start, end) compare.
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
}

export function isWithinSchedule(availability: DaySchedule[], now: Date = new Date(), tz = 'Asia/Kolkata'): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  // Intl in 24h mode can emit '24' for midnight on some engines — normalize
  // to 0 so the minute math never lands an hour ahead.
  const rawHour = parts.find((p) => p.type === 'hour')?.value ?? '0';
  const hour = rawHour === '24' ? 0 : Number(rawHour);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');

  const day = WEEKDAY_INDEX[weekday];
  if (day === undefined) return false;

  const entry = availability.find((d) => d.day === day);
  if (!entry || !entry.enabled) return false;

  const nowMin = hour * 60 + minute;
  const start = toMinutes(entry.start);
  const end = toMinutes(entry.end);
  return nowMin >= start && nowMin < end;
}
