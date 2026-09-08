// POST /payments/create-order — client calls this after POST /orders
// succeeds, then opens Razorpay Checkout with the returned id. The secret
// key never leaves this process; the client only gets an order id + key_id.
// Amount is never trusted from the client — it's read from the order row
// itself, which the customer app has no write access to.
import type { Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { razorpay } from './razorpayClient.js';
import type { OrderIdBody } from './types.js';

export async function createOrder(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { orderId } = req.body as OrderIdBody;
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
}
