import type { Response, NextFunction } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { verifyCheckoutSignature } from './razorpayClient.js';
import { paymentTarget, reconcileProvider, recoverProviderOrder } from './recovery.js';
import { validateCapturedPayment } from './validateCapturedPayment.js';
import { settleCheckoutPayment } from './settleCheckoutPayment.js';
export async function verifyPayment(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const target = paymentTarget(req.body ?? {});
    const { data: record, error } = await supabase.from(target.table).select('id,customer_id,total,provider_payment_id,checkout_payment_rejected,payment_provider').eq('id', target.id).maybeSingle();
    if (error) throw error;
    if (!record) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    if (record.customer_id !== req.user!.id) throw new AppError(403, 'FORBIDDEN', 'Not your checkout.');
    if (record.payment_provider !== 'razorpay') throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'This checkout used an earlier payment system. Contact support.');
    const order = await recoverProviderOrder(target, Number(record.total));
    if (!order) throw new AppError(409, 'PAYMENT_RECONCILING', 'Payment is being confirmed. Please retry shortly.');
    const fields = [req.body.razorpay_order_id, req.body.razorpay_payment_id, req.body.razorpay_signature];
    if (fields.some(value => value !== undefined)) {
      if (!fields.every(value => typeof value === 'string') || fields[0] !== order.id || !verifyCheckoutSignature(order.id, fields[1]!, fields[2]!))
        throw new AppError(401, 'INVALID_PAYMENT_SIGNATURE', 'Payment signature verification failed.');
      const paise = await validateCapturedPayment(target.target, fields[1]!, order.id);
      await settleCheckoutPayment(target.target, fields[1]!, paise, 'INR', order.id);
    }
    const state = await reconcileProvider(target, order.id, Number(record.total));
    if (state === 'cancelled') throw new AppError(409, 'PAYMENT_ORDER_EXPIRED', 'This checkout expired or was cancelled. Check Purchase history for refund updates.');
    res.setHeader('Cache-Control', 'no-store'); res.json({ ok: state === 'paid', state });
  } catch (error) { next(error); }
}
