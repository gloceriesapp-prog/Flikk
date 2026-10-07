import { describe, expect, it } from 'vitest';
import { DEFAULT_ORDERING_HOURS, formatIstMinute, parseOrderingHours, platformIsOpen } from './orderingHours.js';
import { checkoutAvailability, type EligibilityProduct, type EligibilityStore } from './checkoutEligibility.js';
import { orderingHoursFields } from './deliverySettings.js';
import {
  formatIstMinute as customerFormat, isOutsideOperatingHours, orderingHoursFrom, reopenDayLabel,
} from '../../../apps/customer/src/utils/operatingHours';

const at = (utc: string) => new Date(utc);
const product: EligibilityProduct = { id: 'rice', store_id: 'shop', price: 20, unit: '1 kg', is_in_stock: true,
  approval_status: 'approved', stock_status: 'in_stock', stock_quantity: 3, stock_tracking_enabled: true, product_variants: [] };
const store: EligibilityStore = { id: 'shop', zone_id: 'zone', is_active: true, open_time: null, close_time: null,
  lat: 13.27, lng: 74.75, delivery_radius_km: 12 };
const address = { id: 'address', zone_id: 'zone', latitude: 13.271, longitude: 74.751 };
const rules = { defaultRadiusKm: 12, roadFactor: 1.4, maxStoreSpreadKm: 2 };

describe('ordering hours', () => {
  it('defaults to the old 6:00 AM to 10:30 PM IST window', () => {
    expect(DEFAULT_ORDERING_HOURS).toEqual({ opensMinute: 360, closesMinute: 1350 });
    expect(parseOrderingHours(undefined, undefined)).toEqual(DEFAULT_ORDERING_HOURS);
    expect(orderingHoursFields(null, null)).toEqual({ orderingOpensMinute: 360, orderingClosesMinute: 1350 });
  });
  it('reads configured hours and rejects inconsistent ones as a pair', () => {
    expect(parseOrderingHours(435, 1260)).toEqual({ opensMinute: 435, closesMinute: 1260 });
    expect(parseOrderingHours('435', '1260')).toEqual({ opensMinute: 435, closesMinute: 1260 });
    for (const [o, c] of [[600, 600], [700, 600], [-1, 600], [0, 1441], [1.5, 600], [null, 600]]) {
      expect(parseOrderingHours(o, c)).toEqual(DEFAULT_ORDERING_HOURS);
    }
  });
  it('formats IST minutes like the SQL message', () => {
    expect(formatIstMinute(360)).toBe('6:00 AM');
    expect(formatIstMinute(435)).toBe('7:15 AM');
    expect(formatIstMinute(750)).toBe('12:30 PM');
    expect(formatIstMinute(1350)).toBe('10:30 PM');
    expect(formatIstMinute(0)).toBe('12:00 AM');
    expect(formatIstMinute(1440)).toBe('12:00 AM');
    for (const m of [0, 360, 435, 750, 1350]) expect(customerFormat(m)).toBe(formatIstMinute(m));
  });
  it('applies configured boundaries in backend and customer app alike', () => {
    const hours = { opensMinute: 435, closesMinute: 1260 };
    // 01:44Z = 07:14 IST, 01:45Z = 07:15, 15:29Z = 20:59, 15:30Z = 21:00.
    for (const [utc, open] of [['2026-10-04T01:44:59Z', false], ['2026-10-04T01:45:00Z', true],
      ['2026-10-04T15:29:59Z', true], ['2026-10-04T15:30:00Z', false]] as const) {
      expect(platformIsOpen(at(utc), hours)).toBe(open);
      expect(isOutsideOperatingHours(hours, at(utc).getTime())).toBe(!open);
    }
    expect(platformIsOpen(at('2026-10-04T18:29:00Z'), { opensMinute: 0, closesMinute: 1440 })).toBe(true);
  });
  it('customer app reads the hours from /delivery-settings and labels the reopening day', () => {
    expect(orderingHoursFrom({ orderingOpensMinute: 435, orderingClosesMinute: 1260 })).toEqual({ opensMinute: 435, closesMinute: 1260 });
    expect(orderingHoursFrom({})).toEqual({ opensMinute: 360, closesMinute: 1350 });
    expect(orderingHoursFrom({ orderingOpensMinute: 900, orderingClosesMinute: 600 })).toEqual({ opensMinute: 360, closesMinute: 1350 });
    expect(reopenDayLabel({ opensMinute: 360, closesMinute: 1350 }, at('2026-10-03T21:00:00Z').getTime())).toBe('today');
    expect(reopenDayLabel({ opensMinute: 360, closesMinute: 1350 }, at('2026-10-04T17:30:00Z').getTime())).toBe('tomorrow');
  });
  it('checkout refuses outside the configured window and names the opening time', () => {
    const items = [{ product_id: 'rice', quantity: 1 }];
    const hours = { opensMinute: 435, closesMinute: 1260 };
    const closed = checkoutAvailability(items, [product], [store], address, new Set(['zone']), at('2026-10-04T01:00:00Z'), { ...rules, hours });
    expect(closed.issues).toContainEqual({ code: 'PLATFORM_CLOSED', message: 'Ordering is closed. We reopen at 7:15 AM IST.' });
    expect(checkoutAvailability(items, [product], [store], address, new Set(['zone']), at('2026-10-04T02:00:00Z'), { ...rules, hours }).eligible).toBe(true);
    // Without configured hours the old window applies (06:30 IST open).
    expect(checkoutAvailability(items, [product], [store], address, new Set(['zone']), at('2026-10-04T01:00:00Z'), rules).eligible).toBe(true);
  });
});
