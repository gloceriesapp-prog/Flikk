import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ from: vi.fn(), payment: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: m.from } }));
vi.mock('./razorpayClient.js', async load => ({ ...await load<typeof import('./razorpayClient.js')>(), getProviderPayment: m.payment }));
import { refundSource } from './refundPayment.js';
let provider = 'razorpay'; let canonical: string | null = 'pay_one';
beforeEach(() => {
  vi.resetAllMocks(); provider = 'razorpay'; canonical = 'pay_one';
  const q = { select: vi.fn(() => q), eq: vi.fn(() => q), maybeSingle: vi.fn(async () => ({ data: { payment_provider: provider, provider_payment_id: canonical, provider_order_id: 'order_one', total: 30 }, error: null })) };
  m.from.mockReturnValue(q); m.payment.mockResolvedValue({ id: 'pay_one', order_id: 'order_one', amount: 3000, currency: 'INR', captured: true, status: 'captured' });
});
it('validates the original captured payment against checkout provider and total', async () => {
  expect(await refundSource('order', 'checkout', 'pay_one')).toEqual({ provider: 'razorpay', paymentId: 'pay_one' });
});
it('refunds verified late COD capture even though canonical online payment is intentionally empty', async () => {
  canonical = null; expect(await refundSource('order', 'checkout', 'pay_one')).toEqual({ provider: 'razorpay', paymentId: 'pay_one' });
  m.payment.mockResolvedValue({ id: 'pay_one', order_id: 'order_one', amount: 3000, currency: 'INR', captured: true, status: 'refunded' });
  expect(await refundSource('trip', 'checkout', 'pay_one')).toEqual({ provider: 'razorpay', paymentId: 'pay_one' });
});
it('never reinterprets historic providers or a different canonical capture', async () => {
  provider = 'cashfree'; expect(await refundSource('order', 'checkout', 'pay_one')).toEqual({ provider: 'legacy' }); expect(m.payment).not.toHaveBeenCalled();
  provider = 'razorpay'; canonical = 'pay_other'; expect(await refundSource('order', 'checkout', 'pay_one')).toEqual({ provider: 'legacy' });
});
it('requires matching provider order, INR amount and captured state before refund work', async () => {
  m.payment.mockResolvedValue({ id: 'pay_one', order_id: 'order_wrong', amount: 3000, currency: 'INR', captured: true, status: 'captured' }); expect(await refundSource('order', 'checkout', 'pay_one')).toEqual({ provider: 'legacy' });
  m.payment.mockResolvedValue({ id: 'pay_one', order_id: 'order_one', amount: 2999, currency: 'INR', captured: true, status: 'captured' }); expect(await refundSource('order', 'checkout', 'pay_one')).toEqual({ provider: 'legacy' });
});
