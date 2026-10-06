import { supabase } from '../db/supabase.js';
import { previousWeekRange, type WeekRange } from '../lib/payoutWeek.js';
import { drainPayoutReleases } from '../workers/payoutReleases.js';
export { previousWeekRange, type WeekRange };

// All delivered rows are aggregated transactionally in PostgreSQL. Repeated
// compute attempts are no-ops through the store/week unique constraint.
export async function computeWeeklyPayouts(now: Date = new Date()): Promise<{ created: number; skipped: number }> {
  const week = previousWeekRange(now);
  const { data, error } = await supabase.rpc('compute_store_payouts', {
    p_start: week.start.toISOString(), p_end: week.end.toISOString(),
    p_start_date: week.startDate, p_end_date: week.endDate,
  });
  if (error) throw error;
  return { created: data ?? 0, skipped: 0 };
}
export function releasePendingPayouts(guard?: () => Promise<void>) {
  return drainPayoutReleases('store', guard);
}
export async function runWeeklyPayoutJob(now: Date = new Date(), guard: () => Promise<void> = async () => {}): Promise<void> {
  await guard();
  await computeWeeklyPayouts(now);
  await releasePendingPayouts(guard);
}
