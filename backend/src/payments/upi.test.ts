import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), verify: vi.fn(), configured: { value: false }, pay: vi.fn(), ensure: vi.fn(), retry: vi.fn(), claim: vi.fn(), save: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('./cashfreeClient.js', async (load) => ({ ...await load<typeof import('./cashfreeClient.js')>(),
  verificationConfigured: () => mocks.configured.value, verifyCfVpa: mocks.verify, payCfOrder: mocks.pay }));
vi.mock('./recovery.js', async (load) => ({ ...await load<typeof import('./recovery.js')>(),
  ensureProviderOrder: mocks.ensure, requirePaymentRetrySafe: mocks.retry, claimPayment: mocks.claim, saveSession: mocks.save }));
import { createUpiCollect, createUpiIntent, upiValidateBudget, validateUpiId } from './upi.js';
import { CashfreeError } from './cashfreeClient.js';

const id = '00000000-0000-4000-8000-000000000600';
const order = { order_id: 'gl_x', order_amount: 30, payment_session_id: 'session_1' };
function call(handler: (req: never, res: never, next: never) => unknown, body: Record<string, unknown>) {
  const res = { json: vi.fn(), status: vi.fn().mockReturnThis(), set: vi.fn(), setHeader: vi.fn() }; const next = vi.fn();
  return Promise.resolve(handler({ body, user: { id: 'customer' }, ip: '1.2.3.4' } as never, res as never, next as never)).then(() => ({ json: res.json.mock.calls[0]?.[0], error: next.mock.calls[0]?.[0], next, res }));
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.configured.value = false;
  mocks.ensure.mockResolvedValue(order); mocks.retry.mockResolvedValue(undefined);
  mocks.claim.mockResolvedValue({ claimed: true, session: { upi_link: null, upi_payment_id: null } });
  mocks.pay.mockResolvedValue({ cf_payment_id: 991, channel: 'link', action: 'custom', data: { payload: { default: 'upi://pay?x', gpay: 'tez://upi/pay?x', phonepe: 'phonepe://pay?x' } } });
});

it('validates UPI ID format without a provider call when verification is unconfigured', async () => {
  expect((await call(validateUpiId, { vpa: 'ravi.k@okhdfcbank' })).json).toEqual({ valid: true, name: null });
  for (const vpa of ['ravi', '@ybl', 'a@b', 'ra vi@ybl', 'x@1bank', 42]) expect((await call(validateUpiId, { vpa })).json).toEqual({ valid: false, name: null });
  expect(mocks.verify).not.toHaveBeenCalled();
});
it('looks up the holder name when verification is configured, and degrades to format-only on outage', async () => {
  mocks.configured.value = true;
  mocks.verify.mockResolvedValueOnce({ valid: true, name: 'RAVI KUMAR' }).mockResolvedValueOnce({ valid: false, name: null }).mockRejectedValueOnce(new Error('down'));
  expect((await call(validateUpiId, { vpa: 'ravi@ybl' })).json).toEqual({ valid: true, name: 'RAVI KUMAR' });
  expect((await call(validateUpiId, { vpa: 'nobody@ybl' })).json).toEqual({ valid: false, name: null });
  expect((await call(validateUpiId, { vpa: 'ravi@ybl' })).json).toEqual({ valid: true, name: null });
  expect((await call(validateUpiId, { vpa: 'bad' })).json).toEqual({ valid: false, name: null });
  expect(mocks.verify).toHaveBeenCalledTimes(3);
});
it('rate limits validation per user and per IP', async () => {
  mocks.rpc.mockResolvedValueOnce({ data: 0, error: null });
  expect((await call(upiValidateBudget, {})).next).toHaveBeenCalledWith();
  const buckets = mocks.rpc.mock.calls[0][1].p_buckets;
  expect(buckets.map((b: { limit: number }) => b.limit)).toEqual([5, 20]);
  expect(buckets.every((b: { key: string }) => /^[0-9a-f]{64}$/.test(b.key))).toBe(true);
  mocks.rpc.mockResolvedValueOnce({ data: 37, error: null });
  const limited = await call(upiValidateBudget, {});
  expect(limited.error).toMatchObject({ status: 429, code: 'UPI_VALIDATION_RATE_LIMITED' });
  expect(limited.res.set).toHaveBeenCalledWith('Retry-After', '37');
  mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'down' } });
  expect((await call(upiValidateBudget, {})).error).toMatchObject({ status: 503 });
});
it('returns per-app intent links and the selected app link', async () => {
  const { json } = await call(createUpiIntent, { orderId: id, app: 'phonepe', platform: 'android' });
  expect(json).toMatchObject({ providerOrderId: 'gl_x', providerPaymentId: '991', link: 'phonepe://pay?x', links: { default: 'upi://pay?x', gpay: 'tez://upi/pay?x' } });
  expect(mocks.pay).toHaveBeenCalledWith(expect.objectContaining({ paymentSessionId: 'session_1', upi: { channel: 'link' }, os: 'android' }));
  expect(mocks.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ upi_state: 'ready', upi_payment_id: '991' }));
  expect((await call(createUpiIntent, { orderId: id, app: 'amazonpay' })).json.link).toBe('upi://pay?x');
  expect((await call(createUpiIntent, { orderId: id, app: 'evilpay' })).error).toMatchObject({ code: 'INVALID_UPI_APP' });
});
it('replays stored intent links instead of starting a second UPI payment', async () => {
  mocks.claim.mockResolvedValue({ claimed: false, session: { upi_link: JSON.stringify({ default: 'upi://pay?old', gpay: 'tez://old' }), upi_payment_id: '5' } });
  const { json } = await call(createUpiIntent, { orderId: id, app: 'gpay' });
  expect(json).toMatchObject({ providerPaymentId: '5', link: 'tez://old' });
  expect(mocks.pay).not.toHaveBeenCalled();
});
it('sends a collect request only for a well-formed VPA and returns its expiry', async () => {
  mocks.pay.mockResolvedValue({ cf_payment_id: 7, channel: 'collect', action: 'custom', data: { vpa: 'ravi@ybl', expiry: '2026-10-07T18:30:00+05:30' } });
  expect((await call(createUpiCollect, { orderId: id, vpa: 'ravi@ybl' })).json).toEqual({ providerOrderId: 'gl_x', providerPaymentId: '7', vpa: 'ravi@ybl', expiresAt: '2026-10-07T18:30:00+05:30' });
  expect(mocks.pay).toHaveBeenCalledWith(expect.objectContaining({ upi: { channel: 'collect', upi_id: 'ravi@ybl', upi_expiry_minutes: 10 } }));
  expect((await call(createUpiCollect, { orderId: id, vpa: 'not-a-vpa' })).error).toMatchObject({ code: 'INVALID_VPA' });
});
const released = expect.objectContaining({ upi_state: null, upi_link: null, upi_payment_id: null });
it('releases the UPI claim when Cashfree rejects a collect, so a corrected VPA can be sent', async () => {
  mocks.pay.mockRejectedValueOnce(new CashfreeError(400, 'upi_id_invalid'));
  const failed = await call(createUpiCollect, { orderId: id, vpa: 'ravi@okaxis' });
  expect(failed.error).toMatchObject({ code: 'PAYMENT_PROVIDER_ERROR' });
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ id }), released);
  mocks.pay.mockResolvedValueOnce({ cf_payment_id: 8, channel: 'collect', action: 'custom', data: { expiry: null } });
  expect((await call(createUpiCollect, { orderId: id, vpa: 'ravi1@okaxis' })).json).toMatchObject({ providerPaymentId: '8', vpa: 'ravi1@okaxis' });
  // Each claimed attempt gets its own idempotency key: the retry is not
  // deduplicated to the rejected request.
  const keys = mocks.pay.mock.calls.map(([input]) => input.idempotencyKey);
  expect(new Set(keys).size).toBe(2);
});
it('releases the claim when Cashfree answers without a payment', async () => {
  mocks.pay.mockResolvedValueOnce({ channel: 'link', action: 'custom', data: { payload: null } });
  expect((await call(createUpiIntent, { orderId: id })).error).toMatchObject({ code: 'UPI_INTENT_FAILED' });
  mocks.pay.mockResolvedValueOnce({ channel: 'collect', action: 'custom', data: null });
  expect((await call(createUpiCollect, { orderId: id, vpa: 'ravi@ybl' })).error).toMatchObject({ code: 'UPI_COLLECT_FAILED' });
  expect(mocks.save).toHaveBeenCalledTimes(2);
  expect(mocks.save.mock.calls.every(([, patch]) => patch.upi_state === null)).toBe(true);
});
it('keeps the claim when the outcome is unknown (timeout or provider 5xx)', async () => {
  for (const status of [0, 502]) {
    mocks.pay.mockRejectedValueOnce(new CashfreeError(status));
    expect((await call(createUpiCollect, { orderId: id, vpa: 'ravi@ybl' })).error).toBeInstanceOf(CashfreeError);
  }
  expect(mocks.save).not.toHaveBeenCalled();
});
