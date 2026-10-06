import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), create: vi.fn(), fetch: vi.fn(), all: vi.fn(), payments: vi.fn(), settle: vi.fn(), update: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { rpc: mocks.rpc, from: mocks.from } }));
vi.mock('./razorpayClient.js', () => ({ razorpay: { orders: { create: mocks.create, fetch: mocks.fetch, all: mocks.all, fetchPayments: mocks.payments } } }));
vi.mock('./settleCheckoutPayment.js', () => ({ settleCheckoutPayment: mocks.settle }));
import { paymentTarget, ensureProviderOrder, requirePaymentRetrySafe, claimPayment, reconcileProvider, getPaymentRecovery } from './recovery.js';
const id = '00000000-0000-4000-8000-000000000100';
const target = paymentTarget({ orderId: id });
const provider = { id: 'order_provider', receipt: id, currency: 'INR', amount: 3000 };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ data: { claimed: false, total: 30, session: { provider_order_id: 'order_provider' } }, error: null });
  const query = { update: mocks.update, eq: vi.fn(() => query), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve) };
  mocks.update.mockReturnValue(query); mocks.from.mockReturnValue(query);
  mocks.fetch.mockResolvedValue(provider); mocks.all.mockResolvedValue({ items: [] }); mocks.create.mockResolvedValue(provider);
  mocks.payments.mockResolvedValue({ items: [] }); mocks.settle.mockResolvedValue(true);
});
it('reuses the existing provider order instead of minting another on retry', async () => {
  expect(await ensureProviderOrder(target, 'customer')).toEqual(provider);
  expect(mocks.create).not.toHaveBeenCalled();
});
it('recovers a provider order by receipt after a lost creation response', async () => {
  mocks.rpc.mockResolvedValue({ data: { claimed: false, total: 30, session: { provider_order_id: null } }, error: null });
  mocks.all.mockResolvedValue({ items: [provider] });
  expect(await ensureProviderOrder(target, 'customer')).toEqual(provider);
  expect(mocks.update).toHaveBeenCalledWith({ provider_order_id: 'order_provider' });
  expect(mocks.create).not.toHaveBeenCalled();
});
it('does not retry an ambiguous external creation when receipt lookup finds nothing', async () => {
  mocks.rpc.mockResolvedValue({ data: { claimed: false, total: 30, session: { provider_order_id: null } }, error: null });
  await expect(ensureProviderOrder(target, 'customer')).rejects.toMatchObject({ code: 'PAYMENT_RECONCILING' });
  expect(mocks.create).not.toHaveBeenCalled();
});
it('creates only after winning the durable database claim', async () => {
  mocks.rpc.mockResolvedValue({ data: { claimed: true, total: 30, session: { provider_order_id: null } }, error: null });
  await ensureProviderOrder(target, 'customer');
  expect(mocks.create).toHaveBeenCalledTimes(1);
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 3000, receipt: id }));
});
it('does not clear the claim after a provider timeout', async () => {
  mocks.rpc.mockResolvedValue({ data: { claimed: true, total: 30, session: { provider_order_id: null } }, error: null });
  mocks.create.mockRejectedValue(new Error('lost response'));
  await expect(ensureProviderOrder(target, 'customer')).rejects.toThrow('lost response');
  expect(mocks.update).not.toHaveBeenCalled();
});
it('reconciles captured payments before another payment launch', async () => {
  mocks.payments.mockResolvedValue({ items: [{ id: 'pay_captured', order_id: 'order_provider', currency: 'INR', amount: 3000, status: 'captured' }] });
  await expect(requirePaymentRetrySafe(target, 'order_provider', 30)).rejects.toMatchObject({ code: 'PAYMENT_RECONCILING' });
  expect(mocks.settle).toHaveBeenCalledWith({ orderId: id }, 'pay_captured');
});
it('blocks a second payment while the provider still reports authorization', async () => {
  mocks.payments.mockResolvedValue({ items: [{ id: 'pay_authorized', order_id: 'order_provider', currency: 'INR', amount: 3000, status: 'authorized' }] });
  await expect(requirePaymentRetrySafe(target, 'order_provider', 30)).rejects.toMatchObject({ code: 'PAYMENT_RECONCILING' });
  expect(mocks.settle).not.toHaveBeenCalled();
});
it('refuses payment mismatches without marking the order paid', async () => {
  mocks.payments.mockResolvedValue({ items: [{ id: 'wrong', order_id: 'other', currency: 'INR', amount: 3000, status: 'captured' }] });
  await expect(reconcileProvider(target, 'order_provider', 30)).rejects.toMatchObject({ code: 'PAYMENT_REVIEW_REQUIRED' });
  expect(mocks.settle).not.toHaveBeenCalled();
});
it('rejects paid, expired, cancelled or COD payment targets through the transactional gate', async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code: 'P0410' } });
  await expect(claimPayment(target, 'customer', 'order')).rejects.toMatchObject({ code: 'PAYMENT_NOT_PAYABLE' });
});
it('does not accept ambiguous single-order and trip targets', () => {
  expect(() => paymentTarget({ orderId: id, tripId: id })).toThrow();
  expect(() => paymentTarget({})).toThrow();
});

it('uses a webhook result that arrives during reconciliation instead of returning cached pending state', async () => {
  mocks.rpc.mockResolvedValue({ data: { claimed: false, state: 'pending' }, error: null });
  const initial = { id, customer_id: 'customer', total: 30, status: 'placed', payment_method: 'online',
    razorpay_payment_id: null, placed_at: new Date().toISOString() };
  let reads = 0;
  mocks.from.mockImplementation((table: string) => {
    const query = { select: vi.fn(() => query), eq: vi.fn(() => query),
      maybeSingle: async () => ({ data: { provider_order_id: 'order_provider' }, error: null }),
      single: async () => ({ data: table === 'orders' && reads++ === 0 ? initial : { ...initial, razorpay_payment_id: 'captured_during_read' }, error: null }) };
    return query;
  });
  const response = { setHeader: vi.fn(), json: vi.fn() }; const next = vi.fn();
  await getPaymentRecovery({ body: { orderId: id }, user: { id: 'customer' } } as never, response as never, next);
  expect(next).not.toHaveBeenCalled();
  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ state: 'paid' }));
  expect(mocks.payments).not.toHaveBeenCalled();
});
