import { supabase } from '../db/supabase.js';
interface ReceiptJob { id: string; lease_token: string }
export async function runPushReceipts() {
  const { data, error } = await supabase.rpc('claim_push_receipts');
  if (error) throw error;
  const jobs = (data ?? []) as ReceiptJob[];
  if (!jobs.length) return;
  let receipts: Record<string, { status: string; details?: { error?: string } }> = {};
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ ids: jobs.map(j => j.id) }),
    });
    if (!response.ok) throw new Error('Receipt provider unavailable');
    receipts = (await response.json()).data ?? {};
  } catch { /* Keep pending work; the database bounds attempts and age. */ }
  for (const job of jobs) {
    const receipt = receipts[job.id];
    const { error: saveError } = await supabase.rpc('save_push_receipt', {
      p_id: job.id, p_lease: job.lease_token, p_status: !receipt ? 'pending' : receipt.status === 'ok' ? 'confirmed' : 'failed',
      p_error: receipt?.details?.error ?? (!receipt ? 'Receipt unavailable' : null),
    });
    if (saveError) throw saveError;
  }
}
