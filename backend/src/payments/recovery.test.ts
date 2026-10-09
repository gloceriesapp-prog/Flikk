import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), create: vi.fn(), get: vi.fn(), payments: vi.fn(), settle: vi.fn(), update: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { rpc: mocks.rpc, from: mocks.from } }));
vi.mock('./cashfreeClient.js', async (load) => ({ ...await load<typeof import('./cashfreeClient.js')>(),
  createCfOrder: mocks.create, getCfOrder: mocks.get, getCfOrderPayments: mocks.payments }));
vi.mock('./settleCheckoutPayment.js', () => ({ settleCheckoutPayment: mocks.settle }));
import { CashfreeError } from './cashfreeClient.js';
import { paymentTarget, ensureProviderOrder, requirePaymentRetrySafe, claimPayment, reconcileProvider, getPaymentRecovery, upiClaimInFlight, UPI_CLAIM_STALE_MS } from './recovery.js';
const id = '00000000-0000-4000-8000-000000000100';
const cfId = 'gl_00000000000040008000000000000100';
const target = paymentTarget({ orderId: id });
const provider = { order_id: cfId, order_currency: 'INR', order_amount: 30, order_status: 'ACTIVE', payment_session_id: 'session_1', order_tags: { gloceries_order_id: id } };
const pay = (status: string, extra: Record<string, unknown> = {}) => ({ cf_payment_id: `cf_${status}`, order_id: cfId, payment_currency: 'INR', payment_amount: 30, payment_status: status, ...extra });
const claim = (claimed: boolean, providerOrderId: string | null) => mocks.rpc.mockResolvedValue({ data: { claimed, total: 30, session: { provider_order_id: providerOrderId } }, error: null });
beforeEach(() => {
  vi.resetAllMocks();
  claim(false, cfId);
  const query = { update: mocks.update, select: vi.fn(() => query), eq: vi.fn(() => query), order: vi.fn(() => query), limit: vi.fn(() => query),
    maybeSingle: async () => ({ data: { phone: '+91 98765 43210', reservation_expires_at: new Date(Date.now() + 35 * 60_000).toISOString(), placed_at: new Date().toISOString() }, error: null }),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve) };
  mocks.update.mockReturnValue(query); mocks.from.mockReturnValue(query);
  mocks.get.mockResolvedValue(provider); mocks.create.mockResolvedValue(provider);
  mocks.payments.mockResolvedValue([]); mocks.settle.mockResolvedValue(true);
});
it('reuses the existing provider order instead of minting another on retry', async () => {
  expect(await ensureProviderOrder(target, 'customer')).toEqual(provider);
  expect(mocks.create).not.toHaveBeenCalled();
});
it('recovers a provider order by its deterministic id after a lost creation response', async () => {
  claim(false, null);
  expect(await ensureProviderOrder(target, 'customer')).toEqual(provider);
  expect(mocks.get).toHaveBeenCalledWith(cfId);
  expect(mocks.update).toHaveBeenCalledWith({ provider_order_id: cfId });
  expect(mocks.create).not.toHaveBeenCalled();
});
it('does not retry an ambiguous external creation when lookup finds nothing', async () => {
  claim(false, null); mocks.get.mockResolvedValue(null);
  await expect(ensureProviderOrder(target, 'customer')).rejects.toMatchObject({ code: 'PAYMENT_RECONCILING' });
  expect(mocks.create).not.toHaveBeenCalled();
});
it('creates only after winning the durable claim, with paise converted to rupees and tags', async () => {
  claim(true, null); mocks.get.mockResolvedValue(null);
  await ensureProviderOrder(target, 'customer');
  expect(mocks.create).toHaveBeenCalledTimes(1);
  const expiry = mocks.create.mock.calls[0][0].expiresAt.getTime();
  expect(expiry - Date.now()).toBeGreaterThan(34 * 60_000);
  expect(expiry - Date.now()).toBeLessThanOrEqual(35 * 60_000);
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ orderId: cfId, amountPaise: 3000, customerPhone: '9876543210', tags: { gloceries_order_id: id } }));
  expect(mocks.update).toHaveBeenCalledWith({ provider_order_id: cfId });
});
it('adopts the order when Cashfree reports the id already exists', async () => {
  claim(true, null); mocks.get.mockResolvedValueOnce(null).mockResolvedValueOnce(provider);
  mocks.create.mockRejectedValue(new CashfreeError(409, 'order_already_exists'));
  expect(await ensureProviderOrder(target, 'customer')).toEqual(provider);
});
it('does not clear the claim after a provider timeout', async () => {
  claim(true, null); mocks.get.mockResolvedValue(null);
  mocks.create.mockRejectedValue(new CashfreeError(0));
  await expect(ensureProviderOrder(target, 'customer')).rejects.toMatchObject({ providerStatus: 0 });
  expect(mocks.update).not.toHaveBeenCalled();
});
it('refuses a provider order whose amount drifted from the saved total', async () => {
  mocks.get.mockResolvedValue({ ...provider, order_amount: 29 });
  await expect(ensureProviderOrder(target, 'customer')).rejects.toMatchObject({ code: 'PAYMENT_REVIEW_REQUIRED' });
});
it('refuses legacy (non-Cashfree) sessions', async () => {
  claim(false, 'order_rzp_legacy');
  await expect(ensureProviderOrder(target, 'customer')).rejects.toMatchObject({ code: 'PAYMENT_REVIEW_REQUIRED' });
});
it('settles a SUCCESS payment before another payment launch', async () => {
  mocks.payments.mockResolvedValue([pay('FAILED'), pay('SUCCESS')]);
  await expect(requirePaymentRetrySafe(target, cfId, 30)).rejects.toMatchObject({ code: 'PAYMENT_RECONCILING' });
  expect(mocks.settle).toHaveBeenCalledWith({ orderId: id }, 'cf_SUCCESS');
});
it('blocks a second payment while an attempt is still pending, allows one after failures', async () => {
  mocks.payments.mockResolvedValue([pay('PENDING')]);
  await expect(requirePaymentRetrySafe(target, cfId, 30)).rejects.toMatchObject({ code: 'PAYMENT_RECONCILING' });
  mocks.payments.mockResolvedValue([pay('FAILED'), pay('USER_DROPPED')]);
  await expect(requirePaymentRetrySafe(target, cfId, 30)).resolves.toBeUndefined();
  expect(mocks.settle).not.toHaveBeenCalled();
});
it('refuses amount/order mismatches without marking the order paid', async () => {
  for (const wrong of [pay('SUCCESS', { payment_amount: 29.99 }), pay('SUCCESS', { order_id: 'gl_other' }), pay('SUCCESS', { payment_currency: 'USD' })]) {
    mocks.payments.mockResolvedValue([wrong]);
    await expect(reconcileProvider(target, cfId, 30)).rejects.toMatchObject({ code: 'PAYMENT_REVIEW_REQUIRED' });
  }
  expect(mocks.settle).not.toHaveBeenCalled();
});
it('rejects paid, expired, cancelled, legacy or COD payment targets through the transactional gate', async () => {
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
    provider_payment_id: null, placed_at: new Date().toISOString() };
  let reads = 0;
  mocks.from.mockImplementation((table: string) => {
    const query = { select: vi.fn(() => query), eq: vi.fn(() => query),
      maybeSingle: async () => ({ data: { provider_order_id: cfId }, error: null }),
      single: async () => ({ data: table === 'orders' && reads++ === 0 ? initial : { ...initial, provider_payment_id: 'captured_during_read' }, error: null }) };
    return query;
  });
  const response = { setHeader: vi.fn(), json: vi.fn() }; const next = vi.fn();
  await getPaymentRecovery({ body: { orderId: id }, user: { id: 'customer' } } as never, response as never, next);
  expect(next).not.toHaveBeenCalled();
  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ state: 'paid', record: expect.objectContaining({ provider_payment_id: 'captured_during_read' }) }));
  expect(mocks.payments).not.toHaveBeenCalled();
});
it('treats a UPI creating claim as in flight only until it is stale', () => {
  const now = Date.parse('2026-10-07T12:00:00Z');
  const at = (ms: number) => new Date(now - ms).toISOString();
  expect(upiClaimInFlight({ upi_state: 'creating', upi_claimed_at: at(10_000) }, now)).toBe(true);
  expect(upiClaimInFlight({ upi_state: 'creating', upi_claimed_at: at(UPI_CLAIM_STALE_MS + 1) }, now)).toBe(false);
  // Claims from before migration 106 carry no timestamp: stale.
  expect(upiClaimInFlight({ upi_state: 'creating', upi_claimed_at: null }, now)).toBe(false);
  expect(upiClaimInFlight({ upi_state: 'ready', upi_claimed_at: at(0) }, now)).toBe(false);
  expect(upiClaimInFlight({ upi_state: null }, now)).toBe(false);
});

it('fails closed for a missing reservation snapshot before provider creation', async () => {
  claim(true, null); mocks.get.mockResolvedValue(null);
  const query = { select: () => query, eq: () => query, order: () => query, limit: () => query,
    maybeSingle: async () => ({ data: { phone: '9876543210', placed_at: new Date().toISOString() }, error: null }) };
  mocks.from.mockReturnValue(query);
  await expect(ensureProviderOrder(target, 'customer')).rejects.toMatchObject({ code: 'PAYMENT_NOT_PAYABLE' });
  expect(mocks.create).not.toHaveBeenCalled();
});
