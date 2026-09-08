import { describe, expect, it } from 'vitest';
import { previousWeekRange } from './weeklyPayouts.js';

describe('previousWeekRange', () => {
  it('targets the prior Mon-Sun when run on a Monday morning', () => {
    // Monday 2026-09-14, 09:00 IST-ish local time.
    const { startDate, endDate } = previousWeekRange(new Date('2026-09-14T03:30:00Z'));
    expect(startDate).toBe('2026-09-07');
    expect(endDate).toBe('2026-09-14');
  });

  it('still targets the last COMPLETE week when run mid-week', () => {
    // Wednesday 2026-09-16 — the week ending Sunday 2026-09-13 is the
    // most recent fully-complete one, not the in-progress current week.
    const { startDate, endDate } = previousWeekRange(new Date('2026-09-16T12:00:00Z'));
    expect(startDate).toBe('2026-09-07');
    expect(endDate).toBe('2026-09-14');
  });

  it('produces a 7-day exclusive range', () => {
    const { start, end } = previousWeekRange(new Date('2026-09-14T03:30:00Z'));
    const diffDays = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBe(7);
  });

  it('uses IST, not the server system timezone, to decide the calendar week', () => {
    // 2026-09-13 23:45 UTC is already 2026-09-14 05:15 IST (Monday) — a
    // naive local-time implementation on a UTC-configured server would
    // still see Sunday and target the wrong week. This is exactly the
    // class of bug the earlier local-Date-methods version had.
    const { startDate, endDate } = previousWeekRange(new Date('2026-09-13T23:45:00Z'));
    expect(startDate).toBe('2026-09-07');
    expect(endDate).toBe('2026-09-14');
  });
});
