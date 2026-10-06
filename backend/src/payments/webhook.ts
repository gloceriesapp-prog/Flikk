import { validateCapturedPayment } from './validateCapturedPayment.js';
// POST /payments/webhook — Razorpay webhook. Source: specs/05-platform/
// payments.md. Signature verification is mandatory — an unsigned/invalid
// payload must never change payment state. No card/UPI data is ever
// stored here, only Razorpay's own payment id.
//
// This is the one source of truth for the UPI Intent flow (createUpiIntent.ts,
// apps/customer's payments/pollOrderPaid.ts polls for exactly this) — an
// intent payment is asynchronous, so this event, not the client's return
// from the UPI app, is what actually marks an order paid.
import { settleCheckoutPayment } from './settleCheckoutPayment.js';
import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';

function verifySignature(rawBody: string, signature: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = crypto.createHmac('sha256', env.razorpayWebhookSecret).update(rawBody).digest('hex');
  return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function handleWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const rawBody = (req as unknown as { rawBody: string }).rawBody;
    if (!signature || !rawBody || !verifySignature(rawBody, signature)) {
      throw new AppError(401, 'INVALID_SIGNATURE', 'Webhook signature verification failed.');
    }

    const event = req.body;
    if (event.event === 'payment.captured') {
      const notes = event.payload.payment.entity.notes ?? {};
      const orderId: string | undefined = notes.gloceries_order_id;
      const tripId: string | undefined = notes.gloceries_trip_id;
      const paymentId = event.payload.payment.entity.id;

      if (orderId || tripId) {
        await validateCapturedPayment({ orderId, tripId }, paymentId);
        await settleCheckoutPayment({ orderId, tripId }, paymentId);
      }
    }

    // payment.failed is an attempt result, not checkout cancellation.
    // Recovery reads provider state before permitting another launch.

    // Worker reconciliation stores the provider reference. Webhooks can settle
    // that reference sooner; a webhook arriving before it is stored is recovered
    // by the durable worker's next provider read.
    if (event.event === 'refund.processed' || event.event === 'refund.failed') {
      const refundId = event.payload.refund.entity.id;
      const finalStatus = event.event === 'refund.processed' ? 'completed' : 'failed';
      if (refundId) {
        const update =
          finalStatus === 'completed'
            ? { refund_status: finalStatus, refunded_at: new Date().toISOString() }
            : { refund_status: finalStatus };
        const { error } = await supabase.from('orders').update(update).eq('razorpay_refund_id', refundId).eq('refund_status', 'processing');
        if (error) throw error;
      }
    }

    // Transfers enter processing BEFORE submission so even an early webhook
    // can settle them. Fenced recovery never overwrites terminal states.
    if (event.event === 'payout.processed' || event.event === 'payout.reversed' || event.event === 'payout.failed') {
      const payout = event.payload.payout.entity;
      if (payout.reference_id) {
        const { error } = await supabase.rpc('settle_payout_webhook', {
          p_reference: payout.reference_id, p_provider: payout.id, p_event: event.event,
        });
        if (error) throw error;
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
}
