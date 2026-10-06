import { describe, expect, it } from 'vitest';
import { checkoutAvailability, parseStoreTime, platformIsOpen, storeIsOpen, type EligibilityProduct, type EligibilityStore } from './checkoutEligibility.js';
import { isOutsideOperatingHours } from '../../../apps/customer/src/utils/operatingHours';
import { vi } from 'vitest';
const noon = new Date('2026-10-04T06:30:00Z');
const product: EligibilityProduct = { id: 'rice', store_id: 'shop', price: 20, unit: '1 kg', is_in_stock: true,
  approval_status: 'approved', stock_status: 'in_stock', stock_quantity: 3, stock_tracking_enabled: true, product_variants: [] };
const store: EligibilityStore = { id: 'shop', zone_id: 'zone', is_active: true, open_time: '6:00 AM', close_time: '10:30 PM',
  lat: 13.27, lng: 74.75, delivery_radius_km: 12 };
const address = { id: 'address', zone_id: 'zone', latitude: 13.271, longitude: 74.751 };
const items = [{ product_id: 'rice', quantity: 1 }];
const check = (products = [product], stores = [store], pin: typeof address | null = address, zones = new Set(['zone']), date = noon) =>
  checkoutAvailability(items, products, stores, pin, zones, date);
describe('backend checkout eligibility', () => {
  it('allows a stocked approved product from an open nearby shop', () => expect(check().eligible).toBe(true));
  it('uses IST and exactly matches customer platform opening/closing boundaries', () => {
    vi.useFakeTimers();
    try {
      for (const [timestamp, open] of [['2026-10-04T00:29:59Z', false], ['2026-10-04T00:30:00Z', true],
        ['2026-10-04T16:59:59Z', true], ['2026-10-04T17:00:00Z', false]] as const) {
        vi.setSystemTime(new Date(timestamp));
        expect(platformIsOpen()).toBe(open); expect(isOutsideOperatingHours()).toBe(!open);
      }
    } finally { vi.useRealTimers(); }
  });
  it('parses both stored clock formats and fails closed for malformed/partial schedules', () => {
    expect(parseStoreTime('12:00 AM')).toBe(0); expect(parseStoreTime('12:00 PM')).toBe(720);
    expect(parseStoreTime('22:30')).toBe(1350); expect(parseStoreTime('22:30:00')).toBe(1350);
    for (const text of ['25:00', '00:00 AM', '12:70 PM', 'tomorrow']) expect(parseStoreTime(text)).toBeNull();
    expect(storeIsOpen({ ...store, open_time: null, close_time: '9:00 PM' }, noon)).toBe(false);
    expect(storeIsOpen({ ...store, open_time: null, close_time: null }, noon)).toBe(true);
  });
  it('handles overnight and explicit 24-hour shops with an exclusive closing boundary', () => {
    const overnight = { ...store, open_time: '9:00 PM', close_time: '2:00 AM' };
    expect(storeIsOpen(overnight, new Date('2026-10-04T16:00:00Z'))).toBe(true);
    expect(storeIsOpen(overnight, new Date('2026-10-04T20:30:00Z'))).toBe(false);
    expect(storeIsOpen({ ...store, close_time: store.open_time }, noon)).toBe(true);
  });
  it('rejects out-of-stock flags, unapproved products and missing products', () => {
    for (const patch of [{ is_in_stock: false }, { stock_status: 'out_of_stock' }, { stock_quantity: 0 }]) {
      expect(check([{ ...product, ...patch }]).lines[0]?.status).toBe('OUT_OF_STOCK');
    }
    expect(check([{ ...product, approval_status: 'pending' }]).eligible).toBe(false);
    expect(check([]).lines[0]?.status).toBe('PRODUCT_UNAVAILABLE');
  });
  it('aggregates different packs against their shared tracked inventory', () => {
    const pack = { id: 'pack', unit_type: 'kg', quantity: 1, price: 20, original_price: null, is_default: true };
    const result = checkoutAvailability([{ product_id: 'rice', quantity: 2 }, { product_id: 'rice', variant_id: 'pack', quantity: 2 }],
      [{ ...product, product_variants: [pack] }], [store], address, new Set(['zone']), noon);
    expect(result.lines.every((line) => line.status === 'INSUFFICIENT_STOCK')).toBe(true);
    expect(result.eligible).toBe(false);
  });
  it('blocks checkout until placeholder inventory counts are verified', () => {
    expect(check([{ ...product, stock_tracking_enabled: false, stock_quantity: 0 }]).lines[0]?.status).toBe('STOCK_UNCONFIRMED');
    expect(check([{ ...product, stock_tracking_enabled: false, stock_status: 'out_of_stock', stock_quantity: 0 }]).eligible).toBe(false);
  });
  it('rejects closed shops, missing shop pins, inactive zones and invalid reach', () => {
    for (const patch of [{ is_active: false }, { lat: null }, { delivery_radius_km: 0 }, { open_time: '1:00 PM' }]) {
      expect(check([product], [{ ...store, ...patch }]).eligible).toBe(false);
    }
    expect(check([product], [store], address, new Set()).eligible).toBe(false);
  });
  it('checks every shop against the owned saved address and its own radius', () => {
    const result = checkoutAvailability([...items, { product_id: 'fruit', quantity: 1 }], [product, { ...product, id: 'fruit', store_id: 'far' }],
      [store, { ...store, id: 'far', lat: 0, lng: 0 }], address, new Set(['zone']), noon);
    expect(result.lines.map((line) => line.status)).toEqual(['AVAILABLE', 'OUT_OF_RANGE']); expect(result.eligible).toBe(false);
    expect(check([product], [{ ...store, zone_id: 'other' }], address, new Set(['zone', 'other'])).eligible).toBe(false);
  });
  it('requires a valid pinned address, including finite latitude/longitude', () => {
    expect(check([product], [store], null).issues[0]?.code).toBe('ADDRESS_REQUIRED');
    for (const latitude of [NaN, 91, Infinity]) expect(check([product], [store], { ...address, latitude }).eligible).toBe(false);
    expect(check([product], [store], address, new Set(['zone']), new Date('2026-10-04T17:00:00Z')).issues[0]?.code).toBe('PLATFORM_CLOSED');
  });
});
