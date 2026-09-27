// ponytail: one runnable self-check for the non-trivial bits of riderSchedule —
// validateAvailability's count/order/format/end>start rules, and
// isWithinSchedule's IST half-open [start,end) window check against fixed UTC
// instants. Run: npx tsx backend/src/lib/riderSchedule.selfcheck.ts
import assert from 'node:assert';
import { validateAvailability, isWithinSchedule, type DaySchedule } from './riderSchedule.js';

// A full, valid 7-day week: Monday (day 1) enabled 09:00-18:00, every other day
// disabled with '' placeholders. Deliberately given out of order to prove
// validateAvailability sorts to ascending 0..6.
function goodWeek(): DaySchedule[] {
  const week: DaySchedule[] = [];
  for (let d = 6; d >= 0; d--) {
    week.push(d === 1 ? { day: 1, enabled: true, start: '09:00', end: '18:00' } : { day: d, enabled: false, start: '', end: '' });
  }
  return week;
}

// --- validateAvailability: accepts a good week and returns it sorted 0..6 ---
const normalized = validateAvailability(goodWeek());
assert.deepEqual(normalized.map((d) => d.day), [0, 1, 2, 3, 4, 5, 6]);
assert.equal(normalized.find((d) => d.day === 1)?.enabled, true);

// (a) wrong count
assert.throws(() => validateAvailability(goodWeek().slice(0, 6)), /exactly 7/);
// duplicate day (still 7 entries but not one-each)
assert.throws(() => validateAvailability([...goodWeek().slice(0, 6), { day: 5, enabled: false, start: '', end: '' }]), /duplicate day/);
// (b) end <= start on an enabled day
assert.throws(
  () => validateAvailability(goodWeek().map((d) => (d.day === 1 ? { ...d, start: '18:00', end: '09:00' } : d))),
  /must be after start/,
);
// (c) bad HH:MM on an enabled day
assert.throws(
  () => validateAvailability(goodWeek().map((d) => (d.day === 1 ? { ...d, start: '9:00' } : d))),
  /HH:MM/,
);
// disabled day with garbage non-empty time is still rejected
assert.throws(
  () => validateAvailability(goodWeek().map((d) => (d.day === 3 ? { ...d, start: 'x' } : d))),
  /HH:MM/,
);

// --- isWithinSchedule: IST wall-clock window ---
// 2024-01-01 was a Monday (day 1). IST = UTC+5:30 (no DST).
const monday10ist = new Date('2024-01-01T04:30:00Z'); // 10:00 IST Mon -> inside 09:00-18:00
const monday20ist = new Date('2024-01-01T14:30:00Z'); // 20:00 IST Mon -> outside
const monday0859ist = new Date('2024-01-01T03:29:00Z'); // 08:59 IST Mon -> just before start
const monday1800ist = new Date('2024-01-01T12:30:00Z'); // 18:00 IST Mon -> end is exclusive

assert.equal(isWithinSchedule(goodWeek(), monday10ist), true);
assert.equal(isWithinSchedule(goodWeek(), monday20ist), false);
assert.equal(isWithinSchedule(goodWeek(), monday0859ist), false);
assert.equal(isWithinSchedule(goodWeek(), monday1800ist), false); // half-open [start,end)

// Disabled Monday -> never within, even at 10:00 IST.
const mondayOff = goodWeek().map((d) => (d.day === 1 ? { ...d, enabled: false } : d));
assert.equal(isWithinSchedule(mondayOff, monday10ist), false);

// Never-configured ('[]') -> false.
assert.equal(isWithinSchedule([], monday10ist), false);

console.log('riderSchedule.selfcheck OK');
