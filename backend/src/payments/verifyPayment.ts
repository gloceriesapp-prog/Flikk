// POST /payments/verify { orderId|tripId } — the client says "I'm back from
// checkout / the UPI app". Nothing from the client is trusted: the server
// reads Cashfree's own record of this checkout's order + payments and settles
// only a SUCCESS payment for the exact saved amount (recovery.ts's
// reconcileProvider → settle_checkout_payment). Idempotent: a webhook that
// already settled it makes this a no-op that still answers 'paid'.
import type { Response, NextFunction } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { cashfreeOrderId } from './cashfreeClient.js';
import { paymentTarget, reconcileProvider } from './recovery.js';

export async function verifyPayment(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const target = paymentTarget(req.body ?? {});
    const { data: record, error } = await supabase.from(target.table).select('id, customer_id, total, provider_payment_id, checkout_payment_rejected').eq('id', target.id).maybeSingle();
    if (error) throw error;
    if (!record) throw new AppError(404, target.kind === 'trip' ? 'TRIP_NOT_FOUND' : 'ORDER_NOT_FOUND', `${target.kind === 'trip' ? 'Trip' : 'Order'} not found.`);
    if (record.customer_id !== req.user!.id) throw new AppError(403, 'FORBIDDEN', target.kind === 'trip' ? 'Not your trip.' : 'Not your order.');
    res.setHeader('Cache-Control', 'no-store');
    const state = record.checkout_payment_rejected ? 'cancelled' : record.provider_payment_id ? 'paid'
      : await reconcileProvider(target, cashfreeOrderId(target.id), Number(record.total));
    if (state === 'cancelled') throw new AppError(409, 'PAYMENT_ORDER_EXPIRED', 'This order expired or was cancelled. Check Purchase history for your payment and refund status.');
    res.json({ ok: state === 'paid', state });
  } catch (err) {
    next(err);
  }
}
