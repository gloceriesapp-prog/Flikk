import { describe, expect, it } from 'vitest';
import { checkoutAvailability, deliveryDistanceKm, type EligibilityProduct, type EligibilityStore } from './checkoutEligibility.js';
import { distanceDeliveryFee, parseFeeTiers } from './deliveryFees.js';
import { calculateCheckoutBill } from './checkoutQuote.js';
import type { DeliverySettings } from './deliverySettings.js';

const noon = new Date('2026-10-04T06:30:00Z');
const product = (id: string, storeId: string): EligibilityProduct => ({ id, store_id: storeId, price: 20, unit: '1 kg', is_in_stock: true,
  approval_status: 'approved', stock_status: 'in_stock', stock_quantity: 3, stock_tracking_enabled: true, product_variants: [] });
const shop = (id: string, lat: number, radius: number | null = null): EligibilityStore => ({ id, zone_id: 'zone', is_active: true,
  open_time: null, close_time: null, lat, lng: 74.75, delivery_radius_km: radius });
const address = { id: 'address', zone_id: 'zone', latitude: 13.27, longitude: 74.75 };
const KM_PER_DEG_LAT = 111.19;
const rules = (patch: Partial<{ defaultRadiusKm: number; roadFactor: number; maxStoreSpreadKm: number }> = {}) =>
  ({ defaultRadiusKm: 12, roadFactor: 1.4, maxStoreSpreadKm: 2, ...patch });
const tiers = parseFeeTiers([{ up_to_km: 4, fee: 26 }, { up_to_km: 2, fee: 17 }, { up_to_km: 12, fee: 32 }, { up_to_km: 'x', fee: 5 }]);

describe('delivery fee tiers', () => {
  it('drops malformed tiers and sorts by distance', () => {
    expect(tiers).toEqual([{ upToKm: 2, fee: 17 }, { upToKm: 4, fee: 26 }, { upToKm: 12, fee: 32 }]);
  });
  it('charges the first tier covering the road distance, the last tier beyond it', () => {
    const settings = { flatDeliveryFee: 25, deliveryFeeTiers: tiers };
    expect(distanceDeliveryFee(1.5, settings)).toBe(17);
    expect(distanceDeliveryFee(2, settings)).toBe(17);
    expect(distanceDeliveryFee(2.1, settings)).toBe(26);
    expect(distanceDeliveryFee(11, settings)).toBe(32);
    expect(distanceDeliveryFee(20, settings)).toBe(32);
  });
  it('falls back to the flat fee with no tiers or no known distance', () => {
    expect(distanceDeliveryFee(3, { flatDeliveryFee: 25, deliveryFeeTiers: [] })).toBe(25);
    expect(distanceDeliveryFee(null, { flatDeliveryFee: 25, deliveryFeeTiers: tiers })).toBe(25);
  });
  it('prices the bill by distance and still waives it for free delivery', () => {
    const settings = { flatDeliveryFee: 25, handlingFee: 5, freeDeliveryEnabled: true, freeDeliveryThreshold: 500,
      estimatedDeliveryMinutes: 30, defaultDeliveryRadiusKm: 12, roadDistanceFactor: 1.4, deliveryFeeTiers: tiers, maxStoreSpreadKm: 2 } satisfies DeliverySettings;
    const line = { product_id: 'p', variant_id: null, quantity: 1, store_id: 'a', unit_price_at_order: 100, unit_at_order: '1 kg', variant_mrp_at_order: 100 };
    const bill = calculateCheckoutBill([line] as never, settings, 0, 3.04);
    expect(bill).toMatchObject({ baseDeliveryFee: 26, deliveryFee: 26, deliveryDistanceKm: 3, total: 131 });
    expect(calculateCheckoutBill([{ ...line, unit_price_at_order: 600 }] as never, settings, 0, 3).deliveryFee).toBe(0);
  });
});

describe('delivery reach', () => {
  const items = [{ product_id: 'rice', quantity: 1 }];
  // 0.06 degrees of latitude is about 6.7 km straight-line, 9.3 km by road at 1.4.
  const near = shop('a', 13.27 + 0.06);
  it('measures reach in road km, not straight line', () => {
    expect(checkoutAvailability(items, [product('rice', 'a')], [near], address, new Set(['zone']), noon, rules({ defaultRadiusKm: 8 })).eligible).toBe(false);
    expect(checkoutAvailability(items, [product('rice', 'a')], [near], address, new Set(['zone']), noon, rules({ defaultRadiusKm: 8, roadFactor: 1 })).eligible).toBe(true);
  });
  it("uses the store's own radius over the platform default", () => {
    expect(checkoutAvailability(items, [product('rice', 'a')], [{ ...near, delivery_radius_km: 10 }], address, new Set(['zone']), noon, rules({ defaultRadiusKm: 5 })).eligible).toBe(true);
  });
  it('refuses multi-store carts whose shops are too far apart, unless the rule is off', () => {
    const cart = [{ product_id: 'rice', quantity: 1 }, { product_id: 'dal', quantity: 1 }];
    const products = [product('rice', 'a'), product('dal', 'b')];
    const apart = [shop('a', 13.27), shop('b', 13.27 + 3 / KM_PER_DEG_LAT)]; // 3 km straight, 4.2 km road
    const result = checkoutAvailability(cart, products, apart, address, new Set(['zone']), noon, rules());
    expect(result.eligible).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain('STORES_TOO_FAR_APART');
    expect(checkoutAvailability(cart, products, apart, address, new Set(['zone']), noon, rules({ maxStoreSpreadKm: 0 })).eligible).toBe(true);
    expect(checkoutAvailability(cart, products, apart, address, new Set(['zone']), noon, rules({ maxStoreSpreadKm: 5 })).eligible).toBe(true);
  });
  it('prices by the farthest shop from the address', () => {
    const stores = [shop('a', 13.27 + 1 / KM_PER_DEG_LAT), shop('b', 13.27 + 2 / KM_PER_DEG_LAT)];
    expect(deliveryDistanceKm(stores, address, 1.4)).toBeCloseTo(2.8, 1);
    expect(deliveryDistanceKm(stores, null, 1.4)).toBeNull();
  });
});
