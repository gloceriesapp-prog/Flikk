// POST /payments/cashfree/webhook — Cashfree Payment Gateway webhooks
// (version 2025-01-01). Signature: Base64(HMAC-SHA256(x-webhook-timestamp +
// raw body, PG client secret)), compared against x-webhook-signature. The raw
// bytes are verified before the body is trusted, same rule as webhook.ts.
//
// Migration stage: events are verified and acknowledged but do not yet change
// payment state. Orders are still created with Razorpay, so a Cashfree
// order_id cannot be matched to a Gloceries order until Cashfree order
// creation ships; settling here first would be settling against nothing.
import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export function verifyCashfreeSignature(rawBody: string, timestamp: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(timestamp + rawBody).digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

interface CashfreeEvent {
  type?: string;
  data?: {
    order?: { order_id?: string };
    payment?: { cf_payment_id?: string | number; payment_status?: string };
    refund?: { refund_id?: string; refund_status?: string };
  };
}

export async function handleCashfreeWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    if (!env.cashfreeClientSecret) throw new AppError(503, 'CASHFREE_NOT_CONFIGURED', 'Cashfree is not configured.');
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const rawBody = (req as unknown as { rawBody?: string }).rawBody;
    if (typeof signature !== 'string' || typeof timestamp !== 'string' || !rawBody
      || !verifyCashfreeSignature(rawBody, timestamp, signature, env.cashfreeClientSecret)) {
      throw new AppError(401, 'INVALID_SIGNATURE', 'Webhook signature verification failed.');
    }
    const event = req.body as CashfreeEvent;
    logger.info({
      provider: 'cashfree',
      type: event.type,
      orderId: event.data?.order?.order_id,
      paymentId: event.data?.payment?.cf_payment_id,
      paymentStatus: event.data?.payment?.payment_status,
      refundId: event.data?.refund?.refund_id,
      refundStatus: event.data?.refund?.refund_status,
    }, 'Cashfree webhook received');
    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
}
