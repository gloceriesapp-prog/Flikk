import { supabase } from '../db/supabase.js';
import { drainPayoutReleases } from '../workers/payoutReleases.js';
import { previousWeekRange } from '../lib/payoutWeek.js';

// Phase 1 — one 'pending' rider_payouts row per rider with unpaid earnings,
// created ATOMICALLY with the linking of those earnings to it (migration 051's
// create_weekly_rider_payouts does the insert + the rider_payout_id stamp in
// one statement). "Unpaid" = rider_payout_id is null (never rolled into any
// payout yet). We deliberately sweep ALL still-unpaid earnings, not just this
// week's: a straggler left behind by a prior blocked/failed week gets picked
// up here and settled, so nothing is ever stranded. week_start/week_end just
// label the settlement run.
//
// The atomicity matters for money: an earlier version inserted the payout row
// and then stamped the earnings in a SEPARATE write, so a crash between the
// two could leave a payable row with its earnings still unlinked — re-summed
// and paid again the following week. One statement removes that window.
export async function computeWeeklyRiderPayouts(now: Date = new Date()): Promise<{ created: number }> {
  const { startDate, endDate } = previousWeekRange(now);

  const { data: created, error } = await supabase.rpc('create_weekly_rider_payouts', {
    p_week_start: startDate,
    p_week_end: endDate,
  });
  if (error) throw error;

  return { created: created ?? 0 };
}

// Durable, frozen provider requests and per-transfer leases allow recovery
// after a worker crash without repeating a transfer.
export function releasePendingRiderPayouts(guard?: () => Promise<void>) {
  return drainPayoutReleases('rider', guard);
}
export async function runWeeklyRiderPayoutJob(now: Date = new Date(), guard: () => Promise<void> = async () => {}): Promise<void> {
  await guard();
  await computeWeeklyRiderPayouts(now);
  await releasePendingRiderPayouts(guard);
}
