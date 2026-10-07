import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ update: vi.fn(), rpc: vi.fn(), provider: { value: 'cashfree' } }));
vi.mock('../db/supabase.js', () => ({ supabase: { rpc: async (name: string, args: { p_patch: unknown }) => {
  mocks.rpc(name, args); mocks.update(args.p_patch); return { data: true, error: null };
}, from: (table: string) => {
  const q = { update: (p: unknown) => { mocks.update(p); return q; }, select: () => q, eq: () => q,
    maybeSingle: async () => ({ error: null, data: table === 'trip_refunds' ? { id: 'x' } : table === 'trips' ? { payment_provider: mocks.provider.value } : null }) };
  return q;
} } }));
import { refundProgress, processTripRefund, TRIP_REFUND_MANUAL_NOTE, type TripRefundJob } from './tripRefunds.js';
const trip = '00000000-0000-4000-8000-000000000500';
const cfOrder = 'gl_00000000000040008000000000000500';
const job: TripRefundJob = { id: '99999999-0000-4000-8000-000000000001', trip_id: trip, payment_id: '1', target_paise: 5500, request_paise: null, refunded_paise: 0, status: 'queued', provider_refund_id: null, lease_token: 'lease', attempts: 1 };
const refundId = 'rf_99999999000040008000000000000001';
beforeEach(() => { vi.clearAllMocks(); mocks.provider.value = 'cashfree'; });
afterEach(() => vi.unstubAllGlobals());
const response = (data: unknown, status = 200) => ({ ok: status < 300, status, json: async () => data });
it('pending partial refunds reserve money but do not count as completed', () => {
  expect(refundProgress([{ id: 'a', amount: 2000, status: 'completed' }, { id: 'b', amount: 1000, status: 'processing' }, { id: 'c', amount: 900, status: 'failed' }], 5500))
    .toEqual({ remaining: 2500, completed: 2000, settled: false });
});
it('requests only the remaining combined total, including prior partial refunds', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(response([{ refund_id: 'rf_old', refund_amount: 20, refund_status: 'SUCCESS' }]))
    .mockResolvedValueOnce(response({ refund_id: refundId, refund_amount: 35, refund_status: 'PENDING' }));
  vi.stubGlobal('fetch', fetch);
  await processTripRefund(job);
  expect(fetch.mock.calls[0][0]).toContain(`/orders/${cfOrder}/refunds`);
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ request_paise: 3500 }));
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ refund_amount: 35, refund_id: refundId });
  expect(fetch.mock.calls[1][1].headers['x-idempotency-key']).toBe(refundId);
});
it('adopts its own refund after a lost response instead of creating another', async () => {
  const fetch = vi.fn().mockResolvedValue(response([{ refund_id: refundId, refund_amount: 35, refund_status: 'PENDING' }]));
  vi.stubGlobal('fetch', fetch);
  await processTripRefund({ ...job, request_paise: 3500 });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'processing', provider_refund_id: refundId }));
});
it('does not send another refund when the total has already settled', async () => {
  const fetch = vi.fn().mockResolvedValue(response([{ refund_id: 'rf_done', refund_amount: 55, refund_status: 'SUCCESS' }]));
  vi.stubGlobal('fetch', fetch);
  await processTripRefund(job);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed', refunded_paise: 5500 }));
});
it('marks legacy Razorpay trips manual_required without calling Cashfree', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  mocks.provider.value = 'razorpay';
  await processTripRefund(job);
  expect(fetch).not.toHaveBeenCalled();
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'manual_required' }));
});
it('retains unknown network outcomes for retry instead of claiming failure or completion', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  await processTripRefund(job);
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'queued', release: true, last_error: 'Refund confirmation delayed' }));
});
it('hands a definitive provider rejection to the manual-refund path instead of a dead failed state', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({}, 400)));
  await processTripRefund(job);
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'manual_required', last_error: TRIP_REFUND_MANUAL_NOTE, release: true }));
  expect(mocks.update).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
});
it('saves through the lease-guarded save_trip_refund RPC that syncs leg orders', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([{ refund_id: 'rf_done', refund_amount: 55, refund_status: 'SUCCESS' }])));
  await processTripRefund(job);
  expect(mocks.rpc).toHaveBeenCalledWith('save_trip_refund', { p_id: job.id, p_lease: 'lease', p_patch: expect.objectContaining({ status: 'completed', release: true }) });
});
it('keeps credential/environment errors (401/403) retryable with backoff', async () => {
  for (const status of [401, 403]) {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({}, status)));
    await processTripRefund({ ...job, status: 'processing' });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'processing', last_error: 'Refund confirmation delayed', release: true }));
    expect(mocks.update).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'manual_required' }));
  }
});
it('moves a refund the provider cancelled or rejected to manual handling', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([{ refund_id: refundId, refund_amount: 55, refund_status: 'REJECTED' }])));
  await processTripRefund({ ...job, status: 'processing', request_paise: 5500 });
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'manual_required', provider_refund_id: refundId, last_error: TRIP_REFUND_MANUAL_NOTE }));
});
