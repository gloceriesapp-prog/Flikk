// Weekly rider payout — the rider-side mirror of weeklyPayouts.ts. Same two
// phases run back-to-back every Monday morning (wired in index.ts): compute
// what each rider earned for the week that just ended, then release it to the
// RazorpayX fund account they verified during onboarding
// (042_rider_onboarding.sql / verifyPayoutAccount.ts).
//
// Difference from the store side: riders are paid the delivery fee outright,
// with NO platform commission deducted (CLAUDE.md). So there's no
// gross/commission/net split — one rider_payouts.amount is the full sum of
// their unpaid rider_earnings, and calcNetPayout is deliberately not used.
//
// Safety mirrors the store job, with one rider-specific hardening:
//  - Compute is a single atomic statement (migration 051's
//    create_weekly_rider_payouts) that inserts the payout row AND links the
//    rider's unpaid earnings to it together, `on conflict do nothing`. A
//    committed row therefore always has its earnings linked, so a re-run
//    finds nothing unpaid to re-sum — no double-pay even across weeks.
//  - Release only ever touches rows still 'pending' — never re-releases a row
//    already processing/paid/failed, so a retried run can't double-pay.
//  - releasePayout throws 503 RAZORPAYX_NOT_CONFIGURED until
//    RAZORPAYX_ACCOUNT_NUMBER is set (the single Oct-4 enable gate). Until
//    then every release attempt is caught below and the row is marked
//    'failed' — the compute phase still runs and records what's owed, so no
//    earning is lost; it's just held unpaid until the account is live.
import { supabase } from '../db/supabase.js';
import { releasePayout } from '../payments/releasePayout.js';
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

// Phase 2 — release every still-pending rider_payouts row to its rider's
// verified fund account. Same shape as releasePendingPayouts, minus the
// net<=0 short-circuit's real relevance (a rider row is only created when
// there are earnings, so amount is always > 0 — kept as a defensive guard).
export async function releasePendingRiderPayouts(): Promise<{ released: number; blocked: number; failed: number }> {
  const { data: pending, error } = await supabase
    .from('rider_payouts')
    .select('id, rider_id, amount')
    .eq('status', 'pending');
  if (error) throw error;

  let released = 0;
  let blocked = 0;
  let failed = 0;

  for (const payout of pending ?? []) {
    if (payout.amount <= 0) {
      await stampEarningsPaid(payout.id);
      await supabase.from('rider_payouts').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', payout.id);
      continue;
    }

    // riders is keyed by user_id, and rider_earnings.rider_id IS the
    // users.id (001_init) — so the fund account lookup joins on user_id.
    const { data: rider } = await supabase
      .from('riders')
      .select('payout_method, razorpay_fund_account_id')
      .eq('user_id', payout.rider_id)
      .single();

    if (!rider?.payout_method || !rider.razorpay_fund_account_id) {
      // No verified payout destination — the rider never finished
      // BankDetailsScreen. Surfaced as 'blocked', same as the store side.
      await supabase.from('rider_payouts').update({ status: 'blocked' }).eq('id', payout.id);
      blocked++;
      continue;
    }

    try {
      const result = await releasePayout(
        rider.razorpay_fund_account_id,
        payout.amount,
        rider.payout_method === 'upi' ? 'UPI' : 'IMPS',
        payout.id,
      );
      await stampEarningsPaid(payout.id);
      await supabase
        .from('rider_payouts')
        .update({ status: 'processing', razorpay_payout_id: result.razorpayPayoutId, paid_at: new Date().toISOString() })
        .eq('id', payout.id);
      released++;
    } catch (err) {
      // Logged, not thrown — one rider's failed release must never abort the
      // batch. Before Oct 4 this is where every row lands (releasePayout
      // throws RAZORPAYX_NOT_CONFIGURED): compute recorded what's owed, the
      // money just waits. The webhook is the real source of truth for a
      // final paid/failed on rows that DID reach 'processing'.
      console.error('[weeklyRiderPayouts] release failed for payout', payout.id, err);
      await supabase.from('rider_payouts').update({ status: 'failed' }).eq('id', payout.id);
      failed++;
    }
  }

  return { released, blocked, failed };
}

// Stamp paid_at on every earning rolled into this payout — the settlement
// marker GET /rider/earnings orders by (was declared in 001_init but never
// written before this job existed).
async function stampEarningsPaid(payoutId: string): Promise<void> {
  await supabase.from('rider_earnings').update({ paid_at: new Date().toISOString() }).eq('rider_payout_id', payoutId);
}

export async function runWeeklyRiderPayoutJob(now: Date = new Date()): Promise<void> {
  const computeResult = await computeWeeklyRiderPayouts(now);
  console.log('[weeklyRiderPayouts] computed', computeResult);
  const releaseResult = await releasePendingRiderPayouts();
  console.log('[weeklyRiderPayouts] released', releaseResult);
}
