import { expect, it } from 'vitest';
import { normalizeStoreHour, storeHourDisplay, storeHourFromDigits } from '../../../apps/partner/src/utils/storeHours';
import { validateStoreFields } from '../stores/validation.js';

it('converts legacy AM/PM hours to server-valid canonical local times', () => {
  for (const [input, expected] of [['9:00 AM', '09:00'], ['9:00 PM', '21:00'], ['12:00 AM', '00:00'], ['12:00 PM', '12:00'], ['09:30 pm', '21:30'], ['23:59:59', '23:59']]) {
    expect(normalizeStoreHour(input)).toBe(expected);
    expect(() => validateStoreFields({ open_time: expected })).not.toThrow();
  }
});
it('rejects invalid or incomplete hours without guessing', () => {
  for (const input of ['24:00', '9:60 AM', '0:30 AM', '13:00 PM', '9 AM', '9', '123', '23:59:99']) expect(normalizeStoreHour(input)).toBeNull();
  expect(normalizeStoreHour('')).toBe('');
});
it('displays persisted seconds and 24-hour values with the correct meridiem', () => {
  expect(storeHourDisplay('09:00:00', 'PM')).toEqual({ text: '9:00', period: 'AM' });
  expect(storeHourDisplay('21:30:00', 'AM')).toEqual({ text: '9:30', period: 'PM' });
  expect(storeHourDisplay('00:00', 'PM')).toEqual({ text: '12:00', period: 'AM' });
  expect(storeHourDisplay('12:00', 'AM')).toEqual({ text: '12:00', period: 'PM' });
});
it('allows night opening and morning closing without changing the selected period', () => {
  expect(storeHourFromDigits('930', 'PM')).toBe('21:30');
  expect(storeHourFromDigits('600', 'AM')).toBe('06:00');
  expect(storeHourFromDigits('1200', 'AM')).toBe('00:00');
  expect(storeHourFromDigits('1260', 'PM')).toBe('12:60 PM');
});
