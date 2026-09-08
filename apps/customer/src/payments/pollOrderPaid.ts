// UPI Intent payments are asynchronous by nature — launching the app and
// getting control back only means "the customer finished interacting
// with it," never "the payment succeeded" (they might cancel inside the
// app, or confirm and background before it settles). The one source of
// truth is the order row's own razorpay_payment_id, written server-side
// only once the payment.captured webhook fires with a verified signature
// (backend/src/routes/payments.ts) — never client-reported. Razorpay's
// own S2S UPI Intent docs say to allow 2-3 minutes before treating a
// payment as failed; this polls GET /orders/:id (already used by
// TrackOrderScreen for live status) every 4s for up to 2 minutes.

import { fetchOrder } from '../api/orders';

const POLL_INTERVAL_MS = 4000;
const MAX_ATTEMPTS = 30; // 30 * 4s = 120s

export async function pollOrderPaid(orderId: string): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const order = await fetchOrder(orderId);
    if (order.razorpay_payment_id) return true;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return false;
}
