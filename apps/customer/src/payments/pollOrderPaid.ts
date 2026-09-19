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
//
// Each wait between checks races the fixed interval against the app
// coming back to the foreground (AppState 'active') — the moment the
// customer returns from GPay/PhonePe/etc (confirmed OR cancelled, either
// way control comes back to us), that's the single most likely instant
// for the webhook to have just landed, and waiting out the rest of a
// stale 4s tick before checking again read as "the processing screen
// isn't updating." This doesn't add extra attempts beyond MAX_ATTEMPTS —
// a fast foreground return just spends one attempt sooner, same total
// budget either way.
//
// A declined/cancelled payment doesn't need the full 2-minute budget
// either — Razorpay's own payment.failed webhook event
// (backend/src/payments/webhook.ts) cancels the order/trip within
// seconds of the actual decline/cancel inside the PSP app, well before
// this loop would ever time out on its own. Checking record.status here
// is what lets a real failure short-circuit immediately instead of
// sitting through attempts that would only ever find the same "still not
// paid" result the customer already effectively knows.

import { AppState } from 'react-native';
import { fetchOrder } from '../api/orders';
import { fetchTrip } from '../api/trips';

const POLL_INTERVAL_MS = 4000;
const MAX_ATTEMPTS = 30; // 30 * 4s = 120s

// Exported so PaymentProcessingScreen's own countdown always matches this
// function's real timeout budget exactly — a hardcoded duplicate number
// there could silently drift from this one if either ever changes.
export const POLL_TIMEOUT_SECONDS = (MAX_ATTEMPTS * POLL_INTERVAL_MS) / 1000;

function waitForNextCheck(ms: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(finish, ms);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') finish();
    });
    function finish() {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription.remove();
      resolve();
    }
  });
}

export async function pollOrderPaid(id: { orderId: string } | { tripId: string }): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const record = 'tripId' in id ? await fetchTrip(id.tripId) : await fetchOrder(id.orderId);
    if (record.razorpay_payment_id) return true;
    if (record.status === 'cancelled') return false;
    await waitForNextCheck(POLL_INTERVAL_MS);
  }
  return false;
}
