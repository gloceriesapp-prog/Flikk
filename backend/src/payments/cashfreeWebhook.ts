// POST /payments/cashfree/webhook. A signed event is only a hint: the payment
// is settled from our own server read (reconcileCashfree), never from the
// payload. Delivery is at-least-once; settlement and refund wake-ups are
// idempotent, so duplicates and late events are safe.
import type { Request, Response, NextFunction } from 'express';
import { cashfreeConfigured } from '../config/env.js';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { CASHFREE_ORDER_ID, CASHFREE_PAYMENT_ID, verifyCashfreeWebhook } from './cashfreeClient.js';
import { reconcileCashfree } from './cashfreeCheckout.js';
import { paymentTarget } from './recovery.js';

const PAYMENT_EVENTS = new Set(['PAYMENT_SUCCESS_WEBHOOK', 'PAYMENT_FAILED_WEBHOOK', 'PAYMENT_USER_DROPPED_WEBHOOK']);
const REFUND_EVENTS = new Set(['REFUND_STATUS_WEBHOOK', 'AUTO_REFUND_STATUS_WEBHOOK']);

interface CfEvent {
  type?: string;
  data?: { order?: { order_id?: string }; payment?: { cf_payment_id?: string | number };
    refund?: { order_id?: string; cf_payment_id?: string | number }; auto_refund?: { cf_payment_id?: string | number } };
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
      const paymentId = String(event.data?.refund?.cf_payment_id ?? event.data?.auto_refund?.cf_payment_id ?? '');
      if (CASHFREE_PAYMENT_ID.test(paymentId)) {
        // Wake the durable refund jobs; their leased worker re-reads every
        // provider refund before publishing a customer-visible result.
        const nextAttemptAt = new Date().toISOString();
        const results = await Promise.all(['order_refund_jobs', 'trip_refunds'].map(table =>
          supabase.from(table).update({ next_attempt_at: nextAttemptAt }).eq('payment_id', paymentId).in('status', ['queued', 'processing'])));
        for (const result of results) if (result.error) throw result.error;
      }
    }
    res.status(200).json({ received: true });
  } catch (error) { next(error); }
}
