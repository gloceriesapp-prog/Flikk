import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ session: vi.fn(), update: vi.fn(), validate: vi.fn(), settle: vi.fn(), config: { configured: true } }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: () => {
  const query = { select: () => query, eq: () => query, maybeSingle: mocks.session,
    update: (patch: unknown) => { mocks.update(patch); return query; }, then: (r: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(r) };
  return query;
} } }));
vi.mock('./cashfreeClient.js', async (load) => ({
  ...await load<typeof import('./cashfreeClient.js')>(),
  get paymentsConfigured() { return mocks.config.configured; },
}));
vi.mock('./validateCapturedPayment.js', () => ({ validateCapturedPayment: mocks.validate }));
vi.mock('./settleCheckoutPayment.js', () => ({ settleCheckoutPayment: mocks.settle }));
import { handleWebhook } from './webhook.js';

function signed(body: Record<string, unknown>, opts: { ts?: number; tamper?: boolean } = {}) {
  const rawBody = JSON.stringify(body); const ts = String(opts.ts ?? Date.now());
  const signature = crypto.createHmac('sha256', 'test-webhook-secret').update(ts + rawBody).digest('base64');
  return { body, rawBody: opts.tamper ? rawBody.replace('100', '1') : rawBody, headers: { 'x-webhook-signature': signature, 'x-webhook-timestamp': ts } } as unknown as Request;
}
const success = (order: Record<string, unknown> = {}) => signed({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: {
  order: { order_id: 'gl_abc', order_amount: 100, order_tags: null, ...order },
  payment: { cf_payment_id: 1453002795, payment_status: 'SUCCESS', payment_amount: 100 } } });
async function run(req: Request) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  await handleWebhook(req, res, next);
  return { res, next };
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.validate.mockReset(); mocks.validate.mockResolvedValue(10000); mocks.config.configured = true;
  mocks.session.mockResolvedValue({ data: null, error: null });
});

it('settles a verified payment via the stored Cashfree order id, re-validating with the provider', async () => {
  mocks.session.mockResolvedValue({ data: { kind: 'order', target_id: 'local-order' }, error: null });
  const { res, next } = await run(success());
  expect(next).not.toHaveBeenCalled();
  expect(mocks.validate).toHaveBeenCalledWith({ orderId: 'local-order' }, '1453002795', 'gl_abc');
  expect(mocks.settle).toHaveBeenCalledWith({ orderId: 'local-order' }, '1453002795', 10000, 'INR');
  expect(res.status).toHaveBeenCalledWith(200);
});
it('falls back to order_tags when the session write was lost', async () => {
  await run(success({ order_tags: { gloceries_trip_id: 'local-trip' } }));
  expect(mocks.settle).toHaveBeenCalledWith({ tripId: 'local-trip' }, '1453002795', 10000, 'INR');
});
it('acknowledges payments that belong to no checkout without settling', async () => {
  const { res } = await run(success());
  expect(mocks.settle).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(200);
});
it('never settles when provider validation rejects the amount', async () => {
  mocks.session.mockResolvedValue({ data: { kind: 'order', target_id: 'local-order' }, error: null });
  mocks.validate.mockRejectedValue(Object.assign(new Error('mismatch'), { code: 'PAYMENT_MISMATCH' }));
  const { next } = await run(success());
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'PAYMENT_MISMATCH' }));
  expect(mocks.settle).not.toHaveBeenCalled();
});
it('rejects tampered bodies and stale timestamps before any write', async () => {
  for (const req of [signed({ type: 'PAYMENT_SUCCESS_WEBHOOK', amount: 100 }, { tamper: true }), signed({ type: 'PAYMENT_SUCCESS_WEBHOOK' }, { ts: Date.now() - 6 * 60_000 })]) {
    const { next } = await run(req);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401, code: 'INVALID_SIGNATURE' }));
  }
  expect(mocks.session).not.toHaveBeenCalled();
  expect(mocks.settle).not.toHaveBeenCalled();
});
it('settles the same webhook twice through the idempotent RPC only', async () => {
  mocks.session.mockResolvedValue({ data: { kind: 'order', target_id: 'local-order' }, error: null });
  const req = success();
  await run(req); await run(req);
  expect(mocks.settle).toHaveBeenNthCalledWith(2, { orderId: 'local-order' }, '1453002795', 10000, 'INR');
});
it('applies final refund statuses only to rows still processing', async () => {
  await run(signed({ type: 'REFUND_STATUS_WEBHOOK', data: { refund: { refund_id: 'rf_1', refund_status: 'SUCCESS' } } }));
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ refund_status: 'completed' }));
  await run(signed({ type: 'REFUND_STATUS_WEBHOOK', data: { refund: { refund_id: 'rf_1', refund_status: 'CANCELLED' } } }));
  expect(mocks.update).toHaveBeenLastCalledWith({ refund_status: 'failed' });
  mocks.update.mockClear();
  await run(signed({ type: 'REFUND_STATUS_WEBHOOK', data: { refund: { refund_id: 'rf_1', refund_status: 'PENDING' } } }));
  expect(mocks.update).not.toHaveBeenCalled();
});
it('rejects every webhook with 503 while Cashfree is not configured', async () => {
  mocks.config.configured = false;
  const { next } = await run(success());
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'PAYMENTS_NOT_CONFIGURED' }));
  expect(mocks.settle).not.toHaveBeenCalled();
});
