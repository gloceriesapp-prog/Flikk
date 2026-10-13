import { supabase } from '../db/supabase.js';
import { logger } from '../lib/logger.js';
import { metrics } from '../observability/metrics.js';
import { AppError } from '../lib/errors.js';
import { paymentsConfigured } from '../payments/razorpayClient.js';
import { paymentTarget, reconcileProvider } from '../payments/recovery.js';
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

export const RECONCILE_BATCH = 25;
const PROVIDER_TIMEOUT_MS = 10_000;
interface ReconcileRow { kind: 'order' | 'trip'; target_id: string; provider_order_id: string; total: number | string }
let warnedUnconfigured = false;

// Razorpay orders cannot be terminated. Read the provider after the local
// reservation deadline, then let SQL close the checkout and release stock.
// A late capture cannot reopen it: settlement records a durable refund intent.
// A provider outage leaves reconciliation leased for retry with a bounded wait.
export async function reconcileBeforeExpiry(
  reconcile: typeof reconcileProvider = reconcileProvider,
  shouldStop: () => boolean = () => false,
): Promise<{ claimed: number }> {
  if (!paymentsConfigured) {
    if (!warnedUnconfigured) logger.warn('Razorpay keys not configured; skipping pre-expiry payment reconciliation');
    warnedUnconfigured = true;
    return { claimed: 0 };
  }
  const { data, error } = await supabase.rpc('claim_checkout_expiry_reconciliation', { p_limit: RECONCILE_BATCH });
  if (error) throw error;
  const rows = (data ?? []) as ReconcileRow[];
  for (const row of rows) {
    if (shouldStop()) break;
    const target = paymentTarget(row.kind === 'trip' ? { tripId: row.target_id } : { orderId: row.target_id });
    try {
      let timer: NodeJS.Timeout | undefined;
      const state = await Promise.race([
        reconcile(target, row.provider_order_id, Number(row.total)),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Provider read timed out')), PROVIDER_TIMEOUT_MS); }),
      ]).finally(() => clearTimeout(timer));
      if (state === 'paid') logger.info({ target: target.target }, 'Settled captured payment before expiry');
    } catch (err) {
      if (!(err instanceof AppError && err.code === 'PAYMENT_REVIEW_REQUIRED')) {
        logger.warn({ err, target: target.target }, 'Pre-expiry reconciliation deferred');
        continue;
      }
      // Amount/order mismatch needs a human; never settle it automatically.
      logger.error({ err, target: target.target }, 'Payment needs review; expiring checkout without settlement');
    }
    const { error: markError } = await supabase.rpc('mark_checkout_expiry_checked', { p_kind: row.kind, p_target_id: row.target_id });
    if (markError) throw markError;
  }
  return { claimed: rows.length };
}

export async function runReservationExpiry(shouldStop: () => boolean): Promise<{ more: boolean }> {
  const { claimed } = await reconcileBeforeExpiry(undefined, shouldStop);
  const drained = await drainExpiredReservations(undefined, shouldStop);
  return { more: (drained.more || claimed === RECONCILE_BATCH) && !shouldStop() };
}
