import { expect, it, vi } from 'vitest';
const request = vi.hoisted(() => vi.fn().mockResolvedValue({ token: 'quote' }));
vi.mock('../../../apps/customer/src/api/client', () => ({ apiRequest: request }));
import { fetchCheckoutQuote } from '../../../apps/customer/src/api/checkout';

it('sends a structured quote body for the shared API client to serialize once', async () => {
  const items = [{ product_id: 'product', variant_id: 'pack', quantity: 2, expected_unit_price: 20 }];
  await fetchCheckoutQuote(items, 'SAVE', 'saved-address');
  expect(request).toHaveBeenCalledWith('/checkout/quote', { method: 'POST', body: { items, promo_code: 'SAVE', address_id: 'saved-address' } });
});
