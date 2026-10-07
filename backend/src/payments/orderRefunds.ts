import { supabase } from '../db/supabase.js';
import { logger } from '../lib/logger.js';
import { CashfreeError, cashfreeRefundId } from './cashfreeClient.js';
import { createOrAdoptRefund, isDefinitiveRejection, LEGACY_REFUND_NOTE, listRefunds, refundSource } from './refundPayment.js';

export interface OrderRefundJob {
  id: string;
  order_id: string;
  payment_id: string;
  target_paise: number;
  // Rotated by retry_order_refund after a provider-failed refund, so a retry
  // gets a fresh deterministic refund_id instead of re-adopting the failure.
  request_key: string;
  request_paise: number | null;
  provider_refund_id: string | null;
  lease_token: string;
  attempts: number;
}
async function save(job: OrderRefundJob, patch: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('save_order_refund', { p_id: job.id, p_lease: job.lease_token, p_patch: patch });
  if (error)
    throw error;
  return data === true;
}
export async function processOrderRefund(job: OrderRefundJob): Promise<void> {
  try {
    const source = await refundSource('order', job.order_id);
    if (source.provider === 'legacy') {
      await save(job, { status: 'manual_required', last_error: LEGACY_REFUND_NOTE, release: true });
      return;
    }
    const refundId = cashfreeRefundId(job.request_key);
    const existing = await listRefunds(source.providerOrderId);
    const completed = existing.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.amount, 0);
    const reserved = existing.filter(r => r.status !== 'failed').reduce((sum, r) => sum + r.amount, 0);
    let own = existing.find(r => r.id === refundId);
    if (completed >= Number(job.target_paise)) {
      await save(job, { status: 'completed', provider_refund_id: job.provider_refund_id ?? own?.id ?? existing.find(r => r.status === 'completed')?.id, release: true });
      return;
    }
    if (own?.status === 'failed') {
      await save(job, { status: 'failed', provider_refund_id: own.id, last_error: 'Provider refund failed', release: true });
      return;
    }
    if (!own && (job.request_paise !== null || reserved < Number(job.target_paise))) {
      const amount = Number(job.request_paise ?? Number(job.target_paise) - reserved);
      if (!Number.isSafeInteger(amount) || amount <= 0)
        throw new Error('Invalid refund amount');
      // Freeze before provider call; lost responses retry the same id/body.
      if (!await save(job, { request_paise: amount }))
        return;
      own = await createOrAdoptRefund(source.providerOrderId, refundId, amount, 'Gloceries order refund');
    }
    const finished = own?.status === 'completed' && completed + (existing.some(r => r.id === own!.id) ? 0 : own.amount) >= Number(job.target_paise);
    await save(job, { status: own?.status === 'failed' ? 'failed' : finished ? 'completed' : 'processing', provider_refund_id: own?.id ?? job.provider_refund_id,
      last_error: own?.status === 'failed' ? 'Provider refund failed' : null, release: true, next_attempt_at: new Date(Date.now() + 60000).toISOString() });
  }
  catch (error) {
    logger.warn({ refundJobId: job.id, providerStatus: error instanceof CashfreeError ? error.providerStatus : undefined }, 'Order refund reconciliation delayed');
    await save(job, { status: isDefinitiveRejection(error) ? 'failed' : 'processing', last_error: 'Provider reconciliation delayed', release: true,
      next_attempt_at: new Date(Date.now() + Math.min(900000, 15000 * 2 ** Math.min(job.attempts, 6))).toISOString() });
  }
}
export async function runOrderRefunds(): Promise<void> {
  const { data, error } = await supabase.rpc('claim_order_refunds');
  if (error)
    throw error;
  const jobs = data as OrderRefundJob[] ?? [];
  for (let index = 0; index < jobs.length; index += 5)
    await Promise.all(jobs.slice(index, index + 5).map(processOrderRefund));
}
