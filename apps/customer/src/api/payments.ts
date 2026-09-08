// Maps to POST /payments/create-order and POST /payments/verify. The
// secret key never leaves the backend — the client only ever gets an
// order id + the publishable key_id, and only ever sends back what
// Razorpay Checkout itself returned on success, never a self-reported
// "it worked."

import { apiRequest } from './client';

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  key_id: string;
}

export function createRazorpayOrder(orderId: string): Promise<RazorpayOrder> {
  return apiRequest('/payments/create-order', { method: 'POST', body: { orderId } });
}

export interface UpiIntentPayment {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  // Raw `upi://pay?...` deep link — payments/upiIntent.ts's own openUpiApp
  // launches this exactly as received, never modified (Razorpay's docs
  // explicitly warn changing it can break the payment).
  upiLink: string;
}

// POST /payments/create-upi-intent (backend/src/routes/payments.ts) — the
// S2S UPI Intent flow. Unlike createRazorpayOrder above (which feeds
// Razorpay's own bundled Checkout SDK), this returns a raw deep link the
// app launches itself at a specific installed UPI app — no Razorpay
// branding, same mechanism Blinkit/Instamart use for their own UPI-app
// grid (payments/upiIntent.ts).
export function createUpiIntentPayment(orderId: string): Promise<UpiIntentPayment> {
  return apiRequest('/payments/create-upi-intent', { method: 'POST', body: { orderId } });
}

export interface VerifyPaymentInput {
  orderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// The one and only call that can mark an order paid — backend/src/routes/
// payments.ts's own POST /verify re-derives the HMAC signature server-side
// from these three ids and rejects anything that doesn't match exactly,
// so this is never "tell the server I paid," it's "hand over what
// Razorpay's own SDK returned and let the server prove it for real."
export function verifyPayment(input: VerifyPaymentInput): Promise<{ ok: true }> {
  return apiRequest('/payments/verify', { method: 'POST', body: input });
}
