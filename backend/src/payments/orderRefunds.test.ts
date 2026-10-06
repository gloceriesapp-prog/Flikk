import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { rpc: mocks.rpc } }));
import { processOrderRefund, type OrderRefundJob } from './orderRefunds.js';
const job: OrderRefundJob = { id: 'job', order_id: 'order', payment_id: 'payment', target_paise: 5000, request_key: 'stable-refund-key', request_paise: null, provider_refund_id: null, lease_token: 'lease', attempts: 1 };
const response = (data: unknown) => ({ ok: true, json: async () => data });
beforeEach(() => { vi.clearAllMocks(); mocks.rpc.mockResolvedValue({ data: true, error: null }); });
afterEach(() => vi.unstubAllGlobals());
it('records the amount before requesting a provider refund with a stable key', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ items: [] })).mockImplementationOnce(async () => {
        expect(mocks.rpc).toHaveBeenCalledWith('save_order_refund', expect.objectContaining({ p_patch: { request_paise: 5000 } }));
        return response({ id: 'refund', amount: 5000, status: 'pending' });
    });
    vi.stubGlobal('fetch', fetch);
    await processOrderRefund(job);
    expect(fetch.mock.calls[1][1].headers['X-Refund-Idempotency']).toBe(job.request_key);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ amount: 5000, speed: 'normal' });
});
it('retries a lost response using the frozen body even when the provider knows the pending refund', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ items: [{ id: 'lost', amount: 5000, status: 'pending' }] })).mockResolvedValueOnce(response({ id: 'lost', amount: 5000, status: 'pending' }));
    vi.stubGlobal('fetch', fetch);
    await processOrderRefund({ ...job, request_paise: 5000 });
    expect(fetch.mock.calls[1][1].headers['X-Refund-Idempotency']).toBe(job.request_key);
    expect(JSON.parse(fetch.mock.calls[1][1].body).amount).toBe(5000);
});
it('a stale lease cannot start a provider refund', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    const fetch = vi.fn().mockResolvedValue(response({ items: [] }));
    vi.stubGlobal('fetch', fetch);
    await processOrderRefund(job);
    expect(fetch).toHaveBeenCalledTimes(1);
});
it('reconciles completed refunds without issuing another payment operation', async () => {
    const fetch = vi.fn().mockResolvedValue(response({ items: [{ id: 'done', amount: 5000, status: 'processed' }] }));
    vi.stubGlobal('fetch', fetch);
    await processOrderRefund(job);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith('save_order_refund', expect.objectContaining({ p_patch: expect.objectContaining({ status: 'completed', provider_refund_id: 'done' }) }));
});
it('provider timeouts retain a retryable intent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    await processOrderRefund(job);
    expect(mocks.rpc).toHaveBeenCalledWith('save_order_refund', expect.objectContaining({ p_patch: expect.objectContaining({ status: 'processing', release: true }) }));
});
