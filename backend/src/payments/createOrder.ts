import { paymentTarget, ensureProviderOrder, requirePaymentRetrySafe } from './recovery.js';
// POST /payments/create-order — client calls this after POST /orders
// succeeds, then opens Razorpay Checkout with the returned id. The secret
// key never leaves this process; the client only gets an order id + key_id.
// Amount is never trusted from the client — it's read from the order row
// itself, which the customer app has no write access to.
import type { Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import type { AuthedRequest } from '../middleware/auth.js';

export async function createOrder(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const target = paymentTarget(req.body);
    const order = await ensureProviderOrder(target, req.user!.id);
    await requirePaymentRetrySafe(target, order.id, Number(order.amount) / 100);
    res.status(200).json({ id: order.id, amount: Number(order.amount), currency: order.currency, key_id: env.razorpayKeyId });
  } catch (error) { next(error); }
}
