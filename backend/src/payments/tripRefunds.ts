import { supabase } from '../db/supabase.js';
import { cashfreeRefundId } from './cashfreeClient.js';
import { createOrAdoptRefund, isDefinitiveRejection, LEGACY_REFUND_NOTE, listRefunds, refundProgress, refundSource } from './refundPayment.js';
import { logger } from '../lib/logger.js';
export { refundProgress };
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
// save_trip_refund (migration 106) applies the patch under the lease and
// copies the outcome to the trip's leg orders (refund_status/provider id).
async function save(job: TripRefundJob, patch: Record<string, unknown>) {
    const { data, error } = await supabase.rpc('save_trip_refund', { p_id: job.id, p_lease: job.lease_token, p_patch: patch });
    if (error)
        throw error;
    return data === true;
}
// A trip refund has one refund_id per job, so a refund the provider rejected
// cannot be re-sent automatically: hand it (and its legs) to the admin's
// manual-refund path (mark_order_refund_manual) instead of a dead 'failed'.
export const TRIP_REFUND_MANUAL_NOTE = 'Provider rejected the refund: refund manually';
export async function processTripRefund(job: TripRefundJob): Promise<void> {
    try {
        const source = await refundSource('trip', job.trip_id);
        if (source.provider === 'legacy') {
            await save(job, { status: 'manual_required', last_error: LEGACY_REFUND_NOTE, release: true });
            return;
        }
        const refundId = cashfreeRefundId(job.id);
        const existing = await listRefunds(source.providerOrderId);
        const progress = refundProgress(existing, Number(job.target_paise));
        const own = existing.find(r => r.id === refundId);
        let status = progress.settled ? 'completed' : own?.status === 'failed' ? 'failed' : 'processing';
        let providerId = own?.id ?? job.provider_refund_id;
        if (!progress.settled && status !== 'failed' && !own && (job.request_paise || progress.remaining > 0)) {
            // Freeze the amount before the external request. A lost response always
            // retries the same refund_id AND body, even if provider totals have changed.
            const amount = Number(job.request_paise ?? progress.remaining);
            if (!await save(job, { request_paise: amount }))
                return;
            const refund = await createOrAdoptRefund(source.providerOrderId, refundId, amount, 'Gloceries trip refund');
            providerId = refund.id;
            status = refund.status === 'failed' ? 'failed' : 'processing';
            // Confirm all partial refunds, including earlier shop refunds, before
            // declaring the combined amount complete.
        }
        if (status === 'failed')
            status = 'manual_required';
        await save(job, { status, provider_refund_id: providerId, refunded_paise: progress.completed,
            last_error: status === 'manual_required' ? TRIP_REFUND_MANUAL_NOTE : null, release: true,
            next_attempt_at: new Date(Date.now() + 60000).toISOString() });
    }
    catch (err) {
        logger.error({ err, tripId: job.trip_id }, '[tripRefunds] retry scheduled');
        const rejected = isDefinitiveRejection(err);
        await save(job, { status: rejected ? 'manual_required' : job.status, last_error: rejected ? TRIP_REFUND_MANUAL_NOTE : 'Refund confirmation delayed', release: true,
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
