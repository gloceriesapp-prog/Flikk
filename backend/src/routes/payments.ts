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
