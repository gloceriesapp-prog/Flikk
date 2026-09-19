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

// Undoes the payment.failed handler's own cancellation, but ONLY when
// this exact row is still sitting in the specific state that handler
// left it in — Razorpay's own docs on this race: "you may occasionally
// observe a payment.failed webhook followed by a payment.captured
// webhook for the same transaction" (late authorisation, or a
// user-initiated retry that still lands against the original attempt).
// If Razorpay says the money WAS actually captured, that has to win —
// leaving an order marked cancelled while the customer was genuinely
// charged is worse than the rare harmless no-op this runs on every
// ordinary captured event.
//
// Two guards, not one: `.eq('status', 'cancelled')` alone can't
// distinguish this race from a customer's OWN real cancel-with-refund
// (routes/orders.ts's PATCH /:id/status) also leaving status
// 'cancelled' — reverting THAT one would resurrect an order the
// customer already got refunded and moved on from. The second guard,
// `.eq('refund_status', 'none')`, is what tells them apart: a real
// customer cancel always sets refund_status away from 'none' the
// instant it fires (refundPayment.ts only ever runs because a
// razorpay_payment_id already existed there), while the payment.failed
// path below never had a payment to refund in the first place, so
// refund_status stays at its default. A webhook redelivery of the same
// captured event (Razorpay retries on any non-2xx response) is also
// safe here regardless — status won't be 'cancelled' anymore after the
// first successful revert, so this is a no-op on the second delivery.
async function revertFalseCancel(table: 'orders' | 'trips', id: string): Promise<void> {
  const query = supabase.from(table).update(table === 'orders' ? { status: 'placed', cancel_reason: null } : { status: 'placed' });
  const { error } = await (table === 'orders'
    ? query.eq('id', id).eq('status', 'cancelled').eq('refund_status', 'none')
    : query.eq('id', id).eq('status', 'cancelled'));
  if (error) throw error;
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
      const orderId: string | undefined = notes.flikk_order_id;
      const tripId: string | undefined = notes.flikk_trip_id;
      const paymentId = event.payload.payment.entity.id;

      if (orderId) {
        const { error } = await supabase.from('orders').update({ razorpay_payment_id: paymentId }).eq('id', orderId);
        if (error) throw error;
        await revertFalseCancel('orders', orderId);
      } else if (tripId) {
        // Same real cascade verifyPayment.ts's own Standard Checkout path
        // already does for a trip — every child order needs its own
        // razorpay_payment_id written too, since every real reader
        // (TrackOrderScreen, Purchase, admin/partner order views) checks
        // an orders row's own payment_id, none of them know trips exist.
        // This is the UPI Intent flow's own async counterpart to that —
        // createUpiIntent.ts's own note on why the notes key differs.
        const { error: tripErr } = await supabase.from('trips').update({ razorpay_payment_id: paymentId }).eq('id', tripId);
        if (tripErr) throw tripErr;
        const { error: cascadeErr } = await supabase.from('orders').update({ razorpay_payment_id: paymentId }).eq('trip_id', tripId);
        if (cascadeErr) throw cascadeErr;
        await revertFalseCancel('trips', tripId);
        const { data: legs } = await supabase.from('orders').select('id').eq('trip_id', tripId);
        for (const leg of legs ?? []) await revertFalseCancel('orders', leg.id);
      }
    }

    // The fast-failure path for the UPI Intent flow — Razorpay fires this
    // the moment a payment attempt is actually declined/cancelled inside
    // the PSP app (customer backs out of GPay, insufficient balance,
    // bank declines, etc.), which is almost always seconds after the
    // attempt started, not the full 2-minute budget payments/
    // pollOrderPaid.ts otherwise waits out. Cancelling the order/trip
    // immediately here — instead of only ever detecting this once the
    // customer happens to come back to the app and the next poll tick
    // runs — is what lets PaymentProcessingScreen show "Payment Failed"
    // right away instead of sitting on a spinner for up to 2 minutes for
    // an outcome that was already known. `.eq('status', 'placed')` guards
    // against a stale/duplicate failed event racing a payment that
    // somehow already got marked paid or was independently cancelled —
    // never downgrade a resolved order.
    if (event.event === 'payment.failed') {
      const notes = event.payload.payment.entity.notes ?? {};
      const orderId: string | undefined = notes.flikk_order_id;
      const tripId: string | undefined = notes.flikk_trip_id;
      const reason: string = event.payload.payment.entity.error_description ?? 'Payment was declined or cancelled.';

      if (orderId) {
        const { error } = await supabase
          .from('orders')
          .update({ status: 'cancelled', cancel_reason: reason })
          .eq('id', orderId)
          .eq('status', 'placed');
        if (error) throw error;
      } else if (tripId) {
        // Same cascade shape as payment.captured above — every real
        // reader (TrackOrderScreen, Purchase, admin/partner views) checks
        // each leg's own orders row, not the trip row, for status.
        const { error: tripErr } = await supabase
          .from('trips')
          .update({ status: 'cancelled' })
          .eq('id', tripId)
          .eq('status', 'placed');
        if (tripErr) throw tripErr;
        const { error: cascadeErr } = await supabase
          .from('orders')
          .update({ status: 'cancelled', cancel_reason: reason })
          .eq('trip_id', tripId)
          .eq('status', 'placed');
        if (cascadeErr) throw cascadeErr;
      }
    }

    // A cancelled order's refund (routes/orders.ts's PATCH /:id/status,
    // refundPayment.ts) — the initial Razorpay call already stores
    // refund_status: 'processing' + the real razorpay_refund_id at
    // cancel time; most refunds settle asynchronously days later, and
    // this event (not that initial response) is Razorpay's own final
    // word on whether it actually completed. Matched by razorpay_refund_id
    // (unique per refund, already stored) rather than payment_id, since a
    // single payment can have multiple partial refunds across a multi-
    // store trip's own separate order legs (refundPayment.ts's own note).
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
