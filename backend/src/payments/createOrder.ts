import type { Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { env } from '../config/env.js';
import { supabase } from '../db/supabase.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { paymentTarget, requirePaymentRetrySafe } from './recovery.js';
import { ensureCheckoutOrder } from './gateway.js';
// Old builds send provider:'razorpay' and only ever get Razorpay. Builds with
// the Cashfree SDK send provider:'auto' + supports:['razorpay','cashfree'];
// the admin gateway setting then picks (gateway.ts). Amounts always come from
// the persisted checkout, never from the request.
export async function createOrder(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const requested = req.body?.provider;
    const supports: unknown = req.body?.supports;
    const supportsCashfree = requested === 'auto' && Array.isArray(supports) && supports.includes('cashfree') && supports.includes('razorpay');
    if (requested !== 'razorpay' && !supportsCashfree) throw new AppError(409, 'PAYMENT_APP_UPDATE_REQUIRED', 'Update the app to use online payments.');
    const target = paymentTarget(req.body);
    const reservationDeadline = async () => {
      const { data: leg, error } = await supabase.from('orders').select('reservation_expires_at').eq(target.kind === 'trip' ? 'trip_id' : 'id', target.id).limit(1).maybeSingle();
      if (error) throw error;
      return Date.parse(leg?.reservation_expires_at ?? '');
    };
    const expiresAt = await reservationDeadline();
    const checkout = await ensureCheckoutOrder(target, req.user!.id, supportsCashfree, new Date(Number.isFinite(expiresAt) ? expiresAt : Date.now()));
    await requirePaymentRetrySafe(target, checkout.order.id, checkout.order.amount / 100);
    const deadline = await reservationDeadline();
    if (!Number.isFinite(deadline) || deadline <= Date.now()) throw new AppError(409, 'PAYMENT_NOT_PAYABLE', 'This checkout has expired.');
    res.setHeader('Cache-Control', 'no-store');
    const common = { providerOrderId: checkout.order.id, amount: checkout.order.amount / 100, amountPaise: checkout.order.amount,
      currency: 'INR', expiresAt: new Date(deadline).toISOString() };
    if (checkout.provider === 'cashfree') {
      // Only the session id goes to the app; never a key or secret.
      res.json({ provider: 'cashfree', paymentSessionId: checkout.order.paymentSessionId, ...common,
        environment: env.cashfreeEnv === 'production' ? 'production' : 'sandbox' });
      return;
    }
    res.json({ provider: 'razorpay', keyId: env.razorpayKeyId, ...common,
      environment: env.razorpayKeyId?.startsWith('rzp_live_') ? 'production' : 'sandbox' });
  } catch (error) { next(error); }
}
