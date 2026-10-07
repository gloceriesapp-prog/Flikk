import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), payments: vi.fn(), order: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: mocks.from } }));
vi.mock('./cashfreeClient.js', async (load) => ({ ...await load<typeof import('./cashfreeClient.js')>(), getCfOrder: mocks.order, getCfOrderPayments: mocks.payments }));
import { validateCapturedPayment } from './validateCapturedPayment.js';
const id = '00000000-0000-4000-8000-000000000300';
const cfId = 'gl_00000000000040008000000000000300';
const target = { orderId: id };
const payment = { cf_payment_id: 77, order_id: cfId, payment_amount: 30, payment_currency: 'INR', payment_status: 'SUCCESS' };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.payments.mockResolvedValue([payment]);
  mocks.order.mockResolvedValue({ order_id: cfId, order_amount: 30, order_currency: 'INR', order_status: 'PAID', order_tags: { gloceries_order_id: id } });
  mocks.from.mockImplementation(() => {
    const query = { select: vi.fn(() => query), eq: vi.fn(() => query), single: async () => ({ data: { total: 30 }, error: null }) };
    return query;
  });
});
it('accepts only a SUCCESS payment bound to this checkout and its saved total', async () => {
  await expect(validateCapturedPayment(target, '77', cfId)).resolves.toBeUndefined();
});
it('rejects a payment from another Cashfree order', async () => {
  await expect(validateCapturedPayment(target, '77', 'gl_someoneelse')).rejects.toMatchObject({ code: 'PAYMENT_MISMATCH' });
  await expect(validateCapturedPayment(target, '78')).rejects.toMatchObject({ code: 'PAYMENT_MISMATCH' });
});
it('does not treat a pending payment as paid', async () => {
  mocks.payments.mockResolvedValue([{ ...payment, payment_status: 'PENDING' }]);
  await expect(validateCapturedPayment(target, '77')).rejects.toMatchObject({ code: 'PAYMENT_RECONCILING' });
});
it('rejects amount, currency and tag mismatches', async () => {
  for (const changed of [{ payment_amount: 29.99 }, { payment_currency: 'USD' }]) {
    mocks.payments.mockResolvedValue([{ ...payment, ...changed }]);
    await expect(validateCapturedPayment(target, '77')).rejects.toMatchObject({ code: 'PAYMENT_MISMATCH' });
  }
  mocks.payments.mockResolvedValue([payment]);
  mocks.order.mockResolvedValue({ order_id: cfId, order_amount: 30, order_currency: 'INR', order_tags: { gloceries_order_id: 'another' } });
  await expect(validateCapturedPayment(target, '77')).rejects.toMatchObject({ code: 'PAYMENT_MISMATCH' });
  mocks.order.mockResolvedValue({ order_id: cfId, order_amount: 31, order_currency: 'INR', order_tags: { gloceries_order_id: id } });
  await expect(validateCapturedPayment(target, '77')).rejects.toMatchObject({ code: 'PAYMENT_MISMATCH' });
});
