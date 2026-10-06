import { supabase } from '../db/supabase.js';
import { razorpayBasicAuthHeader } from './razorpayClient.js';
import { logger } from '../lib/logger.js';
interface ProviderRefund {
    id: string;
    amount: number;
    status: string;
}
export interface TripRefundJob {
    id: string;
    trip_id: string;
    payment_id: string;
    target_paise: number;
    request_paise: number | null;
    refunded_paise: number;
    status: string;
    provider_refund_id: string | null;
    lease_token: string;
    attempts: number;
}
export function refundProgress(items: ProviderRefund[], target: number) {
    const reserved = items.filter(r => r.status !== 'failed').reduce((n, r) => n + r.amount, 0);
    const completed = items.filter(r => r.status === 'processed').reduce((n, r) => n + r.amount, 0);
    return { remaining: Math.max(0, target - reserved), completed, settled: completed >= target };
}
class ProviderError extends Error {
    constructor(readonly status: number) { super(`Refund provider HTTP ${status}`); }
}
async function providerRequest(path: string, init: RequestInit = {}) {
    const response = await fetch(`https://api.razorpay.com/v1${path}`, {
        ...init, headers: { Authorization: razorpayBasicAuthHeader(), 'Content-Type': 'application/json', ...init.headers },
        signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
        throw new ProviderError(response.status);
    return response.json();
}
async function listRefunds(paymentId: string): Promise<ProviderRefund[]> {
    const items: ProviderRefund[] = [];
    for (let skip = 0; skip < 10000; skip += 100) {
        const page = await providerRequest(`/payments/${encodeURIComponent(paymentId)}/refunds?count=100&skip=${skip}`) as {
            items: ProviderRefund[];
        };
        if (!Array.isArray(page.items) || page.items.some(r => !Number.isSafeInteger(r.amount) || r.amount < 0))
            throw new Error('Invalid refund response');
        items.push(...page.items);
        if (page.items.length < 100)
            return [...new Map(items.map(item => [item.id, item])).values()];
    }
    throw new Error('Refund pagination limit reached'); // Never guess the remaining amount.
}
async function save(job: TripRefundJob, patch: Record<string, unknown>) {
    const { data, error } = await supabase.from('trip_refunds').update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', job.id).eq('lease_token', job.lease_token).select('id').maybeSingle();
    if (error)
        throw error;
    return !!data;
}
export async function processTripRefund(job: TripRefundJob): Promise<void> {
    try {
        const existing = await listRefunds(job.payment_id);
        const progress = refundProgress(existing, Number(job.target_paise));
        const own = existing.find(r => r.id === job.provider_refund_id);
        let status = progress.settled ? 'completed' : own?.status === 'failed' ? 'failed' : 'processing';
        let providerId = job.provider_refund_id;
        if (!progress.settled && status !== 'failed' && !providerId && (job.request_paise || progress.remaining > 0)) {
            // Freeze the amount before the external request. A lost response always
            // retries the same key AND body, even if provider totals have changed.
            const amount = Number(job.request_paise ?? progress.remaining);
            if (!await save(job, { request_paise: amount }))
                return;
            const refund = await providerRequest(`/payments/${encodeURIComponent(job.payment_id)}/refund`, {
                method: 'POST', headers: { 'X-Refund-Idempotency': job.id }, body: JSON.stringify({ amount, speed: 'normal' }),
            }) as ProviderRefund;
            if (!refund.id || !['pending', 'processed', 'failed'].includes(refund.status)) throw new Error('Invalid refund creation response');
            providerId = refund.id;
            status = refund.status === 'failed' ? 'failed' : 'processing';
            // Confirm all partial refunds, including earlier shop refunds, before
            // declaring the combined amount complete.
        }
        await save(job, { status, provider_refund_id: providerId, refunded_paise: progress.completed,
            last_error: status === 'failed' ? 'Provider reported a failed refund' : null, lease_until: null, lease_token: null,
            next_attempt_at: new Date(Date.now() + 60000).toISOString() });
    }
    catch (err) {
        logger.error({ err, tripId: job.trip_id }, '[tripRefunds] retry scheduled');
        await save(job, { status: err instanceof ProviderError && [400, 401, 403, 404, 422].includes(err.status) ? 'failed' : job.status, last_error: 'Refund confirmation delayed', lease_until: null, lease_token: null,
            next_attempt_at: new Date(Date.now() + Math.min(900000, 15000 * 2 ** Math.min(job.attempts, 6))).toISOString() });
    }
}
export async function runTripRefunds(): Promise<void> {
    const { data, error } = await supabase.rpc('claim_trip_refunds');
    if (error)
        throw error;
    await Promise.all((data as TripRefundJob[] ?? []).map(processTripRefund));
}
export async function enqueueTripRefund(tripId: string): Promise<void> {
    const { error } = await supabase.rpc('enqueue_trip_refund', { p_trip_id: tripId });
    if (error)
        throw error;
}
export async function tripRefundSummary(tripId: string) {
    const { data, error } = await supabase.from('trip_refunds').select('status,target_paise,refunded_paise').eq('trip_id', tripId).maybeSingle();
    if (error)
        throw error;
    return data ? { status: data.status, amount: Number(data.target_paise) / 100, refunded_amount: Number(data.refunded_paise) / 100 } : null;
}
