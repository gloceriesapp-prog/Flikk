import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), catalogue: vi.fn(), address: null as unknown }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: mocks.from } }));
vi.mock('./checkoutCatalog.js', () => ({ readCheckoutCatalog: mocks.catalogue }));
vi.mock('./deliverySettings.js', () => ({ getDeliverySettings: async () => ({ defaultDeliveryRadiusKm: 12, roadDistanceFactor: 1.4, maxStoreSpreadKm: 2 }) }));
import { loadCheckoutAvailability, requireCheckoutEligibility } from './checkoutEligibilityService.js';
const customer = 'customer'; const id = '00000000-0000-4000-8000-000000000001';
const input = [{ product_id: id, quantity: 1 }];
beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-04T06:30:00Z'));
  mocks.address = { id, zone_id: 'zone', latitude: 13.27, longitude: 74.75 };
  mocks.catalogue.mockResolvedValue([{ id, store_id: 'shop', is_in_stock: true, approval_status: 'approved',
    stock_status: 'in_stock', stock_quantity: 2, stock_tracking_enabled: true, product_variants: [] }]);
  mocks.from.mockImplementation((table) => {
    const data = table === 'stores' ? [{ id: 'shop', zone_id: 'zone', is_active: true, lat: 13.27, lng: 74.75, open_time: null, close_time: null, delivery_radius_km: null }]
      : table === 'zones' ? [{ id: 'zone' }] : mocks.address;
    const query = { select: vi.fn(() => query), eq: vi.fn(() => query), is: vi.fn(() => query),
      in: vi.fn(() => query), maybeSingle: async () => ({ data, error: null }),
      then: (resolve: (value: unknown) => void) => resolve({ data, error: null }) };
    return query;
  });
});
import { afterEach } from 'vitest';
afterEach(() => vi.useRealTimers());
it('scopes the saved address to its owner and excludes deleted addresses', async () => {
  expect((await loadCheckoutAvailability(input, customer, id)).eligible).toBe(true);
  const query = mocks.from.mock.results.find((_result, index) => mocks.from.mock.calls[index]?.[0] === 'addresses')!.value;
  expect(query.eq).toHaveBeenCalledWith('user_id', customer); expect(query.is).toHaveBeenCalledWith('deleted_at', null);
});
it('rejects foreign or deleted address IDs before accepting checkout', async () => {
  mocks.address = null;
  await expect(requireCheckoutEligibility(input, customer, id)).rejects.toMatchObject({ code: 'ADDRESS_UNAVAILABLE', status: 403 });
});
it('returns all unavailable lines for the cart and blocks order eligibility', async () => {
  mocks.catalogue.mockResolvedValue([{ id, store_id: 'shop', is_in_stock: false, stock_status: 'out_of_stock', approval_status: 'approved', product_variants: [] }]);
  expect((await loadCheckoutAvailability(input, customer, id)).lines[0]).toMatchObject({ status: 'OUT_OF_STOCK', eligible: false });
  await expect(requireCheckoutEligibility(input, customer, id)).rejects.toMatchObject({ code: 'CHECKOUT_INELIGIBLE', status: 409 });
});
it('rejects malformed address IDs without accessing the database', async () => {
  await expect(loadCheckoutAvailability(input, customer, 'bad')).rejects.toMatchObject({ status: 400 });
  expect(mocks.from).not.toHaveBeenCalled();
});
