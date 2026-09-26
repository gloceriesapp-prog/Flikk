// Money path — the double-refund guard for the failed-delivery manual-refund
// flow, kept as a pure function so it has ONE runnable self-check
// (failedDeliveryRefund.check.mts) independent of Supabase/Razorpay.
//
// A failed-delivery order was paid at checkout but never auto-refunded (policy
// is manual admin review). It is refundable here only while its refund_status
// is still 'none': the moment a refund is issued, refund_status moves off
// 'none' and this guard blocks any second attempt. That is a check-then-write
// at the DB layer, but the actual money safety against a double Razorpay charge
// is retryRefund()'s own findExistingRefund() idempotency check — this guard is
// the cheap first line, not the only one.

export interface RefundableOrder {
  status: string;
  refundStatus: string;
  razorpayPaymentId: string | null;
}

export type RefundEligibility = { ok: true } | { ok: false; httpStatus: number; error: string };

export function failedDeliveryRefundEligibility(order: RefundableOrder): RefundEligibility {
  if (order.status !== 'failed') {
    return { ok: false, httpStatus: 400, error: 'Only failed-delivery orders can be refunded here.' };
  }
  if (order.refundStatus !== 'none') {
    return { ok: false, httpStatus: 409, error: `A refund is already '${order.refundStatus}' for this order.` };
  }
  if (!order.razorpayPaymentId) {
    return { ok: false, httpStatus: 400, error: 'This order has no online payment to refund.' };
  }
  return { ok: true };
}
