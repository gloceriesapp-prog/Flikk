// POST /payments/cashfree/webhook. A signed event is only a hint: the payment
// is settled from our own server read (reconcileCashfree), never from the
// payload. Delivery is at-least-once; settlement and refund wake-ups are
// idempotent, so duplicates and late events are safe.
import type { Request, Response, NextFunction } from 'express';
import { cashfreeConfigured } from '../config/env.js';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { CASHFREE_ORDER_ID, verifyCashfreeWebhook } from './cashfreeClient.js';
import { reconcileCashfree } from './cashfreeCheckout.js';
import { paymentTarget } from './recovery.js';

const PAYMENT_EVENTS = new Set(['PAYMENT_SUCCESS_WEBHOOK', 'PAYMENT_FAILED_WEBHOOK', 'PAYMENT_USER_DROPPED_WEBHOOK']);
const REFUND_EVENTS = new Set(['REFUND_STATUS_WEBHOOK', 'AUTO_REFUND_STATUS_WEBHOOK']);

interface CfEvent {
  type?: string;
  data?: { order?: { order_id?: string }; payment?: { cf_payment_id?: string | number };
    refund?: { order_id?: string }; auto_refund?: { order_id?: string } };
}

export async function handleCashfreeWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    // 503 makes Cashfree retry instead of dropping a real payment.
    if (!cashfreeConfigured) throw new AppError(503, 'PAYMENTS_NOT_CONFIGURED', 'Payments are not configured.');
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const rawBody = (req as unknown as { rawBody?: string }).rawBody;
    if (typeof signature !== 'string' || typeof timestamp !== 'string' || !rawBody || !verifyCashfreeWebhook(rawBody, timestamp, signature))
      throw new AppError(401, 'INVALID_SIGNATURE', 'Webhook signature verification failed.');
    const event = req.body as CfEvent;
    const type = event.type ?? '';
    if (PAYMENT_EVENTS.has(type)) {
      const providerOrderId = event.data?.order?.order_id;
      if (providerOrderId && CASHFREE_ORDER_ID.test(providerOrderId)) {
        const { data: session, error } = await supabase.from('checkout_payment_sessions').select('kind,target_id,payment_provider')
          .eq('payment_provider', 'cashfree').eq('provider_order_id', providerOrderId).maybeSingle();
        if (error) throw error;
        if (session) {
          const target = paymentTarget(session.kind === 'trip' ? { tripId: session.target_id } : { orderId: session.target_id });
          const { data: local, error: localError } = await supabase.from(target.table).select('total').eq('id', target.id).single();
          if (localError) throw localError;
          await reconcileCashfree(target, providerOrderId, Number(local.total));
        } else logger.warn({ providerOrderId, type }, 'Cashfree payment event has no matching checkout');
      }
    }
    if (REFUND_EVENTS.has(type)) {
      // Keyed by our order id, not cf_payment_id: that is a 19-digit number
      // which JSON.parse cannot hold exactly when Cashfree sends it unquoted.
      const providerOrderId = event.data?.refund?.order_id ?? event.data?.auto_refund?.order_id;
      if (providerOrderId && CASHFREE_ORDER_ID.test(providerOrderId)) {
        const { data: session, error } = await supabase.from('checkout_payment_sessions').select('kind,target_id')
          .eq('payment_provider', 'cashfree').eq('provider_order_id', providerOrderId).maybeSingle();
        if (error) throw error;
        if (session) {
          // Wake the durable refund job; its leased worker re-reads every
          // provider refund before publishing a customer-visible result.
          const table = session.kind === 'trip' ? 'trip_refunds' : 'order_refund_jobs';
          const { error: wakeError } = await supabase.from(table).update({ next_attempt_at: new Date().toISOString() })
            .eq(session.kind === 'trip' ? 'trip_id' : 'order_id', session.target_id).in('status', ['queued', 'processing']);
          if (wakeError) throw wakeError;
        }
      }
    }
    res.status(200).json({ received: true });
  } catch (error) { next(error); }
}
