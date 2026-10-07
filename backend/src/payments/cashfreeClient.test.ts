import crypto from 'node:crypto';
import { afterEach, expect, it, vi } from 'vitest';
import { CashfreeError, cashfreeOrderId, cashfreeRefundId, createCfRefund, getCfOrder, pickUpiLink, toPaise, toRupees, upiLinksFrom, verifyWebhookSignature, WEBHOOK_MAX_AGE_MS } from './cashfreeClient.js';
afterEach(() => vi.unstubAllGlobals());

const sign = (ts: string, body: string, secret = 'test-webhook-secret') => crypto.createHmac('sha256', secret).update(ts + body).digest('base64');

it('converts paise <-> rupees exactly at the boundary', () => {
  expect(toRupees(12345)).toBe(123.45);
  expect(toRupees(1)).toBe(0.01);
  expect(toPaise(123.45)).toBe(12345);
  expect(toPaise('0.29')).toBe(29); // 0.29*100 = 28.999999999999996
  expect(toPaise(1.005)).toBe(100);
  expect(() => toRupees(1.5)).toThrow();
  expect(() => toPaise(-1)).toThrow();
  expect(() => toPaise('abc')).toThrow();
});

it('derives deterministic provider ids within Cashfree length limits', () => {
  const id = cashfreeOrderId('00000000-0000-4000-8000-000000000100');
  expect(id).toBe('gl_00000000000040008000000000000100');
  expect(id.length).toBeLessThanOrEqual(45);
  expect(cashfreeRefundId('7f1c-22')).toBe('rf_7f1c22');
  expect(cashfreeRefundId('a'.repeat(60)).length).toBe(40);
});

it('verifies webhook signatures over timestamp + raw body with a 5-minute window', () => {
  const now = 1_700_000_000_000; const ts = String(now - 1000); const body = '{"type":"PAYMENT_SUCCESS_WEBHOOK"}';
  expect(verifyWebhookSignature(body, ts, sign(ts, body), now)).toBe(true);
  expect(verifyWebhookSignature(body + ' ', ts, sign(ts, body), now)).toBe(false); // tampered body
  expect(verifyWebhookSignature(body, String(now - 2000), sign(ts, body), now)).toBe(false); // tampered timestamp
  expect(verifyWebhookSignature(body, ts, sign(ts, body, 'other'), now)).toBe(false); // wrong secret
  const stale = String(now - WEBHOOK_MAX_AGE_MS - 1);
  expect(verifyWebhookSignature(body, stale, sign(stale, body), now)).toBe(false);
  const future = String(now + WEBHOOK_MAX_AGE_MS + 1);
  expect(verifyWebhookSignature(body, future, sign(future, body), now)).toBe(false);
  expect(verifyWebhookSignature(body, 'abc', sign('abc', body), now)).toBe(false);
});

it('selects the per-app UPI link, falling back to default', () => {
  const links = upiLinksFrom({ default: 'upi://pay?a', gpay: 'tez://upi/pay?a', phonepe: 'phonepe://pay?a', web: 'https://x', bogus: 1 })!;
  expect(pickUpiLink(links, 'gpay')).toBe('tez://upi/pay?a');
  expect(pickUpiLink(links, 'amazonpay')).toBe('upi://pay?a');
  expect(pickUpiLink(links)).toBe('upi://pay?a');
  expect(links).not.toHaveProperty('bogus');
  expect(upiLinksFrom({ gpay: 'x' })).toBeNull();
  expect(upiLinksFrom(null)).toBeNull();
});

it('sends credentials, version, request id and the refund id as idempotency key; amounts in rupees', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ refund_id: 'rf_x', refund_amount: 12.5, refund_status: 'PENDING' }) });
  vi.stubGlobal('fetch', fetch);
  await createCfRefund('gl_1', { refundId: 'rf_x', amountPaise: 1250, note: 'note' });
  const [url, init] = fetch.mock.calls[0];
  expect(url).toBe('https://sandbox.cashfree.com/pg/orders/gl_1/refunds');
  expect(init.method).toBe('POST');
  expect(init.headers).toMatchObject({ 'x-client-id': 'test-app-id', 'x-client-secret': 'test-secret-key', 'x-api-version': '2025-01-01', 'x-idempotency-key': 'rf_x' });
  expect(init.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  expect(JSON.parse(init.body)).toEqual({ refund_amount: 12.5, refund_id: 'rf_x', refund_note: 'note', refund_speed: 'STANDARD' });
});

it('maps provider failures to a typed 502 without leaking provider text; 404 order = null', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ code: 'order_not_found', message: 'secret detail' }) }));
  expect(await getCfOrder('gl_missing')).toBeNull();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ message: 'secret detail' }) }));
  const error = await getCfOrder('gl_x').catch((e: unknown) => e);
  expect(error).toBeInstanceOf(CashfreeError);
  expect(error).toMatchObject({ status: 502, code: 'PAYMENT_PROVIDER_ERROR', providerStatus: 500 });
  expect((error as Error).message).not.toContain('secret');
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
  await expect(getCfOrder('gl_x')).rejects.toMatchObject({ providerStatus: 0 });
});
