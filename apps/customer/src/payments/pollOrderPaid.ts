// UPI Intent payments are asynchronous by nature — launching the app and
// getting control back only means "the customer finished interacting
// with it," never "the payment succeeded" (they might cancel inside the
// app, or confirm and background before it settles). The one source of
// truth is the order/trip row's own razorpay_payment_id, written
// server-side only once the payment.captured webhook fires with a
// verified signature (backend/src/payments/webhook.ts) — never
// client-reported. Razorpay's own S2S UPI Intent docs say to allow 2-3
// minutes before treating a payment as failed; this polls every 4s for
// up to 2 minutes.
//
// Trip-aware (tripId variant) — a multi-store checkout's UPI-app grid
// pays once for the whole trip (createUpiIntent.ts's own note), and the
// webhook writes razorpay_payment_id onto the trip row directly (plus
// cascading it onto every leg) — polling the trip itself is the correct
// single source of truth here, not any one leg's own order row.

import { fetchOrder } from '../api/orders';
import { fetchTrip } from '../api/trips';

const POLL_INTERVAL_MS = 4000;
const MAX_ATTEMPTS = 30; // 30 * 4s = 120s

export async function pollOrderPaid(id: { orderId: string } | { tripId: string }): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const record = 'tripId' in id ? await fetchTrip(id.tripId) : await fetchOrder(id.orderId);
    if (record.razorpay_payment_id) return true;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return false;
}
