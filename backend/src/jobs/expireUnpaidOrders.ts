import { supabase } from '../db/supabase.js';
import { logger } from '../lib/logger.js';
import { metrics } from '../observability/metrics.js';
export interface ExpiryBatch { cancelled_orders: number; single_targets: number; trip_targets: number }

// One transaction handles at most 100 parents per kind. Row locks and
// payment checks remain authoritative; counts refer to parents, not trip legs.
export async function expireUnpaidOrders(): Promise<ExpiryBatch> {
  const { data, error } = await supabase.rpc('expire_checkout_reservation_batch', { p_limit: 100 });
  if (error) throw error;
  if (!data || ![data.cancelled_orders, data.single_targets, data.trip_targets].every(n => Number.isInteger(n) && n >= 0)
    || data.single_targets > 100 || data.trip_targets > 100) throw new Error('Invalid reservation expiry batch');
  metrics.increment('flikk_expired_orders_total', {}, data.cancelled_orders);
  if (data.cancelled_orders) logger.info({ cancelled: data.cancelled_orders, singles: data.single_targets, trips: data.trip_targets }, 'Expired unpaid checkout reservations');
  return data;
}

// Yield to the event loop between full batches. A time/count budget prevents
// a burst monopolizing a worker; a full final batch requests a prompt new pass.
export async function drainExpiredReservations(
  batch: () => Promise<ExpiryBatch> = expireUnpaidOrders,
  shouldStop: () => boolean = () => false,
): Promise<{ more: boolean }> {
  const started = Date.now();
  let more = false;
  for (let n = 0; n < 10 && !shouldStop(); n++) {
    const result = await batch();
    more = result.single_targets === 100 || result.trip_targets === 100;
    if (!more || Date.now() - started >= 5000) break;
    await new Promise<void>(resolve => setImmediate(resolve));
  }
  return { more: more && !shouldStop() };
}
