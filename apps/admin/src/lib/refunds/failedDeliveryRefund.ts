// UI eligibility guard; the database uniquely queues refund intent, and the
// backend worker freezes an idempotent provider request before moving money.
// Admin never calls the payment provider itself.

export interface RefundableOrder {
  status: string;
  refundStatus: string;
  providerPaymentId: string | null;
}

export type RefundEligibility = { ok: true } | { ok: false; httpStatus: number; error: string };

export function failedDeliveryRefundEligibility(order: RefundableOrder): RefundEligibility {
  if (order.status !== 'failed') {
    return { ok: false, httpStatus: 400, error: 'Only failed-delivery orders can be refunded here.' };
  }
  if (order.refundStatus !== 'none') {
    return { ok: false, httpStatus: 409, error: `A refund is already '${order.refundStatus}' for this order.` };
  }
  if (!order.providerPaymentId) {
    return { ok: false, httpStatus: 400, error: 'This order has no online payment to refund.' };
  }
  return { ok: true };
}

// "Mark refunded manually" — only for refunds the system can't send through
// Cashfree (legacy-provider payments). The reference is the bank/UPI UTR the
// founder paid with; trimmed, 4-64 chars, no free-form notes.
export function manualRefundReference(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const ref = raw.trim();
  return /^[A-Za-z0-9][A-Za-z0-9 ._/-]{3,63}$/.test(ref) ? ref : null;
}
