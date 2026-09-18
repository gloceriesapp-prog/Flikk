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

// Razorpay's own refund object status is 'pending' (UPI/most methods —
// settles within days, confirmed later by the refund.processed webhook)
// or occasionally 'processed' immediately in the same response (some
// instant-refund-eligible methods). Mapped to this app's own three-state
// refund_status; webhook.ts's own refund event handler is what moves
// 'processing' to 'completed' (or 'failed') once Razorpay confirms it
// asynchronously — this function's return value is only ever the FIRST
// data point, not the final word.
export async function refundPayment(razorpayPaymentId: string, amountRupees: number): Promise<RefundResult> {
  try {
    const refund = await razorpay.payments.refund(razorpayPaymentId, {
      amount: Math.round(amountRupees * 100),
    });
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
