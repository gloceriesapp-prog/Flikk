import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { razorpay } from './razorpayClient.js';
import type { OrderIdBody } from './types.js';

// A signed SDK callback is not enough: it must belong to this checkout and
// be captured for this exact saved amount. Webhooks use the same binding.
export async function validateCapturedPayment(target: OrderIdBody, paymentId: string, expectedOrderId?: string) {
  if (Boolean(target.orderId) === Boolean(target.tripId)) throw new AppError(400, 'INVALID_PAYMENT_REQUEST', 'Choose exactly one payment target.');
  const id = (target.tripId ?? target.orderId)!;
  const payment = await razorpay.payments.fetch(paymentId);
  if (!payment.order_id || (expectedOrderId && payment.order_id !== expectedOrderId))
    throw new AppError(409, 'PAYMENT_MISMATCH', 'Payment belongs to a different order.');
  const [provider, local, session] = await Promise.all([
    razorpay.orders.fetch(payment.order_id),
    supabase.from(target.tripId ? 'trips' : 'orders').select('total').eq('id', id).single(),
    supabase.from('checkout_payment_sessions').select('provider_order_id').eq('kind', target.tripId ? 'trip' : 'order').eq('target_id', id).maybeSingle(),
  ]);
  if (local.error || session.error) throw local.error ?? session.error;
  if (provider.receipt !== id || provider.currency !== 'INR' || payment.currency !== 'INR'
    || Number(provider.amount) !== Math.round(Number(local.data.total) * 100)
    || Number(payment.amount) !== Number(provider.amount)
    || (session.data?.provider_order_id && session.data.provider_order_id !== payment.order_id))
    throw new AppError(409, 'PAYMENT_MISMATCH', 'Payment does not match this checkout. Contact support.');
  if (payment.status !== 'captured') throw new AppError(409, 'PAYMENT_RECONCILING', 'Your payment is still being confirmed. Please wait before paying again.');
}
