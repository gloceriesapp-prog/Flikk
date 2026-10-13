import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), refund: vi.fn(), update: vi.fn(), push: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { rpc: mocks.rpc, from: mocks.from } }));
vi.mock('./refundPayment.js', () => ({ refundPayment: mocks.refund }));
vi.mock('./newOrderPush.js', () => ({ notifyStoresOfNewOrder: mocks.push }));
import { settleCheckoutPayment } from './settleCheckoutPayment.js';
beforeEach(() => {
  vi.clearAllMocks(); mocks.rpc.mockResolvedValue({ data: { accepted: true, total: 120 }, error: null });
  mocks.refund.mockResolvedValue({ status: 'processing', providerRefundId: 'refund' });
  const query = { update: mocks.update, eq: vi.fn(() => query), neq: async () => ({ error: null }) };
  mocks.update.mockReturnValue(query); mocks.from.mockReturnValue(query);
});
it('does not refund an on-time payment committed by the transactional RPC', async () => {
  expect(await settleCheckoutPayment({ orderId: 'order' }, 'payment', 12000, 'INR', 'order_one')).toBe(true);
  expect(mocks.rpc).toHaveBeenCalledWith('settle_checkout_payment', { p_order_id: 'order', p_trip_id: null, p_payment_id: 'payment', p_expected_paise: 12000, p_currency: 'INR', p_provider_order_id: 'order_one', p_provider: 'razorpay' });
  expect(mocks.refund).not.toHaveBeenCalled();
});
it('threads the captured amount and currency into the settlement write boundary', async () => {
  await settleCheckoutPayment({ tripId: 'trip' }, 'payment', 55500, 'INR', 'order_one');
  expect(mocks.rpc).toHaveBeenCalledWith('settle_checkout_payment', { p_order_id: null, p_trip_id: 'trip', p_payment_id: 'payment', p_expected_paise: 55500, p_currency: 'INR', p_provider_order_id: 'order_one', p_provider: 'razorpay' });
});
it('propagates the RPC amount-mismatch rejection instead of settling', async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: new Error('settle_checkout_payment amount mismatch: captured 9900 paise <> order total 12000 paise') });
  await expect(settleCheckoutPayment({ orderId: 'order' }, 'payment', 9900, 'INR', 'order_one')).rejects.toThrow(/amount mismatch/);
  expect(mocks.refund).not.toHaveBeenCalled();
  expect(mocks.push).not.toHaveBeenCalled();
});
it('durably queues a trip refund when payment arrives after inventory was released', async () => {
  mocks.rpc.mockResolvedValue({ data: { accepted: false, total: 120 }, error: null });
  expect(await settleCheckoutPayment({ tripId: 'trip' }, 'late-payment', 12000, 'INR', 'order_one')).toBe(false);
  expect(mocks.rpc).toHaveBeenCalledWith('enqueue_trip_refund', { p_trip_id: 'trip' });
  expect(mocks.refund).not.toHaveBeenCalled();
});
it('leaves rejected single-order capture to the atomic refund-intent trigger', async () => {
  mocks.rpc.mockResolvedValue({ data: { accepted: false, total: 120 }, error: null });
  expect(await settleCheckoutPayment({ orderId: 'order' }, 'late-payment', 12000, 'INR', 'order_one')).toBe(false);
  expect(mocks.refund).not.toHaveBeenCalled();
  expect(mocks.from).not.toHaveBeenCalled();
});
it('pushes the store exactly once, when this call recorded the payment', async () => {
  mocks.rpc.mockResolvedValueOnce({ data: { accepted: true, total: 120, settled_now: true }, error: null })
    .mockResolvedValueOnce({ data: { accepted: true, total: 120, settled_now: false }, error: null });
  await settleCheckoutPayment({ orderId: 'order' }, 'payment', 12000, 'INR', 'order_one');
  await settleCheckoutPayment({ orderId: 'order' }, 'payment', 12000, 'INR', 'order_one');
  expect(mocks.push).toHaveBeenCalledTimes(1);
  expect(mocks.push).toHaveBeenCalledWith({ orderId: 'order' });
});
it('never pushes a store for a rejected late capture', async () => {
  mocks.rpc.mockResolvedValue({ data: { accepted: false, total: 120, settled_now: true }, error: null });
  await settleCheckoutPayment({ orderId: 'order' }, 'late-payment', 12000, 'INR', 'order_one');
  expect(mocks.push).not.toHaveBeenCalled();
});

it('durably records an extra capture without overwriting payment or queuing ordinary refunds', async () => {
  mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: 'P0001', message: 'Payment conflict' } }).mockResolvedValueOnce({ data: 'incident', error: null });
  expect(await settleCheckoutPayment({ orderId: 'order' }, 'pay_extra', 12000, 'INR', 'order_one')).toBe(false);
  expect(mocks.rpc).toHaveBeenCalledWith('record_checkout_payment_incident', expect.objectContaining({ p_payment_id: 'pay_extra', p_provider_order_id: 'order_one', p_amount_paise: 12000, p_reason: 'extra_capture' }));
  expect(mocks.push).not.toHaveBeenCalled(); expect(mocks.rpc.mock.calls.some(([name]) => name === 'enqueue_trip_refund')).toBe(false);
});
it('retries rather than acknowledging an extra capture when incident persistence fails', async () => {
  mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: 'P0001', message: 'Payment conflict' } }).mockResolvedValueOnce({ data: null, error: new Error('database down') });
  await expect(settleCheckoutPayment({ orderId: 'order' }, 'pay_extra', 12000, 'INR', 'order_one')).rejects.toThrow('database down');
});
