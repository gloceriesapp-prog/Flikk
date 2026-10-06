import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), refund: vi.fn(), update: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { rpc: mocks.rpc, from: mocks.from } }));
vi.mock('./refundPayment.js', () => ({ refundPayment: mocks.refund }));
import { settleCheckoutPayment } from './settleCheckoutPayment.js';
beforeEach(() => {
  vi.clearAllMocks(); mocks.rpc.mockResolvedValue({ data: { accepted: true, total: 120 }, error: null });
  mocks.refund.mockResolvedValue({ status: 'processing', razorpayRefundId: 'refund' });
  const query = { update: mocks.update, eq: vi.fn(() => query), neq: async () => ({ error: null }) };
  mocks.update.mockReturnValue(query); mocks.from.mockReturnValue(query);
});
it('does not refund an on-time payment committed by the transactional RPC', async () => {
  expect(await settleCheckoutPayment({ orderId: 'order' }, 'payment')).toBe(true);
  expect(mocks.rpc).toHaveBeenCalledWith('settle_checkout_payment', { p_order_id: 'order', p_trip_id: null, p_payment_id: 'payment' });
  expect(mocks.refund).not.toHaveBeenCalled();
});
it('durably queues a trip refund when payment arrives after inventory was released', async () => {
  mocks.rpc.mockResolvedValue({ data: { accepted: false, total: 120 }, error: null });
  expect(await settleCheckoutPayment({ tripId: 'trip' }, 'late-payment')).toBe(false);
  expect(mocks.rpc).toHaveBeenCalledWith('enqueue_trip_refund', { p_trip_id: 'trip' });
  expect(mocks.refund).not.toHaveBeenCalled();
});
it('leaves rejected single-order capture to the atomic refund-intent trigger', async () => {
  mocks.rpc.mockResolvedValue({ data: { accepted: false, total: 120 }, error: null });
  expect(await settleCheckoutPayment({ orderId: 'order' }, 'late-payment')).toBe(false);
  expect(mocks.refund).not.toHaveBeenCalled();
  expect(mocks.from).not.toHaveBeenCalled();
});
