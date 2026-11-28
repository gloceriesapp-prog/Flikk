import { describe, expect, it } from 'vitest';
import { validateDeliveryWindows } from '../../../apps/admin/src/lib/deliveryWindows';

describe('admin delivery time by category', () => {
  it('accepts a clean list and trims notes', () => {
    expect(validateDeliveryWindows({ windows: [{ category: ' Non Veg ', minMinutes: 45, maxMinutes: 60, note: ' cut fresh ' }, { category: 'Bakery', minMinutes: 40, maxMinutes: 40, note: '' }] }))
      .toEqual([{ category: 'Non Veg', minMinutes: 45, maxMinutes: 60, note: 'cut fresh' }, { category: 'Bakery', minMinutes: 40, maxMinutes: 40, note: null }]);
    expect(validateDeliveryWindows({ windows: [] })).toEqual([]);
  });
  it.each([
    [{ windows: [{ category: '', minMinutes: 45, maxMinutes: 60 }] }, /Pick a category/],
    [{ windows: [{ category: 'Non Veg', minMinutes: 60, maxMinutes: 45 }] }, /must not be shorter/],
    [{ windows: [{ category: 'Non Veg', minMinutes: 0, maxMinutes: 45 }] }, /between 1 and 240/],
    [{ windows: [{ category: 'Non Veg', minMinutes: 45, maxMinutes: 60 }, { category: 'non veg', minMinutes: 45, maxMinutes: 60 }] }, /listed twice/],
    [{ windows: [{ category: 'Non Veg', minMinutes: 45, maxMinutes: 60, note: 'x'.repeat(31) }] }, /30 characters/],
    [{}, /Send the list/],
  ])('rejects %j', (input, message) => {
    expect(() => validateDeliveryWindows(input)).toThrow(message);
  });
});
