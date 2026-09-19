// A customer-cancelled order's refund — called from routes/orders.ts's
// PATCH /:id/status handler, only when the order was actually paid online
// (orders.razorpay_payment_id set; a COD order has nothing to refund).
// Uses the razorpay npm SDK's own payments.refund — no new REST wiring
// needed the way createUpiIntent.ts had to hand-roll for S2S UPI.
//
// Amount is always this order's own stored `total` (paise = rupees*100,
// rounded — floating point rupees can't be trusted for an exact paise
// integer), never recomputed from order_items — same
// unit_price_at_order/historical-value principle CLAUDE.md's own note on
// orders.total documents. For a multi-store trip, every leg shares the
// SAME underlying razorpay_payment_id (verifyPayment.ts's own cascade) —
// Razorpay supports multiple partial refunds against one payment as long
// as the running total never exceeds the original charge, so refunding
// just this leg's own `total` here is correct without needing to touch
// or even look at sibling legs.
import { razorpay } from './razorpayClient.js';
import { logger } from '../lib/logger.js';

export type RefundStatus = 'processing' | 'completed' | 'failed';

export interface RefundResult {
  status: RefundStatus;
  razorpayRefundId: string | null;
}

// Real idempotency guard, not a defensive-programming guess: if a
// previous call to this function actually reached Razorpay and created a
// refund, but the response never made it back here (a network blip, a
// process restart mid-request, a caller retrying after a timeout that
// wasn't actually a failure), calling payments.refund() again would
// create a SECOND real refund against the same payment — real money moved
// twice for one cancellation. Checking what Razorpay itself already knows
// about this payment's refunds first, and treating "already covered" as
// success instead of refunding again, is what actually closes that gap —
// not just hoping a retry never happens.
async function findExistingRefund(razorpayPaymentId: string, amountPaise: number): Promise<RefundResult | null> {
  const existing = await razorpay.payments.fetchMultipleRefund(razorpayPaymentId);
  const alreadyRefundedPaise = existing.items.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  if (alreadyRefundedPaise < amountPaise) return null;

  // Prefer a 'processed' refund's own id if one exists among the matches,
  // otherwise fall back to whichever one pushed the running total over
  // the requested amount — either way this is real, already-Razorpay-
  // confirmed data, never a guess.
  const processed = existing.items.find((r) => r.status === 'processed');
  const match = processed ?? existing.items[existing.items.length - 1];
  return {
    status: match?.status === 'processed' ? 'completed' : match?.status === 'failed' ? 'failed' : 'processing',
    razorpayRefundId: match?.id ?? null,
  };
}

// Razorpay's own refund object status is 'pending' (UPI/most methods —
// settles within days, confirmed later by the refund.processed webhook)
// or occasionally 'processed' immediately in the same response (some
// instant-refund-eligible methods). Mapped to this app's own three-state
// refund_status; webhook.ts's own refund event handler is what moves
// 'processing' to 'completed' (or 'failed') once Razorpay confirms it
// asynchronously — this function's return value is only ever the FIRST
// data point, not the final word.
export async function refundPayment(razorpayPaymentId: string, amountRupees: number): Promise<RefundResult> {
  const amountPaise = Math.round(amountRupees * 100);
  try {
    const existing = await findExistingRefund(razorpayPaymentId, amountPaise);
    if (existing) return existing;

    const refund = await razorpay.payments.refund(razorpayPaymentId, { amount: amountPaise });
    // Razorpay's own refund.status is 'pending' | 'processed' | 'failed'.
    // A same-request 'failed' is rare (usually surfaces via the async
    // webhook instead) but mapped explicitly rather than falling into
    // 'processing', which would show the customer a false "on its way".
    const status: RefundStatus = refund.status === 'processed' ? 'completed' : refund.status === 'failed' ? 'failed' : 'processing';
    return { status, razorpayRefundId: refund.id };
  } catch (err) {
    // Never thrown further — a refund failure must not block the
    // cancellation itself from succeeding (the customer's order is
    // cancelled either way; a failed refund needs manual follow-up, not a
    // retry loop inside this request). The caller stores 'failed' and
    // shows an honest "refund failed" state rather than silently
    // pretending it succeeded.
    logger.error({ err, razorpayPaymentId }, '[refundPayment] Razorpay refund call failed');
    return { status: 'failed', razorpayRefundId: null };
  }
}
