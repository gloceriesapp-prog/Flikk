import { enqueueTripRefund } from './tripRefunds.js';
import { supabase } from '../db/supabase.js';

// Shared by signed SDK verification and authenticated provider webhooks.
// SQL serializes capture against timeout/cancellation and never reopens an
// order whose inventory was released. Late captures use the existing refund
// workflow; failed refunds remain visible for admin retry.
export async function settleCheckoutPayment(target: { orderId?: string; tripId?: string }, paymentId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('settle_checkout_payment', {
    p_order_id: target.orderId ?? null, p_trip_id: target.tripId ?? null, p_payment_id: paymentId,
  });
  if (error) throw error;
  const result = data as { accepted: boolean; total: number };
  if (result.accepted) return true;
  if (target.tripId) { await enqueueTripRefund(target.tripId); return false; }
  // Atomic SQL trigger records the single-order refund intent when the
  // cancelled payment is recorded. The worker reconciles it after a crash.
  return false;
}
