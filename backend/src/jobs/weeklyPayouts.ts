// Weekly store payout — two phases, run back-to-back every Monday morning
// (wired via node-cron in index.ts): compute what each store earned for
// the week that just ended, then release it to whichever payout
// destination they've actually verified (verifyPayoutAccount.ts).
//
// Money math reuses this app's own real, already-tested pricing lib
// (lib/pricing.ts) and orders.commission_amount (computed once at order
// creation time, never re-derived from current data) — nothing here
// invents a commission rate of its own.
//
// Safety: payouts_store_week_unique (migration 012) is the real guard
// against ever double-computing the same store's same week — a retried
// compute pass just hits a conflict on the second attempt and moves on.
// Release only ever touches rows still in 'pending' — a row already
// 'processing'/'paid'/'failed' is never re-released, so a retried job run
// can't double-pay a store even if the unique constraint weren't there.
import { supabase } from '../db/supabase.js';
import { calcNetPayout } from '../lib/pricing.js';
import { releasePayout } from '../payments/releasePayout.js';
import { previousWeekRange, type WeekRange } from '../lib/payoutWeek.js';

// Re-exported from their new home in lib/payoutWeek.js (shared with the rider
// payout job) so existing importers — including weeklyPayouts.test.ts — keep
// working unchanged.
export { previousWeekRange, type WeekRange };

// Phase 1 — one 'pending' payouts row per store that actually delivered
// something in the target week. Stores with zero delivered orders that
// week get no row at all (nothing owed, nothing to show).
export async function computeWeeklyPayouts(now: Date = new Date()): Promise<{ created: number; skipped: number }> {
  const { start, end, startDate, endDate } = previousWeekRange(now);

  const { data: orders, error } = await supabase
    .from('orders')
    .select('store_id, item_total, commission_amount')
    .eq('status', 'delivered')
    .gte('delivered_at', start.toISOString())
    .lt('delivered_at', end.toISOString());
  if (error) throw error;

  const byStore = new Map<string, { gross: number; commission: number }>();
  for (const order of orders ?? []) {
    const entry = byStore.get(order.store_id) ?? { gross: 0, commission: 0 };
    entry.gross += order.item_total;
    entry.commission += order.commission_amount;
    byStore.set(order.store_id, entry);
  }

  let created = 0;
  let skipped = 0;
  for (const [storeId, { gross, commission }] of byStore) {
    const { error: insertErr } = await supabase.from('payouts').insert({
      store_id: storeId,
      week_start: startDate,
      week_end: endDate,
      gross_amount: gross,
      commission_deducted: commission,
      net_payout: calcNetPayout(gross, commission),
      status: 'pending',
    });
    // 23505 = unique_violation (payouts_store_week_unique) — this store's
    // row for this week already exists, a re-run is a no-op for it, not
    // an error worth surfacing.
    if (insertErr) {
      if (insertErr.code === '23505') skipped++;
      else throw insertErr;
    } else {
      created++;
    }
  }

  return { created, skipped };
}

// Phase 2 — release every still-pending row. Separate from computing so
// either phase can be re-run/retried independently (compute is safe to
// retry per the unique constraint; release is safe to retry because it
// only ever picks up rows still sitting in 'pending').
export async function releasePendingPayouts(): Promise<{ released: number; blocked: number; failed: number }> {
  const { data: pending, error } = await supabase.from('payouts').select('id, store_id, net_payout').eq('status', 'pending');
  if (error) throw error;

  let released = 0;
  let blocked = 0;
  let failed = 0;

  for (const payout of pending ?? []) {
    if (payout.net_payout <= 0) {
      // Nothing owed (e.g. every order that week was fully commission) —
      // mark paid directly, no real money movement needed or possible.
      await supabase.from('payouts').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', payout.id);
      continue;
    }

    const { data: store } = await supabase
      .from('stores')
      .select('payout_method, razorpay_fund_account_id')
      .eq('id', payout.store_id)
      .single();

    if (!store?.payout_method || !store.razorpay_fund_account_id) {
      // No verified payout destination — this is exactly what
      // ProfileSetupBanner (partner app, orders screen) should be telling
      // the owner about, not a silent failure.
      await supabase.from('payouts').update({ status: 'blocked' }).eq('id', payout.id);
      blocked++;
      continue;
    }

    try {
      const result = await releasePayout(
        store.razorpay_fund_account_id,
        payout.net_payout,
        store.payout_method === 'upi' ? 'UPI' : 'IMPS',
        payout.id,
      );
      await supabase.from('payouts').update({ status: 'processing', razorpay_payout_id: result.razorpayPayoutId }).eq('id', payout.id);
      released++;
    } catch (err) {
      // Logged, not thrown — one store's failed release must never abort
      // the rest of the batch. The webhook (webhook.ts) is the real
      // source of truth for a final paid/failed state on rows that DID
      // make it to 'processing'; this catch only covers the call itself
      // never getting accepted by Razorpay in the first place.
      console.error('[weeklyPayouts] release failed for payout', payout.id, err);
      await supabase.from('payouts').update({ status: 'failed' }).eq('id', payout.id);
      failed++;
    }
  }

  return { released, blocked, failed };
}

export async function runWeeklyPayoutJob(now: Date = new Date()): Promise<void> {
  const computeResult = await computeWeeklyPayouts(now);
  console.log('[weeklyPayouts] computed', computeResult);
  const releaseResult = await releasePendingPayouts();
  console.log('[weeklyPayouts] released', releaseResult);
}
