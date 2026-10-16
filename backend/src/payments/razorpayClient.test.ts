import { afterEach, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { checkoutReceipt, refundRequestKey, toPaise, verifyCheckoutSignature, verifyWebhookSignature, createProviderOrder, createProviderRefund, getPaymentRefunds, findProviderOrder, createProviderUpiIntent } from './razorpayClient.js';
afterEach(() => { vi.unstubAllGlobals(); env.razorpayEnv = 'test'; });
it('uses paise, rejects unsafe amounts and derives stable bounded identifiers', () => {
  expect(toPaise('12.34')).toBe(1234); expect(() => toPaise(-1)).toThrow(); expect(() => toPaise(Infinity)).toThrow();
  expect(checkoutReceipt('00000000-0000-4000-8000-000000000001')).toBe('gl_00000000000040008000000000000001');
  expect(refundRequestKey('job')).toHaveLength(35); expect(refundRequestKey('job')).toBe(refundRequestKey('job'));
});
it('verifies exact SDK order/payment HMAC and rejects tampering/malformed input', () => {
  const sig = crypto.createHmac('sha256','secret').update('order_one|pay_one').digest('hex');
  expect(verifyCheckoutSignature('order_one','pay_one',sig,'secret')).toBe(true);
  expect(verifyCheckoutSignature('order_other','pay_one',sig,'secret')).toBe(false);
  expect(verifyCheckoutSignature('order_one','pay_one','x','secret')).toBe(false);
});
it('verifies the raw webhook bytes without inventing an unsigned timestamp', () => {
  const body = '{"event":"payment.captured"}'; const sig = crypto.createHmac('sha256','secret').update(body).digest('hex');
  expect(verifyWebhookSignature(body,sig,'secret')).toBe(true); expect(verifyWebhookSignature(body+' ',sig,'secret')).toBe(false);
});
it('creates an INR order with authoritative integer amount and no partial payments', async () => {
  const fetch = vi.fn().mockResolvedValue({ok:true,json:async()=>({id:'order_one'})}); vi.stubGlobal('fetch',fetch);
  await createProviderOrder({receipt:'gl_one',amountPaise:1234,notes:{gloceries_order_id:'one'}});
  expect(fetch.mock.calls[0][0]).toBe('https://api.razorpay.com/v1/orders');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({amount:1234,currency:'INR',partial_payment:false,receipt:'gl_one'});
  expect(fetch.mock.calls[0][1].headers.Authorization).toMatch(/^Basic /);
});
it('creates the documented S2S UPI intent server-side with no client secret exposure', async () => {
  env.razorpayEnv = 'live';
  const link = 'upi://pay?pa=merchant%40razorpay&tr=ref&am=12.34&cu=INR';
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ razorpay_payment_id: 'pay_one', link }) }); vi.stubGlobal('fetch', fetch);
  expect(await createProviderUpiIntent({ providerOrderId: 'order_one', amountPaise: 1234, email: 'real@example.com', contact: '919999999999', notes: { gloceries_order_id: 'one' }, ip: '127.0.0.1', userAgent: 'Customer/1' }))
    .toEqual({ razorpay_payment_id: 'pay_one', link });
  expect(fetch.mock.calls[0][0]).toBe('https://api.razorpay.com/v1/payments/create/upi');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ amount: 1234, currency: 'INR', order_id: 'order_one', method: 'upi', upi: { flow: 'intent' }, email: 'real@example.com', contact: '919999999999', ip: '127.0.0.1', user_agent: 'Customer/1' });
  expect(fetch.mock.calls[0][1].headers.Authorization).toMatch(/^Basic /);
});
it('never calls Razorpay S2S with test keys that produce non-payable mock VPAs', () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  expect(() => createProviderUpiIntent({ providerOrderId: 'order_one', amountPaise: 100,
    email: 'real@example.com', contact: '919999999999', notes: {} }))
    .toThrow('UPI app payments require live Razorpay keys');
  expect(fetch).not.toHaveBeenCalled();
});
it('uses Razorpay refund idempotency and the original captured payment', async () => {
  const fetch = vi.fn().mockResolvedValue({ok:true,json:async()=>({id:'rfnd_one'})}); vi.stubGlobal('fetch',fetch);
  await createProviderRefund('pay_one',{requestKey:'gl_refund',amountPaise:100,note:'Cancelled'});
  expect(fetch.mock.calls[0][0]).toContain('/payments/pay_one/refund');
  expect(fetch.mock.calls[0][1].headers['X-Refund-Idempotency']).toBe('gl_refund');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({amount:100,receipt:'gl_refund',speed:'normal'});
});
it('paginates refund history rather than over-refunding beyond the first page', async () => {
  const fetch = vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({items:Array.from({length:100},(_,i)=>({id:`rfnd_${i}`}))})}).mockResolvedValueOnce({ok:true,json:async()=>({items:[{id:'rfnd_last'}]})}); vi.stubGlobal('fetch',fetch);
  expect(await getPaymentRefunds('pay_one')).toHaveLength(101); expect(fetch.mock.calls[1][0]).toContain('skip=100');
});
it('fails closed on multiple receipt matches or network uncertainty', async () => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({items:[{receipt:'same'},{receipt:'same'}]})}));
  await expect(findProviderOrder('same')).rejects.toMatchObject({code:'PAYMENT_REVIEW_REQUIRED'});
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('timeout')));
  await expect(findProviderOrder('same')).rejects.toMatchObject({providerStatus:0});
});
