// POST /payments/create-order — client calls this after POST /orders (or
// /trips) succeeds, then opens Cashfree checkout (RN SDK) with the returned
// payment_session_id. Amount is never trusted from the client — it's read
// from the order row, which the customer app has no write access to.
import type { Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { paymentTarget, ensureProviderOrder, requirePaymentRetrySafe } from './recovery.js';
import { AppError } from '../lib/errors.js';

export async function createOrder(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const target = paymentTarget(req.body);
    const order = await ensureProviderOrder(target, req.user!.id);
    await requirePaymentRetrySafe(target, order.order_id, order.order_amount);
    if (!order.payment_session_id) throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'Could not start payment. Please retry.');
    res.status(200).json({
      provider: 'cashfree',
      providerOrderId: order.order_id,
      paymentSessionId: order.payment_session_id,
      amount: order.order_amount,
      expiresAt: order.order_expiry_time ?? null,
      environment: env.cashfreeEnv,
    });
  } catch (error) { next(error); }
}
