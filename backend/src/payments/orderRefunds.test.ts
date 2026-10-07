import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), provider: { value: 'cashfree' as string }, session: { value: null as string | null } }));
vi.mock('../db/supabase.js', () => ({ supabase: { rpc: mocks.rpc, from: (table: string) => {
  const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ error: null,
    data: table === 'checkout_payment_sessions' ? (mocks.session.value ? { provider_order_id: mocks.session.value } : null) : { payment_provider: mocks.provider.value } }) };
  return q;
} } }));
import { processOrderRefund, type OrderRefundJob } from './orderRefunds.js';
const order = '00000000-0000-4000-8000-000000000400';
const cfOrder = 'gl_00000000000040008000000000000400';
const job: OrderRefundJob = { id: 'job', order_id: order, payment_id: '12345', target_paise: 5000, request_key: '11111111-2222-4333-8444-555555555555', request_paise: null, provider_refund_id: null, lease_token: 'lease', attempts: 1 };
const refundId = 'rf_11111111222243338444555555555555';
const response = (data: unknown, status = 200) => ({ ok: status < 300, status, json: async () => data });
const patches = () => mocks.rpc.mock.calls.filter(([n]) => n === 'save_order_refund').map(([, a]) => a.p_patch);
beforeEach(() => { vi.clearAllMocks(); mocks.provider.value = 'cashfree'; mocks.session.value = cfOrder; mocks.rpc.mockResolvedValue({ data: true, error: null }); });
afterEach(() => vi.unstubAllGlobals());

it('freezes the amount, then requests a refund with a deterministic refund_id as idempotency key', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(response([])).mockImplementationOnce(async () => {
    expect(patches()).toEqual([{ request_paise: 5000 }]);
    return response({ refund_id: refundId, refund_amount: 50, refund_status: 'PENDING' });
  });
  vi.stubGlobal('fetch', fetch);
  await processOrderRefund(job);
  expect(fetch.mock.calls[0][0]).toBe(`https://sandbox.cashfree.com/pg/orders/${cfOrder}/refunds`);
  expect(fetch.mock.calls[1][1].headers['x-idempotency-key']).toBe(refundId);
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ refund_amount: 50, refund_id: refundId });
  expect(patches().at(-1)).toMatchObject({ status: 'processing', provider_refund_id: refundId });
});
it('adopts an existing refund with our id after a lost response instead of refunding again', async () => {
  const fetch = vi.fn().mockResolvedValue(response([{ refund_id: refundId, refund_amount: 50, refund_status: 'PENDING' }]));
  vi.stubGlobal('fetch', fetch);
  await processOrderRefund({ ...job, request_paise: 5000 });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(patches().at(-1)).toMatchObject({ status: 'processing', provider_refund_id: refundId });
});
it('adopts on a duplicate-id rejection from a concurrent request', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(response([])).mockResolvedValueOnce(response({ code: 'refund_already_exists' }, 409))
    .mockResolvedValueOnce(response([{ refund_id: refundId, refund_amount: 50, refund_status: 'SUCCESS' }]));
  vi.stubGlobal('fetch', fetch);
  await processOrderRefund(job);
  expect(patches().at(-1)).toMatchObject({ status: 'completed', provider_refund_id: refundId });
});
it('a stale lease cannot start a provider refund', async () => {
  mocks.rpc.mockResolvedValue({ data: false, error: null });
  const fetch = vi.fn().mockResolvedValue(response([]));
  vi.stubGlobal('fetch', fetch);
  await processOrderRefund(job);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('reconciles completed refunds without another money movement; cancelled ones never count', async () => {
  const fetch = vi.fn().mockResolvedValue(response([{ refund_id: 'rf_old', refund_amount: 50, refund_status: 'CANCELLED' }, { refund_id: 'rf_done', refund_amount: 50, refund_status: 'SUCCESS' }]));
  vi.stubGlobal('fetch', fetch);
  await processOrderRefund(job);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(patches().at(-1)).toMatchObject({ status: 'completed', provider_refund_id: 'rf_done' });
});
it('flags legacy Razorpay payments manual_required without calling Cashfree', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  mocks.provider.value = 'razorpay';
  await processOrderRefund(job);
  mocks.provider.value = 'cashfree'; mocks.session.value = 'order_rzp_legacy';
  await processOrderRefund(job);
  expect(fetch).not.toHaveBeenCalled();
  expect(patches()).toEqual([expect.objectContaining({ status: 'manual_required', release: true }), expect.objectContaining({ status: 'manual_required' })]);
});
it('provider timeouts retain a retryable intent; definitive rejections fail', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
  await processOrderRefund(job);
  expect(patches().at(-1)).toMatchObject({ status: 'processing', release: true });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({}, 400)));
  await processOrderRefund(job);
  expect(patches().at(-1)).toMatchObject({ status: 'failed' });
});
