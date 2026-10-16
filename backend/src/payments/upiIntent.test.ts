import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { env } from '../config/env.js';
const m = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), ensure: vi.fn(), payments: vi.fn(), create: vi.fn(), reconcile: vi.fn(), email: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: m.from, rpc: m.rpc } }));
vi.mock('./recovery.js', async load => ({ ...await load<typeof import('./recovery.js')>(), ensureProviderOrder: m.ensure, reconcileProvider: m.reconcile }));
vi.mock('./razorpayClient.js', async load => ({ ...await load<typeof import('./razorpayClient.js')>(), getOrderPayments: m.payments, createProviderUpiIntent: m.create }));
vi.mock('./contact.js', () => ({ readPaymentEmail: m.email }));
import { createUpiIntent } from './upiIntent.js';
import { isValidUpiIntentUrl } from './upiIntentUrl.js';
const id = '00000000-0000-4000-8000-000000000100';
const link = 'upi://pay?pa=merchant%40razorpay&tr=reference&am=123.45&cu=INR';
const deadline = '2099-01-01T00:00:00.000Z';
const session = { upi_state: null, upi_payment_id: null, upi_link: null };
const payment = { id: 'pay_one', order_id: 'order_one', amount: 12345, currency: 'INR', status: 'created', captured: false };
beforeEach(() => {
  env.razorpayEnv = 'live';
  vi.resetAllMocks();
  m.ensure.mockResolvedValue({ id: 'order_one', amount: 12345 }); m.payments.mockResolvedValue([]); m.email.mockResolvedValue('customer@example.com');
  m.create.mockResolvedValue({ razorpay_payment_id: 'pay_one', link });
  m.rpc.mockImplementation(async name => ({ data: name === 'claim_checkout_upi_intent' ? { claimed: true, session, expiresAt: deadline } : session, error: null }));
  const q = { select: vi.fn(() => q), eq: vi.fn(() => q), single: vi.fn(async () => ({ data: { phone: '+919999999999' }, error: null })),
    maybeSingle: vi.fn(async () => ({ data: { upi_state: 'ready', upi_payment_id: 'pay_one' }, error: null })) };
  m.from.mockReturnValue(q);
});
afterEach(() => { env.razorpayEnv = 'test'; });
async function run(body: Record<string, unknown> = { orderId: id }) {
  const res = { json: vi.fn(), setHeader: vi.fn() }; const next = vi.fn();
  await createUpiIntent({ user: { id: 'customer' }, body, ip: '127.0.0.1', get: () => 'Customer/1' } as never, res as never, next);
  return { res, next };
}
it('rejects test-mode UPI before provider reads, orders, claims or customer-data reads', async () => {
  env.razorpayEnv = 'test';
  const { next, res } = await run();
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'UPI_INTENT_REQUIRES_LIVE_MODE', status: 409 }));
  expect(res.json).not.toHaveBeenCalled();
  for (const operation of [m.ensure, m.payments, m.from, m.rpc, m.create, m.email]) expect(operation).not.toHaveBeenCalled();
});
it('claims before provider POST, ignores caller amount/URI and attaches only provider data', async () => {
  const { res, next } = await run({ orderId: id, amount: 1, intentUrl: 'upi://evil', appId: 'gpay' });
  expect(next).not.toHaveBeenCalled();
  expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ amountPaise: 12345, providerOrderId: 'order_one', email: 'customer@example.com', contact: '919999999999' }));
  expect(m.rpc.mock.invocationCallOrder[0]).toBeLessThan(m.create.mock.invocationCallOrder[0]);
  expect(m.rpc).toHaveBeenCalledWith('attach_checkout_upi_intent', expect.objectContaining({ p_payment_id: 'pay_one', p_link: link }));
  expect(res.json).toHaveBeenCalledWith({ provider: 'razorpay', providerOrderId: 'order_one', providerPaymentId: 'pay_one', intentUrl: link, amountPaise: 12345, currency: 'INR', expiresAt: deadline });
});
it('reuses an existing pending intent without creating or rewriting the URI', async () => {
  m.payments.mockResolvedValue([payment]);
  m.rpc.mockResolvedValue({ data: { claimed: false, session: { upi_state: 'ready', upi_payment_id: 'pay_one', upi_link: link }, expiresAt: deadline }, error: null });
  const { res, next } = await run(); expect(next).not.toHaveBeenCalled(); expect(m.create).not.toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ intentUrl: link, providerPaymentId: 'pay_one' }));
});
it('never repeats a provider POST after an uncertain or concurrent claim', async () => {
  m.rpc.mockResolvedValue({ data: { claimed: false, session: { ...session, upi_state: 'creating' }, expiresAt: deadline }, error: null });
  expect((await run()).next).toHaveBeenCalledWith(expect.objectContaining({ code: 'PAYMENT_RECONCILING' })); expect(m.create).not.toHaveBeenCalled();
});
it('blocks other pending payment flows before claiming another intent', async () => {
  m.payments.mockResolvedValue([{ ...payment, id: 'pay_other' }]);
  expect((await run()).next).toHaveBeenCalledWith(expect.objectContaining({ code: 'PAYMENT_RECONCILING' }));
  expect(m.rpc).not.toHaveBeenCalled(); expect(m.create).not.toHaveBeenCalled();
});
it('reconciles captured/authorized funds before allowing another intent', async () => {
  for (const status of ['authorized', 'captured']) {
    m.payments.mockResolvedValue([{ ...payment, status, captured: status === 'captured' }]);
    expect((await run()).next).toHaveBeenCalledWith(expect.objectContaining({ code: 'PAYMENT_RECONCILING' }));
  }
  expect(m.reconcile).toHaveBeenCalled(); expect(m.create).not.toHaveBeenCalled(); expect(m.rpc).not.toHaveBeenCalled();
});
it('retains the durable claim on provider timeout and never releases blindly', async () => {
  m.create.mockRejectedValue(new Error('timeout'));
  expect((await run()).next).toHaveBeenCalledWith(expect.any(Error));
  expect(m.rpc).toHaveBeenCalledTimes(1);
});
it('validates customer receipt email before claiming intent creation', async () => {
  m.email.mockResolvedValue(null);
  expect((await run()).next).toHaveBeenCalledWith(expect.objectContaining({ code: 'PAYMENT_EMAIL_REQUIRED' }));
  expect(m.rpc).not.toHaveBeenCalled(); expect(m.create).not.toHaveBeenCalled();
});
it('fails closed on ownership/expiry rejection from the final transactional claim', async () => {
  for (const [code, expected] of [['P0403', 'FORBIDDEN'], ['P0410', 'PAYMENT_NOT_PAYABLE']]) {
    m.rpc.mockResolvedValue({ data: null, error: { code } });
    expect((await run()).next).toHaveBeenCalledWith(expect.objectContaining({ code: expected }));
  }
  expect(m.create).not.toHaveBeenCalled();
});
it('rejects untrusted or wrong-amount provider instructions without exposing them', async () => {
  for (const uri of ['https://evil.test/', link.replace('123.45', '1'), `${link}&am=123.45`, 'upi://pay?pa=merchant&am=123.45&cu=INR']) {
    m.create.mockResolvedValue({ razorpay_payment_id: 'pay_one', link: uri });
    const { next, res } = await run(); expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'PAYMENT_PROVIDER_ERROR' })); expect(res.json).not.toHaveBeenCalled();
  }
});
it('permits replacement only after a known failed payment and an exact-ID claim', async () => {
  m.payments.mockResolvedValue([{ ...payment, status: 'failed' }]);
  m.rpc.mockResolvedValueOnce({ data: { claimed: false, session: { upi_state: 'ready', upi_payment_id: 'pay_one', upi_link: link }, expiresAt: deadline }, error: null })
    .mockResolvedValueOnce({ data: { claimed: true, session, expiresAt: deadline }, error: null }).mockResolvedValue({ data: session, error: null });
  expect((await run()).next).not.toHaveBeenCalled();
  expect(m.rpc.mock.calls[1][1]).toEqual(expect.objectContaining({ p_replace_payment_id: 'pay_one' })); expect(m.create).toHaveBeenCalledTimes(1);
});
it('recognizes canonical valid INR instructions without changing their bytes', () => {
  expect(isValidUpiIntentUrl(link, 12345)).toBe(true);
  for (const uri of [`${link}#redirect`, link.replace('INR', 'USD'), `upi://evil?${link.split('?')[1]}`, `${link}\n`, link.replace('123.45', '1e2')])
    expect(isValidUpiIntentUrl(uri, 12345)).toBe(false);
});
