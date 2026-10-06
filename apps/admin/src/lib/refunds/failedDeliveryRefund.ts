// UI eligibility guard; the database uniquely queues refund intent, and the
// backend worker freezes an idempotent provider request before moving money.

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
