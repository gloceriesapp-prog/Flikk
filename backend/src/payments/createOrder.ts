import type { Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { env } from '../config/env.js';
import { supabase } from '../db/supabase.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { paymentTarget, ensureProviderOrder, requirePaymentRetrySafe } from './recovery.js';
export async function createOrder(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    if (req.body?.provider !== 'razorpay') throw new AppError(409, 'PAYMENT_APP_UPDATE_REQUIRED', 'Update the app to use online payments.');
    const target = paymentTarget(req.body);
    const order = await ensureProviderOrder(target, req.user!.id);
    await requirePaymentRetrySafe(target, order.id, order.amount / 100);
    const { data: leg, error } = await supabase.from('orders').select('reservation_expires_at').eq(target.kind === 'trip' ? 'trip_id' : 'id', target.id).limit(1).maybeSingle();
    if (error) throw error;
    const deadline = Date.parse(leg?.reservation_expires_at ?? '');
    if (!Number.isFinite(deadline) || deadline <= Date.now()) throw new AppError(409, 'PAYMENT_NOT_PAYABLE', 'This checkout has expired.');
    res.setHeader('Cache-Control', 'no-store');
    res.json({ provider: 'razorpay', keyId: env.razorpayKeyId, providerOrderId: order.id,
      amount: order.amount / 100, amountPaise: order.amount, currency: 'INR', expiresAt: new Date(deadline).toISOString(),
      environment: env.razorpayKeyId?.startsWith('rzp_live_') ? 'production' : 'sandbox' });
  } catch (error) { next(error); }
}
