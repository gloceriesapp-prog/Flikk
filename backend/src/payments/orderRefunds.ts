import { supabase } from '../db/supabase.js';
import { razorpayBasicAuthHeader } from './razorpayClient.js';
import { logger } from '../lib/logger.js';
export interface OrderRefundJob {
  id: string;
  order_id: string;
  payment_id: string;
  target_paise: number;
  request_key: string;
  request_paise: number | null;
  provider_refund_id: string | null;
  lease_token: string;
  attempts: number;
}
interface Refund {
  id: string;
  amount: number;
  status: 'pending' | 'processed' | 'failed';
}
class RefundProviderError extends Error {
  constructor(readonly status: number) { super(`Refund provider HTTP ${status}`); }
}
async function request(path: string, init: RequestInit = {}, deadline = Date.now() + 15000) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error('Refund work budget exceeded');
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init, headers: { Authorization: razorpayBasicAuthHeader(), 'Content-Type': 'application/json', ...init.headers }, signal: AbortSignal.timeout(Math.min(15000, remaining)),
  });
  if (!response.ok)
    throw new RefundProviderError(response.status);
  return response.json();
}
function validRefund(value: Refund) {
  if (!value.id || !Number.isSafeInteger(value.amount) || value.amount <= 0 || !['pending', 'processed', 'failed'].includes(value.status))
    throw new Error('Invalid provider refund');
  return value;
}
async function allRefunds(payment: string, deadline: number): Promise<Refund[]> {
  const items: Refund[] = [];
  for (let skip = 0; skip < 10000; skip += 100) {
    const page = await request(`/payments/${encodeURIComponent(payment)}/refunds?count=100&skip=${skip}`, {}, deadline) as {
      items: Refund[];
    };
    if (!Array.isArray(page.items))
      throw new Error('Invalid refund page');
    items.push(...page.items.map(validRefund));
    if (page.items.length < 100)
      return [...new Map(items.map(item => [item.id, item])).values()];
  }
  throw new Error('Refund pagination limit reached');
}
async function save(job: OrderRefundJob, patch: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('save_order_refund', { p_id: job.id, p_lease: job.lease_token, p_patch: patch });
  if (error)
    throw error;
  return data === true;
}
export async function processOrderRefund(job: OrderRefundJob): Promise<void> {
  try {
    const deadline = Date.now() + 60000;
    const existing = await allRefunds(job.payment_id, deadline);
    const completed = existing.filter(r => r.status === 'processed').reduce((sum, r) => sum + r.amount, 0);
    const reserved = existing.filter(r => r.status !== 'failed').reduce((sum, r) => sum + r.amount, 0);
    let own = existing.find(r => r.id === job.provider_refund_id);
    if (completed >= Number(job.target_paise)) {
      await save(job, { status: 'completed', provider_refund_id: job.provider_refund_id ?? existing.find(r => r.status === 'processed')?.id, release: true });
      return;
    }
    if (own?.status === 'failed') {
      await save(job, { status: 'failed', last_error: 'Provider refund failed', release: true });
      return;
    }
    if (!own && (job.request_paise !== null || reserved < Number(job.target_paise))) {
      const amount = Number(job.request_paise ?? Number(job.target_paise) - reserved);
      if (!Number.isSafeInteger(amount) || amount <= 0)
        throw new Error('Invalid refund amount');
      // Freeze before provider call; lost responses retry the same key/body.
      if (!await save(job, { request_paise: amount }))
        return;
      own = validRefund(await request(`/payments/${encodeURIComponent(job.payment_id)}/refund`, {
        method: 'POST', headers: { 'X-Refund-Idempotency': job.request_key },
        body: JSON.stringify({ amount, speed: 'normal' }),
      }, deadline) as Refund);
      if (own.amount !== amount) throw new Error('Provider refund amount mismatch');
    }
    const finished = own?.status === 'processed' && completed + (existing.some(r => r.id === own!.id) ? 0 : own.amount) >= Number(job.target_paise);
    await save(job, { status: own?.status === 'failed' ? 'failed' : finished ? 'completed' : 'processing', provider_refund_id: own?.id,
      last_error: own?.status === 'failed' ? 'Provider refund failed' : null, release: true, next_attempt_at: new Date(Date.now() + 60000).toISOString() });
  }
  catch (error) {
    logger.warn({ refundJobId: job.id, providerStatus: error instanceof RefundProviderError ? error.status : undefined }, 'Order refund reconciliation delayed');
    await save(job, { status: error instanceof RefundProviderError && [400, 401, 403, 404, 422].includes(error.status) ? 'failed' : 'processing', last_error: 'Provider reconciliation delayed', release: true,
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
