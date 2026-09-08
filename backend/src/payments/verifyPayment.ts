// POST /payments/verify — real Razorpay Checkout SDK success callback
// (apps/customer's payments/openRazorpayCheckout.ts, react-native-
// razorpay) lands here — this is the one and only place a customer's own
// claim "I paid" is ever allowed to mark an order paid, and it never
// trusts that claim at face value. Razorpay's own documented
// verification: HMAC-SHA256 of "<razorpay_order_id>|<razorpay_payment_id>"
// using the account's key secret must equal razorpay_signature exactly.
// Nothing about "the client says checkout succeeded" is trusted without
// this — a forged/replayed/tampered success payload (any of the three
// ids altered) fails the HMAC and gets rejected outright, same
// bulletproof-by-construction reasoning webhook.ts uses for its own
// signature. This is what actually closes out the "can this be scammed"
// question POST /orders' own address-ownership check started answering.
import crypto from 'node:crypto';
import type { Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import type { AuthedRequest } from '../middleware/auth.js';
import type { VerifyPaymentBody } from './types.js';

function verifyCheckoutSignature(razorpayOrderId: string, razorpayPaymentId: string, signature: string): boolean {
  const expected = crypto.createHmac('sha256', env.razorpayKeySecret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex');
  // Both sides must be equal length for timingSafeEqual — a signature of
  // the wrong length is already invalid, checked first so this never
  // throws instead of just returning false for a malformed attempt.
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function verifyPayment(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as Partial<VerifyPaymentBody>;
    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new AppError(400, 'INVALID_PAYMENT_REQUEST', 'orderId, razorpay_order_id, razorpay_payment_id, and razorpay_signature are all required.');
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('id, customer_id, razorpay_payment_id')
      .eq('id', orderId)
      .single();
    if (error || !order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    if (order.customer_id !== req.user!.id) throw new AppError(403, 'FORBIDDEN', 'Not your order.');
    if (order.razorpay_payment_id) {
      // Already paid (the webhook could theoretically have landed first)
      // — idempotent no-op, not an error.
      res.status(200).json({ ok: true });
      return;
    }

    if (!verifyCheckoutSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      throw new AppError(401, 'INVALID_SIGNATURE', 'Payment signature verification failed.');
    }

    const { error: updateError } = await supabase.from('orders').update({ razorpay_payment_id }).eq('id', orderId);
    if (updateError) throw updateError;

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
}
