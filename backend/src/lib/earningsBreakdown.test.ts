import { describe, expect, it } from 'vitest';
import { splitEarning } from './earningsBreakdown.js';

const EXTRA_STOP_FEE = 15;

describe('splitEarning', () => {
  it('single order (no extra stops) is all base', () => {
    expect(splitEarning(25, 1, EXTRA_STOP_FEE)).toEqual({ base: 25, extraStop: 0 });
  });

  it('trip splits into base + per-extra-stop surcharge', () => {
    // 3 stops → 2 extra stops → 2 * 15 = 30 extra, 55 - 30 = 25 base.
    expect(splitEarning(55, 3, EXTRA_STOP_FEE)).toEqual({ base: 25, extraStop: 30 });
  });

  it('stopCount 0 is treated as a single stop', () => {
    expect(splitEarning(25, 0, EXTRA_STOP_FEE)).toEqual({ base: 25, extraStop: 0 });
  });
});
