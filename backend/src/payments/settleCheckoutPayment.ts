import { enqueueTripRefund } from './tripRefunds.js';
import { notifyStoresOfNewOrder } from './newOrderPush.js';
import { supabase } from '../db/supabase.js';

// Shared by signed SDK verification, authenticated provider webhooks and
// pre-expiry reconciliation. SQL serializes capture against timeout/
// cancellation and never reopens an order whose inventory was released.
// Late captures use the existing refund workflow; failed refunds remain
// visible for admin retry.
export async function settleCheckoutPayment(target: { orderId?: string; tripId?: string }, paymentId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('settle_checkout_payment', {
    p_order_id: target.orderId ?? null, p_trip_id: target.tripId ?? null, p_payment_id: paymentId,
  });
  if (error) throw error;
  const result = data as { accepted: boolean; total: number; settled_now?: boolean };
  if (result.accepted) {
    // settled_now (migration 096) keeps webhook + verify from double-pushing;
    // before 096 is applied every accepted settle pushes.
    if (result.settled_now ?? true) void notifyStoresOfNewOrder(target);
    return true;
  }
  if (target.tripId) { await enqueueTripRefund(target.tripId); return false; }
  // Atomic SQL trigger records the single-order refund intent when the
  // cancelled payment is recorded. The worker reconciles it after a crash.
  return false;
}
