// POST /payments/create-upi-intent — S2S UPI Intent flow (Razorpay docs:
// payments/payment-gateway/s2s-integration/payment-methods/upi/intent).
// This is what actually lets the customer app show its own UPI-app grid
// (apps/customer's payments/upiIntent.ts) instead of handing off to
// Razorpay's branded Checkout screen — the response's `upiLink` is a raw
// `upi://pay?...` deep link the client launches directly at whichever
// installed app the customer tapped. The razorpay npm SDK
// (razorpayClient.ts) has no wrapped method for this endpoint — it only
// covers the common orders/payments/refunds surface — so this is a
// direct authenticated REST call, same Basic Auth scheme the SDK uses
// internally.
//
// No client-supplied amount here either, same as createOrder.ts — a
// existing Razorpay order is reused from its durable payment session.
// Razorpay requires an email field for this endpoint; customers only
// ever give a phone number (phone-OTP auth, no email column on users) —
// the synthetic address below is never shown to the customer or used to
// contact them, Razorpay just needs *a* value in that shape.
import type { Response, NextFunction } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { razorpayBasicAuthHeader } from './razorpayClient.js';
import { paymentTarget, ensureProviderOrder, requirePaymentRetrySafe, claimPayment, saveSession } from './recovery.js';

interface UpiIntentResponse {
  link?: string;
  razorpay_payment_id?: string;
  error?: { description: string };
}

export async function createUpiIntent(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const target = paymentTarget(req.body);
    const razorpayOrder = await ensureProviderOrder(target, req.user!.id);
    await requirePaymentRetrySafe(target, razorpayOrder.id, Number(razorpayOrder.amount) / 100);
    const claim = await claimPayment(target, req.user!.id, 'upi');
    if (!claim.claimed) {
      if (claim.session.upi_link && claim.session.upi_payment_id) {
        res.json({ razorpayOrderId: razorpayOrder.id, razorpayPaymentId: claim.session.upi_payment_id, upiLink: claim.session.upi_link });
        return;
      }
      throw new AppError(409, 'PAYMENT_RECONCILING', 'Your previous UPI request is being checked. Please wait before paying again.');
    }
    const { data: customer } = await supabase.from('users').select('phone').eq('id', req.user!.id).single();
    const notes: Record<string, string> = target.kind === 'trip' ? { gloceries_trip_id: target.id } : { gloceries_order_id: target.id };
    const upiRes = await fetch('https://api.razorpay.com/v1/payments/create/upi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: razorpayBasicAuthHeader(),
      },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        amount: Number(razorpayOrder.amount),
        currency: 'INR',
        order_id: razorpayOrder.id,
        contact: customer?.phone ?? '9999999999',
        email: `${req.user!.id}@flikk.app`,
        method: 'upi',
        upi: { flow: 'intent' },
        // Set explicitly here too, not assumed inherited from the order —
        // the payment.captured webhook (webhook.ts) reads this same key
        // off the PAYMENT's own notes specifically, and Razorpay's own
        // docs don't guarantee order notes propagate onto a payment
        // created against it.
        notes,
      }),
    });
    const upiData = (await upiRes.json()) as UpiIntentResponse;
    if (!upiRes.ok || !upiData.link || !upiData.razorpay_payment_id) {
      throw new AppError(502, 'UPI_INTENT_FAILED', upiData.error?.description ?? 'Could not start UPI payment.');
    }

    await saveSession(target, { upi_state: 'ready', upi_link: upiData.link, upi_payment_id: upiData.razorpay_payment_id });
    res.status(200).json({
      razorpayOrderId: razorpayOrder.id,
      razorpayPaymentId: upiData.razorpay_payment_id,
      upiLink: upiData.link,
    });
  } catch (err) {
    next(err);
  }
}
