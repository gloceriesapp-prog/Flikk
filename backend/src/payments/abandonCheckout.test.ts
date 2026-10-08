import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), payments: vi.fn(), get: vi.fn(), terminate: vi.fn(), settle: vi.fn(), push: vi.fn(), record: vi.fn(), session: vi.fn(), available: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { rpc: mocks.rpc, from: mocks.from } }));
vi.mock('./cashfreeClient.js', async (load) => ({ ...await load<typeof import('./cashfreeClient.js')>(), paymentsConfigured: true,
  getCfOrderPayments: mocks.payments, getCfOrder: mocks.get, terminateCfOrder: mocks.terminate }));
vi.mock('./settleCheckoutPayment.js', () => ({ settleCheckoutPayment: mocks.settle }));
vi.mock('./newOrderPush.js', () => ({ notifyStoresOfNewOrder: mocks.push }));
vi.mock('./availability.js', () => ({ assertPaymentMethodAvailable: mocks.available }));
import { abandonCheckout } from './abandonCheckout.js';

const id = '00000000-0000-4000-8000-000000000200';
const cfId = 'gl_00000000000040008000000000000200';
const payment = (status: string) => ({ cf_payment_id: `cf_${status}`, order_id: cfId, payment_currency: 'INR', payment_amount: 123.45, payment_status: status });
async function call(action: string, body: Record<string, unknown> = { orderId: id }) {
  const res = { setHeader: vi.fn(), json: vi.fn() }; const next = vi.fn();
  await abandonCheckout({ body: { ...body, action }, user: { id: 'customer' } } as never, res as never, next);
  return { json: res.json.mock.calls[0]?.[0], error: next.mock.calls[0]?.[0] };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockImplementation((table: string) => {
    const query = { select: vi.fn(() => query), eq: vi.fn(() => query),
      maybeSingle: () => (table === 'checkout_payment_sessions' ? mocks.session() : mocks.record()) };
    return query;
  });
  mocks.record.mockResolvedValue({ data: { id, total: 123.45, provider_payment_id: null }, error: null });
  mocks.session.mockResolvedValue({ data: { provider_order_id: cfId }, error: null });
  mocks.payments.mockResolvedValue([]);
  mocks.terminate.mockResolvedValue('TERMINATED');
  mocks.rpc.mockResolvedValue({ data: {}, error: null });
  mocks.settle.mockResolvedValue(true);
  mocks.available.mockResolvedValue(undefined);
});

it('terminates the Cashfree order, then cancels when the customer backed out of the UPI app', async () => {
  mocks.payments.mockResolvedValue([payment('PENDING'), payment('USER_DROPPED')]);
  const { json, error } = await call('cancel');
  expect(error).toBeUndefined();
  expect(json).toEqual({ target: { orderId: id }, state: 'cancelled' });
  expect(mocks.rpc).toHaveBeenCalledWith('abandon_unpaid_checkout', expect.objectContaining({ p_kind: 'order', p_target_id: id, p_action: 'cancel' }));
  expect(mocks.push).not.toHaveBeenCalled();
  expect(mocks.terminate).toHaveBeenCalledWith(cfId);
  expect(mocks.terminate.mock.invocationCallOrder[0]).toBeLessThan(mocks.payments.mock.invocationCallOrder[0]);
});
it('switches a trip to COD and announces it to the stores', async () => {
  const { json } = await call('cod', { tripId: id });
  expect(json.state).toBe('paid');
  expect(mocks.rpc).toHaveBeenCalledWith('abandon_unpaid_checkout', expect.objectContaining({ p_kind: 'trip', p_action: 'cod' }));
  expect(mocks.push).toHaveBeenCalledWith({ tripId: id });
});
it('settles a late SUCCESS instead of cancelling or switching it', async () => {
  mocks.payments.mockResolvedValue([payment('SUCCESS')]);
  const { error } = await call('cod');
  expect(error).toMatchObject({ code: 'PAYMENT_CAPTURED' });
  expect(mocks.settle).toHaveBeenCalledWith({ orderId: id }, 'cf_SUCCESS');
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('still abandons when termination fails; a later SUCCESS takes the settle-then-refund path', async () => {
  mocks.terminate.mockResolvedValue(null);
  mocks.payments.mockResolvedValue([payment('PENDING')]);
  expect((await call('cancel')).json).toEqual({ target: { orderId: id }, state: 'cancelled' });
});
it('refuses a mismatched provider amount', async () => {
  mocks.payments.mockResolvedValue([{ ...payment('PENDING'), payment_amount: 9.99 }]);
  expect((await call('cancel')).error).toMatchObject({ code: 'PAYMENT_REVIEW_REQUIRED' });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('maps the transactional gate: already paid/cancelled, and closed COD window', async () => {
  mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: 'P0410' } });
  expect((await call('cancel')).error).toMatchObject({ code: 'CHECKOUT_NOT_AWAITING_PAYMENT', status: 409 });
  mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: 'P0411' } });
  expect((await call('cod')).error).toMatchObject({ code: 'CHECKOUT_WINDOW_CLOSED' });
  expect(mocks.push).not.toHaveBeenCalled();
});
it('rejects unknown actions and foreign orders', async () => {
  expect((await call('refund')).error).toMatchObject({ code: 'INVALID_ABANDON_ACTION' });
  mocks.record.mockResolvedValue({ data: null, error: null });
  expect((await call('cancel')).error).toMatchObject({ code: 'ORDER_NOT_FOUND' });
});
it('skips the provider read once the checkout already has a recorded payment', async () => {
  mocks.record.mockResolvedValue({ data: { id, total: 123.45, provider_payment_id: 'pay_x' }, error: null });
  mocks.rpc.mockResolvedValue({ data: null, error: { code: 'P0410' } });
  expect((await call('cancel')).error).toMatchObject({ code: 'CHECKOUT_NOT_AWAITING_PAYMENT' });
  expect(mocks.payments).not.toHaveBeenCalled();
});

it('refuses to switch to cash when admin has turned COD off', async () => {
  const { AppError } = await import('../lib/errors.js');
  mocks.available.mockRejectedValue(new AppError(409, 'COD_UNAVAILABLE', 'Cash on delivery is not available right now.'));
  const { json, error } = await call('cod');
  expect(json).toBeUndefined();
  expect(error).toMatchObject({ code: 'COD_UNAVAILABLE' });
  expect(mocks.available).toHaveBeenCalledWith('cod');
  expect(mocks.rpc).not.toHaveBeenCalled();
});
