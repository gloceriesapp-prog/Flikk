// POST /payments/webhook — Razorpay webhook. Source: specs/05-platform/
// payments.md. Signature verification is mandatory — an unsigned/invalid
// payload must never change payment state. No card/UPI data is ever
// stored here, only Razorpay's own payment id.
//
// This is the one source of truth for the UPI Intent flow (createUpiIntent.ts,
// apps/customer's payments/pollOrderPaid.ts polls for exactly this) — an
// intent payment is asynchronous, so this event, not the client's return
// from the UPI app, is what actually marks an order paid.
import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';

function verifySignature(rawBody: string, signature: string): boolean {
  const expected = crypto.createHmac('sha256', env.razorpayWebhookSecret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
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
      const orderId = event.payload.payment.entity.notes?.flikk_order_id;
      const paymentId = event.payload.payment.entity.id;
      if (orderId) {
        const { error } = await supabase.from('orders').update({ razorpay_payment_id: paymentId }).eq('id', orderId);
        if (error) throw error;
      }
    }

    // Weekly store payout confirmation (jobs/weeklyPayouts.ts's own note
    // has the full flow) — releasePendingPayouts marks a row 'processing'
    // the instant RazorpayX *accepts* the payout call, but that's not the
    // same as it actually landing; these three events are RazorpayX's own
    // final word. reference_id is always our payouts.id (releasePayout.ts's
    // own note on why), so no separate lookup table is needed to match
    // the event back to the right row.
    if (event.event === 'payout.processed' || event.event === 'payout.reversed' || event.event === 'payout.failed') {
      const payoutId = event.payload.payout.entity.reference_id;
      const finalStatus = event.event === 'payout.processed' ? 'paid' : 'failed';
      if (payoutId) {
        const update = finalStatus === 'paid' ? { status: finalStatus, paid_at: new Date().toISOString() } : { status: finalStatus };
        const { error } = await supabase.from('payouts').update(update).eq('id', payoutId).eq('status', 'processing');
        if (error) throw error;
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
}
