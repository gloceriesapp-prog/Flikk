import { expect, it } from 'vitest';
import { storeIsOpen, type EligibilityStore } from '../lib/checkoutEligibility.js';
import { shopIsOpen } from '../../../apps/customer/src/utils/storeOpening';
const store: EligibilityStore = { id: 's', zone_id: 'z', is_active: true, open_time: '09:00', close_time: '21:00', lat: 13, lng: 74, delivery_radius_km: 12 };
const customer = (s: EligibilityStore) => ({ isActive: s.is_active, openTime: s.open_time, closeTime: s.close_time, availabilityOverride: s.availability_override, availabilityOverrideUntil: s.availability_override_until });
it('keeps customer and server aligned at IST boundaries and for overnight hours', () => {
  for (const s of [store, { ...store, open_time: '21:00', close_time: '02:00' }, { ...store, open_time: null, close_time: null }]) {
    for (const hour of ['2026-10-16T03:29:59Z', '2026-10-16T03:30:00Z', '2026-10-16T15:30:00Z', '2026-10-16T20:30:00Z']) {
      expect(shopIsOpen(customer(s), new Date(hour))).toBe(storeIsOpen(s, new Date(hour)));
    }
  }
});
it('honours manual opening outside hours until the exact expiry', () => {
  const s = { ...store, availability_override: true, availability_override_until: '2026-10-16T03:30:00Z' };
  expect(storeIsOpen(s, new Date('2026-10-16T02:00:00Z'))).toBe(true);
  expect(shopIsOpen(customer(s), new Date('2026-10-16T02:00:00Z'))).toBe(true);
  expect(storeIsOpen({ ...s, open_time: '10:00' }, new Date(s.availability_override_until))).toBe(false);
});
it('honours manual closure and never reopens a blocked store', () => {
  const s = { ...store, availability_override: false, availability_override_until: '2026-10-16T15:30:00Z' };
  expect(storeIsOpen(s, new Date('2026-10-16T06:00:00Z'))).toBe(false);
  expect(shopIsOpen(customer(s), new Date('2026-10-16T06:00:00Z'))).toBe(false);
  expect(storeIsOpen({ ...s, is_active: false, availability_override: true }, new Date('2026-10-16T06:00:00Z'))).toBe(false);
});
