import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ load: vi.fn(), settings: vi.fn(), promo: vi.fn(), eligibility: vi.fn() }));
vi.mock('../config/env.js', () => ({ env: { supabaseServiceRoleKey: 'test-secret' } }));
vi.mock('./checkoutEligibilityService.js', () => ({ requireCheckoutEligibilitySnapshot: mocks.eligibility }));
vi.mock('./checkoutCatalog.js', () => ({ loadCheckoutItems: mocks.load }));
vi.mock('./deliverySettings.js', () => ({ getDeliverySettings: mocks.settings }));
vi.mock('../routes/promos.js', () => ({ lookupPromoForCheckout: mocks.promo }));
import { confirmCheckoutQuote, createCheckoutQuote } from './checkoutQuoteService.js';
const productId = '00000000-0000-4000-8000-000000000001';
const input = [{ product_id: productId, quantity: 2, expected_unit_price: 20 }];
beforeEach(() => {
  vi.clearAllMocks();
  mocks.eligibility.mockResolvedValue({ address: { id: 'address', zone_id: 'zone', latitude: 13, longitude: 74 }, products: [{ id: productId, price: 30 }] });
  mocks.load.mockResolvedValue([{ product_id: productId, quantity: 2, variant_id: null, store_id: 'shop',
    unit_price_at_order: 30, unit_at_order: '500 g', variant_mrp_at_order: 35 }]);
  mocks.settings.mockResolvedValue({ flatDeliveryFee: 20, handlingFee: 5, freeDeliveryEnabled: false, freeDeliveryThreshold: 100 });
  mocks.promo.mockResolvedValue({ promoCodeId: 'promo', discountAmount: 10 });
});
describe('quote and placement share the same server calculation', () => {
  it('returns changed catalogue prices for review without trusting the expected price', async () => {
    const quote = await createCheckoutQuote(input, 'customer', 'SAVE');
    expect(mocks.load).toHaveBeenCalledWith([{ product_id: productId, variant_id: null, quantity: 2 }], undefined, [{ id: productId, price: 30 }]);
    expect(quote.bill.total).toBe(75);
    expect(mocks.promo).toHaveBeenCalledWith('SAVE', 'customer', 60);
    await expect(confirmCheckoutQuote(input, 'customer', quote.token, 'SAVE')).resolves.toMatchObject({ bill: { total: 75 } });
  });
  it('stops placement when admin fees change after the displayed quote', async () => {
    const quote = await createCheckoutQuote(input, 'customer');
    mocks.settings.mockResolvedValue({ flatDeliveryFee: 25, handlingFee: 5, freeDeliveryEnabled: false, freeDeliveryThreshold: 100 });
    await expect(confirmCheckoutQuote(input, 'customer', quote.token)).rejects.toMatchObject({ code: 'QUOTE_CHANGED', status: 409 });
  });
  it('stops placement when a product price changes after confirmation', async () => {
    const quote = await createCheckoutQuote(input, 'customer');
    mocks.load.mockResolvedValue([{ product_id: productId, quantity: 2, variant_id: null, store_id: 'shop',
      unit_price_at_order: 31, unit_at_order: '500 g', variant_mrp_at_order: 35 }]);
    await expect(confirmCheckoutQuote(input, 'customer', quote.token)).rejects.toMatchObject({ code: 'QUOTE_CHANGED' });
  });
  it('does not issue a quote for unavailable packs or invalid promos', async () => {
    mocks.load.mockRejectedValueOnce(new Error('Pack unavailable'));
    await expect(createCheckoutQuote(input, 'customer')).rejects.toThrow('Pack unavailable');
    mocks.promo.mockRejectedValueOnce(new Error('Promo expired'));
    await expect(createCheckoutQuote(input, 'customer', 'EXPIRED')).rejects.toThrow('Promo expired');
  });
});

it('requires a new quote when the saved delivery pin changes', async () => {
  const quote = await createCheckoutQuote(input, 'customer', undefined, 'address');
  mocks.eligibility.mockResolvedValue({ address: { id: 'address', zone_id: 'zone', latitude: 14, longitude: 74 }, products: [{ id: productId, price: 30 }] });
  await expect(confirmCheckoutQuote(input, 'customer', quote.token, undefined, undefined, 'address')).rejects.toMatchObject({ code: 'QUOTE_CHANGED' });
});
it('blocks checkout before pricing when a shop or address becomes ineligible', async () => {
  mocks.eligibility.mockRejectedValue(new Error('Shop closed'));
  await expect(createCheckoutQuote(input, 'customer')).rejects.toThrow('Shop closed');
  expect(mocks.load).not.toHaveBeenCalled();
});
