import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ update: vi.fn(), from: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: mocks.from } }));
import { refundProgress, processTripRefund, type TripRefundJob } from './tripRefunds.js';
const job: TripRefundJob = { id: 'refund-key-123456', trip_id: 'trip', payment_id: 'payment', target_paise: 5500, request_paise: null, refunded_paise: 0, status: 'queued', provider_refund_id: null, lease_token: 'lease', attempts: 1 };
beforeEach(() => {
    vi.clearAllMocks();
    const q = { update: mocks.update, eq: vi.fn(() => q), select: vi.fn(() => q), maybeSingle: vi.fn(async () => ({ data: { id: job.id }, error: null })) };
    mocks.update.mockReturnValue(q);
    mocks.from.mockReturnValue(q);
});
afterEach(() => vi.unstubAllGlobals());
function response(items: unknown) { return { ok: true, json: async () => items }; }
it('pending partial refunds reserve money but do not count as completed', () => {
    expect(refundProgress([{ id: 'a', amount: 2000, status: 'processed' }, { id: 'b', amount: 1000, status: 'pending' }, { id: 'c', amount: 900, status: 'failed' }], 5500))
        .toEqual({ remaining: 2500, completed: 2000, settled: false });
});
it('requests only the remaining combined total, including fees and prior partial refunds', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ items: [{ id: 'old', amount: 2000, status: 'processed' }] })).mockResolvedValueOnce(response({ id: 'new', amount: 3500, status: 'pending' }));
    vi.stubGlobal('fetch', fetch);
    await processTripRefund(job);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ request_paise: 3500 }));
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ amount: 3500, speed: 'normal' });
    expect(fetch.mock.calls[1][1].headers['X-Refund-Idempotency']).toBe(job.id);
});
it('retries a lost refund response with the frozen body and same provider key', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ items: [{ id: 'unknown', amount: 3500, status: 'pending' }] })).mockResolvedValueOnce(response({ id: 'unknown', amount: 3500, status: 'pending' }));
    vi.stubGlobal('fetch', fetch);
    await processTripRefund({ ...job, request_paise: 3500 });
    expect(JSON.parse(fetch.mock.calls[1][1].body).amount).toBe(3500);
    expect(fetch.mock.calls[1][1].headers['X-Refund-Idempotency']).toBe(job.id);
});
it('does not send another refund when the total has already settled', async () => {
    const fetch = vi.fn().mockResolvedValue(response({ items: [{ id: 'done', amount: 5500, status: 'processed' }] }));
    vi.stubGlobal('fetch', fetch);
    await processTripRefund(job);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed', refunded_paise: 5500 }));
});
it('retains unknown network outcomes for retry instead of claiming failure or completion', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await processTripRefund(job);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'queued', lease_until: null, last_error: 'Refund confirmation delayed' }));
});
it('stops and exposes a definitive provider rejection for support', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    await processTripRefund(job);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
});
