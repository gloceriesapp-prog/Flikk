import { env } from '../config/env.js';
import { supabase } from '../db/supabase.js';
import { logger } from '../lib/logger.js';
import { releasePayoutRequest, type PayoutRequest } from '../payments/releasePayout.js';
interface Transfer { id: string; payout_id: string; lease_token: string; request: PayoutRequest }

export async function drainPayoutReleases(kind: 'store' | 'rider', assertActive: () => Promise<void> = async () => {}) {
  // Not configured is a held settlement, not a permanent payment failure.
  if (!env.razorpayxAccountNumber) return { released: 0, blocked: 0, failed: 0 };
  await assertActive();
  const { data, error } = await supabase.rpc('claim_payout_releases', {
    p_kind: kind, p_account: env.razorpayxAccountNumber, p_limit: 25,
  });
  if (error) throw error;
  let released = 0;
  let failed = 0;
  const transfers = (data ?? []) as Transfer[];
  // Five requests at a time and 15s provider timeout bound each batch. Any
  // ambiguous outcome stays retryable with the original frozen body/key.
  for (let start = 0; start < transfers.length; start += 5) {
    await assertActive();
    await Promise.all(transfers.slice(start, start + 5).map(async transfer => {
      const { data: owned, error: ownershipError } = await supabase.rpc('renew_payout_release', {
        p_id: transfer.id, p_token: transfer.lease_token,
      });
      if (ownershipError) throw ownershipError;
      if (owned !== true) return;
      let providerId: string | null = null;
      let failure: string | null = null;
      try {
        const result = await releasePayoutRequest(transfer.request, transfer.id);
        providerId = result.razorpayPayoutId;
      } catch (err) {
        failure = 'Payout confirmation delayed; retry with original key';
        logger.error({ err, payoutId: transfer.payout_id }, 'Payout submission needs recovery');
      }
      const { data: saved, error: saveError } = await supabase.rpc('finish_payout_release', {
        p_id: transfer.id, p_token: transfer.lease_token, p_provider_id: providerId, p_error: failure,
      });
      if (saveError) throw saveError;
      if (saved) { if (providerId) released++; else failed++; }
    }));
  }
  return { released, blocked: 0, failed };
}
