import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), payment: vi.fn(), order: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: mocks.from } }));
vi.mock('./razorpayClient.js', () => ({ razorpay: { payments: { fetch: mocks.payment }, orders: { fetch: mocks.order } } }));
import { validateCapturedPayment } from './validateCapturedPayment.js';
const target = { orderId: 'local-order' };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.payment.mockResolvedValue({ id: 'payment', order_id: 'provider-order', amount: 3000, currency: 'INR', status: 'captured' });
  mocks.order.mockResolvedValue({ id: 'provider-order', receipt: 'local-order', amount: 3000, currency: 'INR' });
  mocks.from.mockImplementation((table: string) => {
    const query = { select: vi.fn(() => query), eq: vi.fn(() => query), single: async () => ({ data: { total: 30 }, error: null }),
      maybeSingle: async () => ({ data: table === 'checkout_payment_sessions' ? { provider_order_id: 'provider-order' } : null, error: null }) };
    return query;
  });
});
it('accepts only captured payment bound to the saved total and provider session', async () => {
  await expect(validateCapturedPayment(target, 'payment', 'provider-order')).resolves.toBeUndefined();
});
it('rejects a validly signed payment from another provider order', async () => {
  await expect(validateCapturedPayment(target, 'payment', 'other-provider-order')).rejects.toMatchObject({ code: 'PAYMENT_MISMATCH' });
});
it('does not treat authorization as completed payment', async () => {
  mocks.payment.mockResolvedValue({ order_id: 'provider-order', amount: 3000, currency: 'INR', status: 'authorized' });
  await expect(validateCapturedPayment(target, 'payment')).rejects.toMatchObject({ code: 'PAYMENT_RECONCILING' });
});
it('rejects receipt, currency and amount mismatches', async () => {
  for (const payment of [{ amount: 1, currency: 'INR' }, { amount: 3000, currency: 'USD' }]) {
    mocks.payment.mockResolvedValue({ ...payment, order_id: 'provider-order', status: 'captured' });
    await expect(validateCapturedPayment(target, 'payment')).rejects.toMatchObject({ code: 'PAYMENT_MISMATCH' });
  }
  mocks.payment.mockResolvedValue({ order_id: 'provider-order', amount: 3000, currency: 'INR', status: 'captured' });
  mocks.order.mockResolvedValue({ receipt: 'another-local-order', amount: 3000, currency: 'INR' });
  await expect(validateCapturedPayment(target, 'payment')).rejects.toMatchObject({ code: 'PAYMENT_MISMATCH' });
});
