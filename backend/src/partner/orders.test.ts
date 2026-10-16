import { expect, it } from 'vitest';
import { PARTNER_ORDER_SELECT, partnerOrderError } from './orders.js';
it('returns actionable errors when acceptance loses the timeout race or payment is pending', () => {
  expect(partnerOrderError({ code: 'P0409', message: 'ACCEPTANCE_EXPIRED' })).toMatchObject({ status: 409, code: 'ACCEPTANCE_EXPIRED' });
  expect(partnerOrderError({ code: 'P0409', message: 'PAYMENT_PENDING' })).toMatchObject({ status: 409, code: 'PAYMENT_PENDING' });
});
it('conceals foreign orders and preserves database outage errors', () => {
  expect(partnerOrderError({ code: 'P0404' })).toMatchObject({ status: 404 });
  const outage = { code: '08006', message: 'connection failure' };
  expect(partnerOrderError(outage)).toBe(outage);
});
it('returns authoritative timing and purchased snapshots without delivery proof', () => {
  expect(PARTNER_ORDER_SELECT).toContain('store_visible_at, accepted_at, acceptance_deadline_at, preparation_deadline_at');
  expect(PARTNER_ORDER_SELECT).toContain('product_name_at_order, product_image_at_order');
  expect(PARTNER_ORDER_SELECT).not.toContain('delivery_otp');
});
