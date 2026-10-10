import { enqueueTripRefund } from './tripRefunds.js';
import { notifyStoresOfNewOrder } from './newOrderPush.js';
import { supabase } from '../db/supabase.js';

// Shared by signed SDK verification, authenticated provider webhooks and
// pre-expiry reconciliation. SQL serializes capture against timeout/
// cancellation and never reopens an order whose inventory was released.
// Late captures use the existing refund workflow; failed refunds remain
// visible for admin retry.
//
// expectedPaise is the amount the provider actually captured (validated by
// validateCapturedPayment / reconcileProvider against this checkout's total).
// Passing it threads the money invariant into the write boundary itself:
// settle_checkout_payment (migration 20261010090000) RAISEs if it does not
// equal the order/trip's own stored total, so a caller bug can never settle
// an order against a payment for the wrong amount.
export async function settleCheckoutPayment(target: { orderId?: string; tripId?: string }, paymentId: string, expectedPaise: number, currency = 'INR'): Promise<boolean> {
  const { data, error } = await supabase.rpc('settle_checkout_payment', {
    p_order_id: target.orderId ?? null, p_trip_id: target.tripId ?? null, p_payment_id: paymentId,
    p_expected_paise: expectedPaise, p_currency: currency,
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
