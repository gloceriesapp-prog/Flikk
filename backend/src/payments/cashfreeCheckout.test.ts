import crypto from 'node:crypto';
import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), order: vi.fn(), payments: vi.fn(), settle: vi.fn(), cfRefunds: vi.fn(), cfCreateRefund: vi.fn(), rzpRefunds: vi.fn(), rzpCreateRefund: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: m.from, rpc: m.rpc } }));
vi.mock('./settleCheckoutPayment.js', () => ({ settleCheckoutPayment: m.settle }));
vi.mock('./cashfreeClient.js', async load => ({ ...await load<typeof import('./cashfreeClient.js')>(), getCfOrder: m.order, getCfOrderPayments: m.payments, getCfRefunds: m.cfRefunds, createCfRefund: m.cfCreateRefund }));
vi.mock('./razorpayClient.js', async load => ({ ...await load<typeof import('./razorpayClient.js')>(), getPaymentRefunds: m.rzpRefunds, createProviderRefund: m.rzpCreateRefund }));
import { reconcileCashfree } from './cashfreeCheckout.js';
import { verifyCashfreeWebhook, cashfreeRefundId } from './cashfreeClient.js';
import { createOrAdoptRefund, listRefunds } from './refundPayment.js';
import { checkoutReceipt } from './razorpayClient.js';
import { paymentTarget } from './recovery.js';

const id = '00000000-0000-4000-8000-000000000100';
const target = paymentTarget({ orderId: id });
const cfOrderId = checkoutReceipt(id);
const order = { order_id: cfOrderId, order_amount: 30, order_currency: 'INR', order_status: 'PAID', order_tags: { gloceries_order_id: id } };
const success = { cf_payment_id: '5114910000', order_id: cfOrderId, payment_status: 'SUCCESS', payment_amount: 30, payment_currency: 'INR' };
beforeEach(() => { vi.resetAllMocks(); m.order.mockResolvedValue(order); m.settle.mockResolvedValue(true); });

it('settles only a server-read SUCCESS with the exact amount, currency and order', async () => {
  m.payments.mockResolvedValue([{ ...success, cf_payment_id: '5114909999', payment_status: 'FAILED' }, success]);
  expect(await reconcileCashfree(target, cfOrderId, 30)).toEqual({ state: 'paid', canResumeUpiIntent: false });
  expect(m.settle).toHaveBeenCalledTimes(1);
  expect(m.settle).toHaveBeenCalledWith({ orderId: id }, '5114910000', 3000, 'INR', cfOrderId, 'cashfree');
});
it.each([
  ['amount', { ...success, payment_amount: 29.99 }],
  ['currency', { ...success, payment_currency: 'USD' }],
  ['order', { ...success, order_id: 'gl_ffffffffffffffffffffffffffffffff' }],
  ['payment id', { ...success, cf_payment_id: 'pay_x' }],
])('rejects a payment whose %s does not match', async (_label, payment) => {
  m.payments.mockResolvedValue([payment]);
  await expect(reconcileCashfree(target, cfOrderId, 30)).rejects.toMatchObject({ code: 'PAYMENT_REVIEW_REQUIRED' });
  expect(m.settle).not.toHaveBeenCalled();
});
it('rejects a provider order with a different amount or tag', async () => {
  m.order.mockResolvedValue({ ...order, order_amount: 31 });
  await expect(reconcileCashfree(target, cfOrderId, 30)).rejects.toMatchObject({ code: 'PAYMENT_REVIEW_REQUIRED' });
  m.order.mockResolvedValue({ ...order, order_tags: { gloceries_order_id: 'other' } });
  await expect(reconcileCashfree(target, cfOrderId, 30)).rejects.toMatchObject({ code: 'PAYMENT_REVIEW_REQUIRED' });
});
it('a duplicate webhook re-reads and re-settles idempotently (SQL returns settled_now=false)', async () => {
  m.payments.mockResolvedValue([success]);
  await reconcileCashfree(target, cfOrderId, 30); await reconcileCashfree(target, cfOrderId, 30);
  expect(m.settle).toHaveBeenNthCalledWith(2, { orderId: id }, '5114910000', 3000, 'INR', cfOrderId, 'cashfree');
});
it('keeps PENDING money pending and lets an untouched order be abandoned', async () => {
  m.payments.mockResolvedValue([{ ...success, payment_status: 'PENDING' }]);
  expect((await reconcileCashfree(target, cfOrderId, 30, false)).state).toBe('pending');
  m.payments.mockResolvedValue([{ ...success, payment_status: 'USER_DROPPED' }]);
  expect((await reconcileCashfree(target, cfOrderId, 30)).state).toBe('unpaid');
  m.payments.mockResolvedValue([]);
  expect((await reconcileCashfree(target, cfOrderId, 30)).state).toBe('unpaid');
});

it('verifies Cashfree webhook signatures over timestamp + raw body', () => {
  const body = '{"type":"PAYMENT_SUCCESS_WEBHOOK","data":{"payment":{"payment_amount":170.00}}}';
  const now = 1_790_000_000_000; const ts = String(now);
  const sign = (secret: string, payload = body) => crypto.createHmac('sha256', secret).update(ts + payload).digest('base64');
  expect(verifyCashfreeWebhook(body, ts, sign('s3cret'), now, 's3cret')).toBe(true);
  expect(verifyCashfreeWebhook(body, ts, sign('wrong'), now, 's3cret')).toBe(false);
  expect(verifyCashfreeWebhook(body.replace('170.00', '170'), ts, sign('s3cret'), now, 's3cret')).toBe(false);
  expect(verifyCashfreeWebhook(body, ts, sign('s3cret'), now + 6 * 60_000, 's3cret')).toBe(false);
  expect(verifyCashfreeWebhook(body, ts, sign('s3cret'), now, undefined)).toBe(false);
});

it('refunds a Cashfree payment through Cashfree and a Razorpay payment through Razorpay', async () => {
  const cf = { provider: 'cashfree' as const, paymentId: '5114910000', providerOrderId: cfOrderId };
  m.cfRefunds.mockResolvedValue([{ refund_id: 'someoneelse', cf_payment_id: '1', refund_amount: 5, refund_status: 'SUCCESS' }]);
  m.cfCreateRefund.mockResolvedValue({ cf_refund_id: '77', cf_payment_id: '5114910000', refund_id: cashfreeRefundId('gl_abc'), refund_amount: 30, refund_status: 'PENDING' });
  expect(await createOrAdoptRefund(cf, 'gl_abc', 3000, 'note')).toEqual({ id: '77', requestKey: 'glabc', amount: 3000, status: 'processing' });
  expect(m.cfCreateRefund).toHaveBeenCalledWith(cfOrderId, { refundId: 'glabc', amountPaise: 3000, note: 'note' });
  expect(m.rzpCreateRefund).not.toHaveBeenCalled();
  m.rzpRefunds.mockResolvedValue([]);
  m.rzpCreateRefund.mockResolvedValue({ id: 'rfnd_1', payment_id: 'pay_one', amount: 3000, status: 'pending', receipt: 'gl_abc' });
  await createOrAdoptRefund({ provider: 'razorpay', paymentId: 'pay_one' }, 'gl_abc', 3000, 'note');
  expect(m.rzpCreateRefund).toHaveBeenCalledWith('pay_one', { requestKey: 'gl_abc', amountPaise: 3000, note: 'note' });
  expect(m.cfCreateRefund).toHaveBeenCalledTimes(1);
});
it('adopts an existing Cashfree refund instead of creating a second one, and maps statuses', async () => {
  const cf = { provider: 'cashfree' as const, paymentId: '5114910000', providerOrderId: cfOrderId };
  m.cfRefunds.mockResolvedValue([
    { cf_refund_id: '77', cf_payment_id: '5114910000', refund_id: 'glabc', refund_amount: 30, refund_status: 'SUCCESS' },
    { cf_refund_id: '78', cf_payment_id: '5114910000', refund_id: 'glold', refund_amount: 1, refund_status: 'CANCELLED' },
    { cf_refund_id: '79', cf_payment_id: '999', refund_id: 'glother', refund_amount: 1, refund_status: 'PENDING' },
  ]);
  expect((await listRefunds(cf)).map(r => `${r.id}:${r.status}`)).toEqual(['77:completed', '78:failed']);
  expect((await createOrAdoptRefund(cf, 'gl_abc', 3000, 'note')).id).toBe('77');
  expect(m.cfCreateRefund).not.toHaveBeenCalled();
});
