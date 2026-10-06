import { expect, it } from 'vitest';
import { checkoutAttemptIdentity } from './checkoutAttempts.js';
const id = '00000000-0000-4000-8000-000000000001';
const product = '00000000-0000-4000-8000-000000000100';
const body = { attempt_id: id, address_id: id, store_id: id, payment_method: 'online', quote_token: 'old',
  items: [{ product_id: product, quantity: 2 }] };
it('keeps identity stable across a refreshed quote and grouped/reordered quantities', () => {
  const one = checkoutAttemptIdentity(body, 'order');
  const two = checkoutAttemptIdentity({ ...body, quote_token: 'new', items: [
    { product_id: product, quantity: 1 }, { product_id: product, quantity: 1 },
  ] }, 'order');
  expect(two).toEqual(one);
});
it('binds an attempt to its address, payment method, quantities and order type', () => {
  const original = checkoutAttemptIdentity(body, 'order').fingerprint;
  for (const changed of [{ ...body, address_id: product }, { ...body, payment_method: 'cod' },
    { ...body, items: [{ product_id: product, quantity: 3 }] }, { ...body, promo_code: 'SAVE' }])
    expect(checkoutAttemptIdentity(changed, 'order').fingerprint).not.toBe(original);
  expect(checkoutAttemptIdentity(body, 'trip').fingerprint).not.toBe(original);
});
it('requires a real attempt UUID and valid product identifiers', () => {
  expect(() => checkoutAttemptIdentity({ ...body, attempt_id: 'random' }, 'order')).toThrow();
  expect(() => checkoutAttemptIdentity({ ...body, items: [{ product_id: 'synthetic::variant', quantity: 1 }] }, 'order')).toThrow();
});
