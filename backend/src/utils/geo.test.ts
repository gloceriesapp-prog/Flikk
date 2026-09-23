import { describe, it, expect } from 'vitest';
import { isWithinReach } from './geo.js';

const DEFAULT = 12;

describe('isWithinReach', () => {
  it('uses the store radius when set: inside kept, outside dropped', () => {
    expect(isWithinReach(4, 5, DEFAULT, null)).toBe(true);
    expect(isWithinReach(6, 5, DEFAULT, null)).toBe(false);
  });

  it('falls back to the default radius when the store has none', () => {
    expect(isWithinReach(11.9, null, DEFAULT, null)).toBe(true);
    expect(isWithinReach(11.9, undefined, DEFAULT, null)).toBe(true);
    expect(isWithinReach(12.1, null, DEFAULT, null)).toBe(false);
  });

  it('is inclusive at exactly the cutoff', () => {
    expect(isWithinReach(12, null, DEFAULT, null)).toBe(true);
    expect(isWithinReach(5, 5, DEFAULT, null)).toBe(true);
  });

  it('override can only tighten reach, never widen it', () => {
    // Override narrower than store radius -> min wins, store now out of reach.
    expect(isWithinReach(8, 20, DEFAULT, 5)).toBe(false);
    // Override wider than store radius -> store radius still caps it.
    expect(isWithinReach(8, 5, DEFAULT, 50)).toBe(false);
    expect(isWithinReach(4, 5, DEFAULT, 50)).toBe(true);
  });
});
