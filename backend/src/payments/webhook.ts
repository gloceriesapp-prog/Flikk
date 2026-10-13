import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { paymentsConfigured, paymentsNotConfigured, verifyWebhookSignature, getProviderOrder, getProviderPayment, getPaymentRefunds } from './razorpayClient.js';
import { settleCheckoutPayment } from './settleCheckoutPayment.js';
import { validateCapturedPayment } from './validateCapturedPayment.js';
import { paymentTarget, recoverProviderOrder } from './recovery.js';
import type { OrderIdBody } from './types.js';

type Tags = Record<string, string | undefined> | null | undefined;
function targetFromTags(tags: Tags): OrderIdBody | null {
  if (tags?.gloceries_trip_id) return { tripId: tags.gloceries_trip_id };
  if (tags?.gloceries_order_id) return { orderId: tags.gloceries_order_id };
  return null;
}

// The attached provider order identifies the checkout. Server-created notes
// and receipt recovery cover a crash before the attachment commit.
// Unresolved = not our checkout.
export async function resolveCheckoutTarget(providerOrderId: string | undefined, tags: Tags): Promise<OrderIdBody | null> {
  if (providerOrderId) {
    const { data: session, error } = await supabase.from('checkout_payment_sessions').select('kind,target_id,payment_provider')
      .eq('provider_order_id', providerOrderId).maybeSingle();
    if (error) throw error;
    if (session?.payment_provider === 'razorpay') return session.kind === 'trip' ? { tripId: session.target_id } : { orderId: session.target_id };
  }
  return targetFromTags(tags);
}



export async function handleWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    // Missing credentials must return 503 so Razorpay retries rather than
    // acknowledging and dropping a valid captured payment.
    if (!paymentsConfigured) throw paymentsNotConfigured();
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = (req as unknown as { rawBody?: string }).rawBody;
    if (typeof signature !== 'string' || !rawBody || !verifyWebhookSignature(rawBody, signature)) {
      throw new AppError(401, 'INVALID_SIGNATURE', 'Webhook signature verification failed.');
    }

    const event = req.body as { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } }; order?: { entity?: { id?: string } }; refund?: { entity?: { id?: string; payment_id?: string } } } };
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const paymentId = event.payload?.payment?.entity?.id;
      const providerOrderId = event.payload?.payment?.entity?.order_id ?? event.payload?.order?.entity?.id;
      if (paymentId && providerOrderId) {
        const providerOrder = await getProviderOrder(providerOrderId);
        const target = await resolveCheckoutTarget(providerOrderId, providerOrder?.notes);
        if (target) {
          const parsed = paymentTarget(target);
          const { data: local, error } = await supabase.from(parsed.table).select('total').eq('id', parsed.id).single();
          if (error) throw error;
          const recovered = await recoverProviderOrder(parsed, local.total);
          if (recovered?.id !== providerOrderId) throw new AppError(409, 'PAYMENT_MISMATCH', 'Payment order mismatch.');
          const paise = await validateCapturedPayment(target, paymentId, providerOrderId);
          await settleCheckoutPayment(target, paymentId, paise, 'INR', providerOrderId);
        } else logger.warn({ paymentId, providerOrderId }, 'Captured payment has no matching checkout');
      }
    }
    if (event.event === 'refund.processed' || event.event === 'refund.failed') {
      const refund = event.payload?.refund?.entity;
      if (refund?.id && refund.payment_id) {
        const payment = await getProviderPayment(refund.payment_id);
        const current = (await getPaymentRefunds(payment.id)).find(item => item.id === refund.id && item.payment_id === payment.id);
        const status = current?.status === 'processed' ? 'completed' : current?.status === 'failed' ? 'failed' : null;
        if (status) {
          const { error } = await supabase.from('orders').update({ refund_status: status, ...(status === 'completed' ? { refunded_at: new Date().toISOString() } : {}) })
            .eq('provider_refund_id', current!.id).eq('provider_payment_id', payment.id).eq('payment_provider', 'razorpay').eq('refund_status', 'processing');
          if (error) throw error;
        }
      }
    }
    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
}
