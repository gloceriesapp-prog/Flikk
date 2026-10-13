import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { checkoutReceipt, getProviderOrder, getProviderPayment, toPaise } from './razorpayClient.js';
import type { OrderIdBody } from './types.js';
export async function validateCapturedPayment(target: OrderIdBody, paymentId: string, expectedOrderId?: string): Promise<number> {
  if (Boolean(target.orderId) === Boolean(target.tripId) || !/^pay_[A-Za-z0-9]+$/.test(paymentId)) throw new AppError(400, 'INVALID_PAYMENT_REQUEST', 'Invalid payment target.');
  const id = (target.tripId ?? target.orderId)!;
  const kind = target.tripId ? 'trip' : 'order';
  const { data: session, error: sessionError } = await supabase.from('checkout_payment_sessions').select('provider_order_id,payment_provider').eq('kind', kind).eq('target_id', id).single();
  if (sessionError) throw sessionError;
  const providerId = session.provider_order_id;
  if (session.payment_provider !== 'razorpay' || !providerId || (expectedOrderId && providerId !== expectedOrderId)) throw new AppError(409, 'PAYMENT_MISMATCH', 'Payment belongs to a different checkout.');
  const [order, payment, local] = await Promise.all([ getProviderOrder(providerId), getProviderPayment(paymentId), supabase.from(target.tripId ? 'trips' : 'orders').select('total,payment_provider,provider_payment_id').eq('id', id).single() ]);
  if (local.error) throw local.error;
  const expected = toPaise(local.data.total);
  const tag = target.tripId ? order?.notes?.gloceries_trip_id : order?.notes?.gloceries_order_id;
  if (!order || local.data.payment_provider !== 'razorpay' || tag !== id || order.receipt !== checkoutReceipt(id)
    || order.currency !== 'INR' || order.amount !== expected || payment.id !== paymentId || payment.order_id !== providerId || payment.currency !== 'INR' || payment.amount !== expected)
    throw new AppError(409, 'PAYMENT_MISMATCH', 'Payment does not match this checkout. Contact support.');
  let alreadyRecordedRefund = false;
  if (payment.status === 'refunded' && payment.captured === true) {
    alreadyRecordedRefund = local.data.provider_payment_id === paymentId;
    if (!alreadyRecordedRefund) {
      const { data: refundJob, error: refundError } = await supabase.from(target.tripId ? 'trip_refunds' : 'order_refund_jobs')
        .select('payment_id').eq(target.tripId ? 'trip_id' : 'order_id', id).maybeSingle();
      if (refundError) throw refundError;
      alreadyRecordedRefund = refundJob?.payment_id === paymentId;
    }
  }
  // A delayed authentic capture event may arrive after a full refund. Only
  // previously recorded money can take the idempotent settlement path then.
  if ((payment.status !== 'captured' && !alreadyRecordedRefund) || payment.captured !== true) throw new AppError(409, 'PAYMENT_RECONCILING', 'Your payment is still being confirmed. Please wait before paying again.');
  return expected;
}
