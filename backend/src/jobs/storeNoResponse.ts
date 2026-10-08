import { supabase } from '../db/supabase.js';
import { logger } from '../lib/logger.js';
import { metrics } from '../observability/metrics.js';

// Server-side safety net for orders a store never answers. The partner app
// also auto-rejects on its own timer, but only while it is open; this job
// does it regardless. cancel_unanswered_store_orders (migration 109) cancels
// every order still 'placed' longer than delivery_settings
// .store_response_timeout_minutes after it reached the store (COD at
// checkout, online once paid; unpaid checkouts are left to reservation
// expiry) with reason STORE_NO_RESPONSE_REASON, through the same paths as a
// partner reject: single orders get the guarded status write (stock released,
// refund queued, customer notification row -> customerNotifications push
// worker), trip legs cancel the whole trip via cancel_trip_from_leg.
export const STORE_NO_RESPONSE_REASON = 'store_no_response';
export const STORE_NO_RESPONSE_BATCH = 50;

export interface StoreNoResponseBatch {
  cancelled_orders: number;
  single_targets: number;
  trip_targets: number;
  timeout_minutes: number;
}

export async function cancelUnansweredOrders(): Promise<StoreNoResponseBatch> {
  const { data, error } = await supabase.rpc('cancel_unanswered_store_orders', { p_limit: STORE_NO_RESPONSE_BATCH });
  if (error) throw error;
  const counts = [data?.cancelled_orders, data?.single_targets, data?.trip_targets];
  if (!data || !counts.every(n => Number.isInteger(n) && n >= 0)
    || data.single_targets > STORE_NO_RESPONSE_BATCH || data.trip_targets > STORE_NO_RESPONSE_BATCH) {
    throw new Error('Invalid store no-response batch');
  }
  metrics.increment('flikk_store_no_response_cancelled_total', {}, data.cancelled_orders);
  if (data.cancelled_orders) {
    logger.info({ cancelled: data.cancelled_orders, singles: data.single_targets, trips: data.trip_targets, timeoutMinutes: data.timeout_minutes },
      'Cancelled orders the store did not answer');
  }
  return data;
}

// Queue consumer: a full batch asks the runner for a prompt next pass.
export async function runStoreNoResponse(
  shouldStop: () => boolean = () => false,
  batch: () => Promise<StoreNoResponseBatch> = cancelUnansweredOrders,
): Promise<{ more: boolean }> {
  if (shouldStop()) return { more: false };
  const result = await batch();
  const more = result.single_targets === STORE_NO_RESPONSE_BATCH || result.trip_targets === STORE_NO_RESPONSE_BATCH;
  return { more: more && !shouldStop() };
}
