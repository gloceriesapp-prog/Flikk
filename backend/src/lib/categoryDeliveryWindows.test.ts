import { describe, expect, it } from 'vitest';
import { mapCategoryWindows } from './categoryDeliveryWindows.js';

describe('category delivery windows', () => {
  it('keeps valid windows and drops broken rows', () => {
    expect(mapCategoryWindows([
      { category: ' Non Veg ', min_minutes: 45, max_minutes: 60, note: ' cut fresh ' },
      { category: 'Bakery', min_minutes: '40', max_minutes: '50', note: '' },
      { category: 'Bad', min_minutes: 60, max_minutes: 45 },
      { category: '', min_minutes: 10, max_minutes: 20 },
      { category: 'Huge', min_minutes: 10, max_minutes: 999 },
    ])).toEqual([
      { category: 'Non Veg', minMinutes: 45, maxMinutes: 60, note: 'cut fresh' },
      { category: 'Bakery', minMinutes: 40, maxMinutes: 50, note: null },
    ]);
    expect(mapCategoryWindows(null)).toEqual([]);
  });
});
