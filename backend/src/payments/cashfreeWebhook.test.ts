import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ from: vi.fn(), verify: vi.fn(), reconcile: vi.fn(), session: { value: null as unknown } }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: m.from } }));
vi.mock('./cashfreeClient.js', async load => ({ ...await load<typeof import('./cashfreeClient.js')>(), verifyCashfreeWebhook: m.verify }));
vi.mock('./cashfreeCheckout.js', () => ({ reconcileCashfree: m.reconcile }));
import { handleCashfreeWebhook } from './cashfreeWebhook.js';
const id = '00000000-0000-4000-8000-000000000100';
const cfOrderId = 'gl_00000000000040008000000000000100';
let update: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.resetAllMocks(); m.verify.mockReturnValue(true); m.reconcile.mockResolvedValue({ state: 'paid' });
  m.session.value = { kind: 'order', target_id: id, payment_provider: 'cashfree' };
  const q = { select: vi.fn(() => q), eq: vi.fn(() => q), in: vi.fn(() => q), update: vi.fn(() => q),
    maybeSingle: vi.fn(async () => ({ data: m.session.value, error: null })), single: vi.fn(async () => ({ data: { total: 30 }, error: null })),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve) };
  update = q.update; m.from.mockReturnValue(q);
});
async function run(body: unknown, headers: Record<string, string> = { 'x-webhook-signature': 'sig', 'x-webhook-timestamp': '1790000000000' }) {
  const res = { status: vi.fn(() => res), json: vi.fn() }; const next = vi.fn();
  await handleCashfreeWebhook({ headers, rawBody: JSON.stringify(body), body } as never, res as never, next); return { res, next };
}
const success = { type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: cfOrderId }, payment: { cf_payment_id: 5114910000 } } };
it('rejects invalid signatures before touching the database', async () => {
  m.verify.mockReturnValue(false);
  const { next } = await run(success);
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_SIGNATURE' }));
  expect(m.from).not.toHaveBeenCalled(); expect(m.reconcile).not.toHaveBeenCalled();
  expect((await run(success, {})).next).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_SIGNATURE' }));
});
it('settles from a server read, never from the payload', async () => {
  const { res, next } = await run(success);
  expect(next).not.toHaveBeenCalled(); expect(res.status).toHaveBeenCalledWith(200);
  expect(m.reconcile).toHaveBeenCalledWith(expect.objectContaining({ id, kind: 'order' }), cfOrderId, 30);
});
it('acknowledges events for unknown orders without settling', async () => {
  m.session.value = null;
  const { res } = await run(success); expect(res.status).toHaveBeenCalledWith(200); expect(m.reconcile).not.toHaveBeenCalled();
  await run({ ...success, data: { order: { order_id: 'order_rzp' } } }); expect(m.reconcile).not.toHaveBeenCalled();
});
it('does not acknowledge when the server read fails, so Cashfree retries', async () => {
  m.reconcile.mockRejectedValue(new Error('provider down'));
  const { next, res } = await run(success); expect(next).toHaveBeenCalled(); expect(res.status).not.toHaveBeenCalled();
});
it('refund events only wake the durable refund job of that checkout', async () => {
  await run({ type: 'REFUND_STATUS_WEBHOOK', data: { refund: { order_id: cfOrderId, cf_payment_id: 1479874797067441664, refund_status: 'SUCCESS' } } });
  expect(update).toHaveBeenCalledWith({ next_attempt_at: expect.any(String) });
  for (const [patch] of update.mock.calls) expect(patch).not.toHaveProperty('refund_status');
  expect(m.from).toHaveBeenCalledWith('order_refund_jobs'); expect(m.from).not.toHaveBeenCalledWith('trip_refunds');
  update.mockClear(); m.session.value = null;
  await run({ type: 'REFUND_STATUS_WEBHOOK', data: { refund: { order_id: cfOrderId } } });
  expect(update).not.toHaveBeenCalled();
});
