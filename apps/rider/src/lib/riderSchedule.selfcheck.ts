// ponytail: one runnable self-check for isWithinSchedule's real branching —
// the IST weekday derivation (not the device/UTC weekday), the half-open
// [start, end) boundaries, and the disabled-day short-circuit. Fixed UTC
// instants (IST = UTC+5:30) so the asserts don't depend on when it's run.
// Run: npx tsx apps/rider/src/lib/riderSchedule.selfcheck.ts
import assert from 'node:assert';
import { isWithinSchedule } from './riderSchedule';
import type { DaySchedule } from '../api/availability';

// Monday (day 1) 09:00–18:00, everything else disabled. 2024-01-01 is a Monday.
const week: DaySchedule[] = Array.from({ length: 7 }, (_, day) => ({
  day,
  enabled: day === 1,
  start: '09:00',
  end: '18:00',
}));

// Monday 12:00 IST = 2024-01-01 06:30 UTC → inside.
assert.equal(isWithinSchedule(week, new Date('2024-01-01T06:30:00Z')), true);
// Start is inclusive: Monday 09:00 IST = 03:30 UTC → inside.
assert.equal(isWithinSchedule(week, new Date('2024-01-01T03:30:00Z')), true);
// End is exclusive: Monday 18:00 IST = 12:30 UTC → outside.
assert.equal(isWithinSchedule(week, new Date('2024-01-01T12:30:00Z')), false);
// Before open: Monday 08:59 IST = 03:29 UTC → outside.
assert.equal(isWithinSchedule(week, new Date('2024-01-01T03:29:00Z')), false);

// Weekday comes from IST, not UTC: 2023-12-31 20:00 UTC is Sunday in UTC but
// Monday 01:30 IST. With a Monday 00:00–06:00 window it must read as inside —
// proves the day index is the IST day, not the raw Date's.
const earlyMon: DaySchedule[] = week.map((d) => (d.day === 1 ? { ...d, start: '00:00', end: '06:00' } : d));
assert.equal(isWithinSchedule(earlyMon, new Date('2023-12-31T20:00:00Z')), true);

// Disabled day short-circuits even mid-window: Tuesday 12:00 IST.
assert.equal(isWithinSchedule(week, new Date('2024-01-02T06:30:00Z')), false);

console.log('riderSchedule.selfcheck OK');
