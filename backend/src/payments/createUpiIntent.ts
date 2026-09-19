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
// fresh Razorpay order is minted from the order row's own stored total.
// Razorpay requires an email field for this endpoint; customers only
// ever give a phone number (phone-OTP auth, no email column on users) —
// the synthetic address below is never shown to the customer or used to
// contact them, Razorpay just needs *a* value in that shape.
import type { Response, NextFunction } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { razorpay, razorpayBasicAuthHeader } from './razorpayClient.js';
import type { OrderIdBody } from './types.js';

interface UpiIntentResponse {
  link?: string;
  razorpay_payment_id?: string;
  error?: { description: string };
}

export async function createUpiIntent(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { orderId, tripId } = req.body as OrderIdBody;
    if (!orderId && !tripId) {
      throw new AppError(400, 'INVALID_PAYMENT_REQUEST', 'orderId or tripId is required.');
    }

    // Exactly one of these runs — same real fork createRazorpayOrder.ts/
    // verifyPayment.ts already make for the Standard Checkout path. A
    // multi-store trip pays once for every leg combined (trips.total),
    // never per-leg — the UPI-app grid was single-store-only until now
    // purely because this endpoint didn't know how to read a trip's own
    // total, not because splitting the payment itself needs different
    // logic (it never did: order_items.unit_price_at_order-style historical
    // amounts already live per-leg on each real orders row regardless of
    // how the one combined payment was collected).
    const table = tripId ? 'trips' : 'orders';
    const id = (tripId ?? orderId)!;
    const { data: record, error } = await supabase.from(table).select('id, customer_id, total').eq('id', id).single();
    if (error || !record) throw new AppError(404, tripId ? 'TRIP_NOT_FOUND' : 'ORDER_NOT_FOUND', `${tripId ? 'Trip' : 'Order'} not found.`);
    if (record.customer_id !== req.user!.id) throw new AppError(403, 'FORBIDDEN', tripId ? 'Not your trip.' : 'Not your order.');

    const { data: customer } = await supabase.from('users').select('phone').eq('id', req.user!.id).single();

    // notes key differs (flikk_order_id vs flikk_trip_id) so webhook.ts's
    // own payment.captured handler knows which table to write
    // razorpay_payment_id onto — a trip's own payment also cascades from
    // there onto every child order, same as verifyPayment.ts's already-
    // established Standard Checkout cascade.
    const notes: Record<string, string> = tripId ? { flikk_trip_id: record.id } : { flikk_order_id: record.id };
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(record.total * 100),
      currency: 'INR',
      receipt: record.id,
      notes,
    });

    const upiRes = await fetch('https://api.razorpay.com/v1/payments/create/upi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: razorpayBasicAuthHeader(),
      },
      body: JSON.stringify({
        amount: razorpayOrder.amount,
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

    res.status(201).json({
      razorpayOrderId: razorpayOrder.id,
      razorpayPaymentId: upiData.razorpay_payment_id,
      upiLink: upiData.link,
    });
  } catch (err) {
    next(err);
  }
}
