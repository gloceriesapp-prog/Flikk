import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { cashfreeOrderId, getCfOrder, getCfOrderPayments, toPaise } from './cashfreeClient.js';
import type { OrderIdBody } from './types.js';

// A webhook (or any client claim) is not enough: re-read Cashfree and require
// that the payment belongs to THIS checkout's Cashfree order, succeeded, and
// is for this exact saved amount.
export async function validateCapturedPayment(target: OrderIdBody, paymentId: string, expectedOrderId?: string) {
  if (Boolean(target.orderId) === Boolean(target.tripId)) throw new AppError(400, 'INVALID_PAYMENT_REQUEST', 'Choose exactly one payment target.');
  const id = (target.tripId ?? target.orderId)!;
  const providerOrderId = cashfreeOrderId(id);
  if (expectedOrderId && expectedOrderId !== providerOrderId) throw new AppError(409, 'PAYMENT_MISMATCH', 'Payment belongs to a different order.');
  const [order, payments, local] = await Promise.all([
    getCfOrder(providerOrderId),
    getCfOrderPayments(providerOrderId),
    supabase.from(target.tripId ? 'trips' : 'orders').select('total').eq('id', id).single(),
  ]);
  if (local.error) throw local.error;
  const expected = toPaise(Number(local.data.total));
  const tag = target.tripId ? order?.order_tags?.gloceries_trip_id : order?.order_tags?.gloceries_order_id;
  const payment = payments.find((item) => String(item.cf_payment_id) === paymentId);
  if (!order || !payment || tag !== id || order.order_currency !== 'INR' || toPaise(order.order_amount) !== expected
    || payment.order_id !== providerOrderId || payment.payment_currency !== 'INR' || toPaise(payment.payment_amount) !== expected)
    throw new AppError(409, 'PAYMENT_MISMATCH', 'Payment does not match this checkout. Contact support.');
  if (payment.payment_status !== 'SUCCESS') throw new AppError(409, 'PAYMENT_RECONCILING', 'Your payment is still being confirmed. Please wait before paying again.');
}
