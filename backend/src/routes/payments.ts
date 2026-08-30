// Razorpay webhook. Source: specs/05-platform/payments.md
// Signature verification is mandatory — an unsigned/invalid payload must never
// change payment state. No card/UPI data is ever stored here, only Razorpay's
// own payment id.
import crypto from 'node:crypto';
import { Router } from 'express';
import { env } from '../config/env.js';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { razorpay } from '../lib/razorpay.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';

export const paymentsRouter = Router();

interface CreateOrderBody {
  // Our own `orders.id` (from POST /orders) — required so the webhook above
  // can write razorpay_payment_id back to the right row via notes.flikk_order_id.
  orderId: string;
}

// POST /payments/create-order — client calls this after POST /orders
// succeeds, then opens Razorpay Checkout with the returned id. The secret
// key never leaves this process; the client only gets an order id + key_id.
// Amount is never trusted from the client — it's read from the order row
// itself, which the customer app has no write access to.
paymentsRouter.post('/create-order', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const { orderId } = req.body as CreateOrderBody;
    if (!orderId) {
      throw new AppError(400, 'INVALID_PAYMENT_REQUEST', 'orderId is required.');
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('id, customer_id, total')
      .eq('id', orderId)
      .single();
    if (error || !order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    if (order.customer_id !== req.user!.id) throw new AppError(403, 'FORBIDDEN', 'Not your order.');

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.total * 100), // paise — trust the order's own stored total, not the client-supplied amount
      currency: 'INR',
      receipt: order.id,
      notes: { flikk_order_id: order.id },
    });

    res.status(201).json({
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: env.razorpayKeyId,
    });
  } catch (err) {
    next(err);
  }
});

// Real Razorpay Checkout SDK success callback (apps/customer's own
// openRazorpayCheckout.ts, react-native-razorpay) lands here — this is the
// one and only place a customer's own claim "I paid" is ever allowed to
// mark an order paid, and it never trusts that claim at face value.
// Razorpay's own documented verification: HMAC-SHA256 of
// "<razorpay_order_id>|<razorpay_payment_id>" using the account's key
// secret must equal razorpay_signature exactly. Nothing about "the client
// says checkout succeeded" is trusted without this — a forged/replayed/
// tampered success payload (any of the three ids altered) fails the HMAC
// and gets rejected outright, same bulletproof-by-construction reasoning
// the webhook below already uses for its own signature. This is what
// actually closes out the "can this be scammed" question POST /orders'
// own address-ownership check started answering.
interface VerifyPaymentBody {
  orderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

function verifyCheckoutSignature(razorpayOrderId: string, razorpayPaymentId: string, signature: string): boolean {
  const expected = crypto.createHmac('sha256', env.razorpayKeySecret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex');
  // Both sides must be equal length for timingSafeEqual — a signature of
  // the wrong length is already invalid, checked first so this never
  // throws instead of just returning false for a malformed attempt.
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

paymentsRouter.post('/verify', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
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
      // Already paid (the webhook below could theoretically have landed
      // first) — idempotent no-op, not an error.
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
});

function verifySignature(rawBody: string, signature: string): boolean {
  const expected = crypto.createHmac('sha256', env.razorpayWebhookSecret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

paymentsRouter.post('/webhook', async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const rawBody = (req as unknown as { rawBody: string }).rawBody;
    if (!signature || !rawBody || !verifySignature(rawBody, signature)) {
      throw new AppError(401, 'INVALID_SIGNATURE', 'Webhook signature verification failed.');
    }

    const event = req.body;
    if (event.event === 'payment.captured') {
      const orderId = event.payload.payment.entity.notes?.flikk_order_id;
      const paymentId = event.payload.payment.entity.id;
      if (orderId) {
        const { error } = await supabase.from('orders').update({ razorpay_payment_id: paymentId }).eq('id', orderId);
        if (error) throw error;
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
});
