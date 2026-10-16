import { supabase } from '../db/supabase.js';
import { ORDER_PUSH } from '../lib/pushNotifications.js';

type Job = { id: string; order_id: string; user_id: string; lease_token: string; attempts: number; ticket_id: string | null; token: string | null; amount: number };
type Receipt = { status?: string; id?: string; details?: { error?: string } };
const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
async function finish(job: Job, outcome: string, ticket: string | null = null, error: string | null = null) {
  const { error: saveError } = await supabase.rpc('finish_merchant_order_push', {
    p_id: job.id, p_lease: job.lease_token, p_outcome: outcome,
    p_ticket: ticket, p_token: job.token, p_error: error,
  });
  if (saveError) throw saveError;
}
async function claim(receipts: boolean): Promise<Job[]> {
  const { data, error } = await supabase.rpc('claim_merchant_order_push', { p_receipts: receipts, p_limit: 50 });
  if (error) throw error;
  return (data ?? []) as Job[];
}

// Expo has no idempotency key. Persist accepted tickets immediately; once a
// ticket exists, retries only inspect its receipt and never blindly resend it.
// A process crash after Expo accepted but before persistence can still duplicate
// an OS alert; the stable notification ID lets the app deduplicate that event.
export async function runMerchantOrderNotifications(shouldStop: () => boolean = () => false) {
  const jobs = await claim(false);
  for (let start = 0; start < jobs.length && !shouldStop(); start += 5) {
    await Promise.all(jobs.slice(start, start + 5).map(async job => {
      if (!job.token) return finish(job, 'retry', null, 'No registered device yet');
      let ticket: Receipt | undefined;
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST', headers, signal: AbortSignal.timeout(15000),
          body: JSON.stringify([{ to: job.token, title: 'New order received',
            body: `Order ${job.order_id.slice(0, 6).toUpperCase()} · ₹${job.amount} — tap to view.`,
            sound: 'default', ...ORDER_PUSH,
            data: { type: 'new_order', orderId: job.order_id, notificationId: job.id } }]),
        });
        if (!response.ok) throw new Error('Push provider unavailable');
        const result = await response.json() as { data?: Receipt[] };
        if (!Array.isArray(result.data) || result.data.length !== 1) throw new Error('Invalid push response');
        ticket = result.data[0];
      } catch {
        return finish(job, 'retry', null, 'Push provider unavailable or invalid response');
      }
      // Keep persistence outside the fetch catch: a database failure must leave
      // the lease intact rather than falsely recording an ordinary provider retry.
      if (ticket?.status === 'ok' && ticket.id) return finish(job, 'ticket', ticket.id);
      if (ticket?.details?.error === 'DeviceNotRegistered') return finish(job, 'dead');
      return finish(job, 'retry', null, `Push rejected: ${ticket?.details?.error ?? 'unknown'}`);
    }));
  }
  return { more: jobs.length === 50 && !shouldStop() };
}

export async function runMerchantOrderReceipts() {
  const jobs = await claim(true);
  if (!jobs.length) return { more: false };
  let receipts: Record<string, Receipt> = {};
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
      method: 'POST', headers, signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ ids: jobs.map(job => job.ticket_id) }),
    });
    if (!response.ok) throw new Error('Receipt provider unavailable');
    const result = await response.json() as { data?: Record<string, Receipt> };
    receipts = result.data ?? {};
  } catch { /* Preserve accepted tickets; a missing receipt is not a send failure. */ }
  for (const job of jobs) {
    const receipt = job.ticket_id ? receipts[job.ticket_id] : undefined;
    if (receipt?.status === 'ok') await finish(job, 'confirmed');
    else if (receipt?.details?.error === 'DeviceNotRegistered') await finish(job, 'dead');
    else if (receipt?.status === 'error') await finish(job, 'failed', null, `Receipt failed: ${receipt.details?.error ?? 'unknown'}`);
    else await finish(job, 'receipt_pending', null, 'Receipt unavailable');
  }
  return { more: jobs.length === 50 };
}
