import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { expect, it, vi } from 'vitest';
vi.mock('../config/env.js', () => ({ env: { cashfreeClientSecret: 'cf-test-secret' } }));
import { handleCashfreeWebhook, verifyCashfreeSignature } from './cashfreeWebhook.js';

const body = { type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: 'o1' }, payment: { cf_payment_id: 9, payment_status: 'SUCCESS', payment_amount: 120.5 } } };
const rawBody = JSON.stringify(body);
const timestamp = '1760000000000';
const sign = (secret: string) => crypto.createHmac('sha256', secret).update(timestamp + rawBody).digest('base64');

function call(headers: Record<string, string>) {
  const req = { body, rawBody, headers } as unknown as Request;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  return handleCashfreeWebhook(req, res, next).then(() => ({ res, next }));
}

it('accepts a correctly signed event', async () => {
  const { res, next } = await call({ 'x-webhook-signature': sign('cf-test-secret'), 'x-webhook-timestamp': timestamp });
  expect(next).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(200);
});

it('rejects a signature made with another secret', async () => {
  const { res, next } = await call({ 'x-webhook-signature': sign('wrong'), 'x-webhook-timestamp': timestamp });
  expect(res.status).not.toHaveBeenCalled();
  expect(next.mock.calls[0]![0]).toMatchObject({ status: 401 });
});

it('rejects a missing timestamp', async () => {
  const { next } = await call({ 'x-webhook-signature': sign('cf-test-secret') });
  expect(next.mock.calls[0]![0]).toMatchObject({ status: 401 });
});

it('binds the signature to the timestamp', () => {
  expect(verifyCashfreeSignature(rawBody, '1760000000001', sign('cf-test-secret'), 'cf-test-secret')).toBe(false);
});
