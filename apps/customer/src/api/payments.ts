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

// Exactly one of orderId/tripId — a single-store checkout passes orderId
// (POST /orders' own row), a multi-store checkout passes tripId (POST
// /trips' own row, backend/src/lib/trips.ts) so the amount is read from
// the trip's combined total instead of any one store's own order total.
export function createRazorpayOrder(id: { orderId: string } | { tripId: string }): Promise<RazorpayOrder> {
  return apiRequest('/payments/create-order', { method: 'POST', body: id });
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
// grid (payments/upiIntent.ts). Same orderId/tripId fork as
// createRazorpayOrder above — a multi-store trip pays once for the whole
// trip via this exact same grid now, not just Standard Checkout; each
// leg still gets its own real item_total/commission_amount for payout
// purposes regardless of how the one combined payment was collected
// (backend's own note on why splitting the charge itself was never
// actually necessary).
export function createUpiIntentPayment(id: { orderId: string } | { tripId: string }): Promise<UpiIntentPayment> {
  return apiRequest('/payments/create-upi-intent', { method: 'POST', body: id });
}

export interface VerifiedUpiId {
  valid: true;
  accountHolderName: string | null;
}

// POST /payments/verify-upi-id — a real RazorpayX Fund Account Validation
// (a ~₹1 penny-drop) confirming the typed VPA is genuinely resolvable,
// NOT a payment request itself. NPCI retired UPI Collect (backend's own
// note, payments/verifyUpiId.ts) — there is no mechanism left, on any
// provider, to push a request into the VPA's own app. This only ever
// confirms identity before the customer is sent to complete the payment
// themselves (PaymentMethodList.tsx's own note on what happens after a
// successful verify). Throws (via apiRequest) on an unverifiable/invalid
// VPA — never resolves to a fake "valid: false", so a caller can't
// silently mistake a thrown network error for a real rejection.
export function verifyUpiId(vpa: string): Promise<VerifiedUpiId> {
  return apiRequest('/payments/verify-upi-id', { method: 'POST', body: { vpa } });
}

export type VerifyPaymentInput = ({ orderId: string; tripId?: undefined } | { tripId: string; orderId?: undefined }) & {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

// The one and only call that can mark an order paid — backend/src/routes/
// payments.ts's own POST /verify re-derives the HMAC signature server-side
// from these three ids and rejects anything that doesn't match exactly,
// so this is never "tell the server I paid," it's "hand over what
// Razorpay's own SDK returned and let the server prove it for real."
export function verifyPayment(input: VerifyPaymentInput): Promise<{ ok: true }> {
  return apiRequest('/payments/verify', { method: 'POST', body: input });
}
