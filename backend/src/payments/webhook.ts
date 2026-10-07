// POST /payments/webhook — Cashfree PG webhook. Signature verification is
// mandatory: base64(HMAC_SHA256(x-webhook-timestamp + rawBody, secret)) must
// equal x-webhook-signature, and the timestamp must be within 5 minutes
// (cashfreeClient.ts). An unsigned/invalid/stale payload never changes
// payment state. Only Cashfree's own ids are stored, never card/UPI data.
//
// Idempotent by construction: settlement goes through settle_checkout_payment
// (keyed by cf_payment_id, settled_now prevents double store pushes) and a
// refund update only moves rows still 'processing'. Webhook contents are
// never trusted for money: a payment is re-read from Cashfree before settling.
import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { paymentsConfigured, paymentsNotConfigured, verifyWebhookSignature } from './cashfreeClient.js';
import { settleCheckoutPayment } from './settleCheckoutPayment.js';
import { validateCapturedPayment } from './validateCapturedPayment.js';
import type { OrderIdBody } from './types.js';

type Tags = Record<string, string | undefined> | null | undefined;
function targetFromTags(tags: Tags): OrderIdBody | null {
  if (tags?.gloceries_trip_id) return { tripId: tags.gloceries_trip_id };
  if (tags?.gloceries_order_id) return { orderId: tags.gloceries_order_id };
  return null;
}

// The Cashfree order id is what we persisted on checkout_payment_sessions;
// order_tags (always set by recovery.ts) cover a crash before that write.
// Unresolved = not our checkout.
export async function resolveCheckoutTarget(providerOrderId: string | undefined, tags: Tags): Promise<OrderIdBody | null> {
  if (providerOrderId) {
    const { data: session, error } = await supabase.from('checkout_payment_sessions').select('kind,target_id')
      .eq('provider_order_id', providerOrderId).maybeSingle();
    if (error) throw error;
    if (session) return session.kind === 'trip' ? { tripId: session.target_id } : { orderId: session.target_id };
  }
  return targetFromTags(tags);
}

const REFUND_FINAL: Record<string, 'completed' | 'failed'> = { SUCCESS: 'completed', CANCELLED: 'failed', REJECTED: 'failed' };

export async function handleWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    // Unverifiable without the secret; 503 makes Cashfree retry once keys
    // are configured instead of dropping a payment.
    if (!paymentsConfigured) throw paymentsNotConfigured();
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const rawBody = (req as unknown as { rawBody?: string }).rawBody;
    if (typeof signature !== 'string' || typeof timestamp !== 'string' || !rawBody || !verifyWebhookSignature(rawBody, timestamp, signature)) {
      throw new AppError(401, 'INVALID_SIGNATURE', 'Webhook signature verification failed.');
    }

    const event = req.body as { type?: string; data?: Record<string, any> }; // eslint-disable-line @typescript-eslint/no-explicit-any -- provider payload, fields checked below
    if (event.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const providerOrderId = typeof event.data?.order?.order_id === 'string' ? event.data.order.order_id : undefined;
      const paymentId = event.data?.payment?.cf_payment_id != null ? String(event.data.payment.cf_payment_id) : '';
      const target = paymentId ? await resolveCheckoutTarget(providerOrderId, event.data?.order?.order_tags) : null;
      // A late payment still settles: the SQL rejects it against the closed
      // checkout and the refund trigger/queue returns the money.
      if (target) {
        await validateCapturedPayment(target, paymentId, providerOrderId);
        await settleCheckoutPayment(target, paymentId);
      } else logger.warn({ paymentId, providerOrderId }, 'Successful payment has no matching checkout');
    }
    // PAYMENT_FAILED / PAYMENT_USER_DROPPED are attempt results, not checkout
    // cancellation. Recovery reads provider state before another launch.

    if (event.type === 'REFUND_STATUS_WEBHOOK') {
      const refund = event.data?.refund as { refund_id?: unknown; refund_status?: unknown } | undefined;
      const finalStatus = typeof refund?.refund_status === 'string' ? REFUND_FINAL[refund.refund_status] : undefined;
      if (typeof refund?.refund_id === 'string' && finalStatus) {
        const update = finalStatus === 'completed'
          ? { refund_status: finalStatus, refunded_at: new Date().toISOString() }
          : { refund_status: finalStatus };
        // Refund workers own the job rows; this only shortens the visible
        // delay. A webhook before the id is stored is caught by the next poll.
        const { error } = await supabase.from('orders').update(update).eq('provider_refund_id', refund.refund_id).eq('refund_status', 'processing');
        if (error) throw error;
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
}
