import { supabase } from '../db/supabase.js';
import { logger } from '../lib/logger.js';
import { metrics } from '../observability/metrics.js';

// Issue #26: a loud, pipeline-friendly alert on money/dispatch states that
// have gone stuck. No paid SaaS — just a metric the founder's Prometheus can
// alert on and a WARN/ERROR structured log the log pipeline can page on.
//
// Covered here (periodic scan):
//   - refund jobs stuck 'processing'/'queued' past STUCK_REFUND_MINUTES, and
//     any refund already 'failed'/'manual_required' (needs a hand, any age).
//   - orders that exhausted dispatch (broadcast started, nobody accepted) and
//     still have rider_id null past STUCK_DISPATCH_MINUTES.
//
// PAYMENT_REVIEW_REQUIRED is NOT a persisted order state (it is only ever an
// API error raised when provider records disagree with ours), so it cannot be
// scanned for. It is surfaced as an event counter at the error boundary
// instead (middleware/errorHandler.ts: flikk_payment_review_required_total).

export const STUCK_REFUND_MINUTES = Number(process.env.STUCK_REFUND_MINUTES ?? 15);
export const STUCK_DISPATCH_MINUTES = Number(process.env.STUCK_DISPATCH_MINUTES ?? 3);
const REFUND_ACTION_STATES = new Set(['failed', 'manual_required']);
const REFUND_IN_FLIGHT_STATES = new Set(['queued', 'processing']);

export interface RefundRow { status: string; updated_at: string | null }
export interface RefundSummary { processingStuck: number; needingAction: number }
export interface StuckStateSummary extends RefundSummary { dispatchExhausted: number }

// Pure: classify refund rows into "in-flight too long" vs "needs a human".
// A row with no/unparseable updated_at is treated as old (fail loud, not silent).
export function summarizeStuckRefunds(rows: RefundRow[], now: number, stuckMs: number): RefundSummary {
  let processingStuck = 0;
  let needingAction = 0;
  for (const row of rows) {
    if (REFUND_ACTION_STATES.has(row.status)) {
      needingAction++;
    } else if (REFUND_IN_FLIGHT_STATES.has(row.status)) {
      const at = row.updated_at ? Date.parse(row.updated_at) : NaN;
      if (!Number.isFinite(at) || at <= now - stuckMs) processingStuck++;
    }
  }
  return { processingStuck, needingAction };
}

async function fetchRefundRows(): Promise<RefundRow[]> {
  const [orderJobs, tripJobs] = await Promise.all([
    supabase.from('order_refund_jobs').select('status,updated_at').neq('status', 'completed'),
    supabase.from('trip_refunds').select('status,updated_at').neq('status', 'completed'),
  ]);
  if (orderJobs.error) throw orderJobs.error;
  if (tripJobs.error) throw tripJobs.error;
  return [...(orderJobs.data ?? []), ...(tripJobs.data ?? [])] as RefundRow[];
}

async function countExhaustedDispatch(now: number): Promise<number> {
  const cutoff = new Date(now - STUCK_DISPATCH_MINUTES * 60_000).toISOString();
  const { count, error } = await supabase.from('orders').select('id', { count: 'exact', head: true })
    .eq('status', 'packed').is('rider_id', null).not('dispatch_broadcast_at', 'is', null).lt('dispatch_broadcast_at', cutoff);
  if (error) throw error;
  return count ?? 0;
}

// Scheduled job (workers/jobs.ts). Emits gauges on the shared registry and a
// loud log per non-zero class so the existing pipeline can alert on either.
export async function runStuckStateAlerts(
  _scheduledFor: Date = new Date(),
  guard: () => Promise<void> = async () => {},
): Promise<StuckStateSummary> {
  await guard();
  const now = Date.now();
  const [refundRows, dispatchExhausted] = await Promise.all([fetchRefundRows(), countExhaustedDispatch(now)]);
  const refunds = summarizeStuckRefunds(refundRows, now, STUCK_REFUND_MINUTES * 60_000);

  metrics.gauge('flikk_stuck_refunds_processing', refunds.processingStuck);
  metrics.gauge('flikk_stuck_refunds_action_required', refunds.needingAction);
  metrics.gauge('flikk_stuck_dispatch_unassigned', dispatchExhausted);

  if (refunds.needingAction > 0) {
    logger.error({ needingAction: refunds.needingAction }, 'Refunds need manual action (failed/manual_required)');
  }
  if (refunds.processingStuck > 0) {
    logger.warn({ processingStuck: refunds.processingStuck, thresholdMinutes: STUCK_REFUND_MINUTES }, 'Refund jobs stuck in flight past threshold');
  }
  if (dispatchExhausted > 0) {
    logger.warn({ dispatchExhausted, thresholdMinutes: STUCK_DISPATCH_MINUTES }, 'Packed orders exhausted dispatch with no rider assigned');
  }
  return { ...refunds, dispatchExhausted };
}
