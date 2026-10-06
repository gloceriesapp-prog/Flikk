// Legacy pure reconciliation helper, retained for regression checks.
// Refund creation is exclusively owned by the durable backend refund workers;
// API routes and the admin app enqueue database intents instead of moving money.
export type RefundStatus = 'processing' | 'completed' | 'failed';

export interface RefundResult {
  status: RefundStatus;
  razorpayRefundId: string | null;
}

interface RazorpayRefund {
  id: string;
  amount: number;
  status: 'pending' | 'processed' | 'failed';
}

// Pure decision, split out so the money logic is unit-testable without a
// network call (refund.check.mts). Given Razorpay's own refund records for a
// payment and the requested paise: is this payment ALREADY refunded for at
// least that amount? null → a new refund still has to be created.
//
// The load-bearing rule: EXCLUDE status:'failed' items. A failed Razorpay
// refund still carries its requested `amount` but moved no money, so summing
// it made a Retry (or a re-cancel on the backend mirror) wrongly conclude
// "already refunded" and skip creating a real one — the customer stayed
// unpaid. Dropping failed items from the sum is what makes Retry actually
// retry. Keep in sync with backend/src/payments/refundPayment.ts.
export function resolveExistingRefund(items: RazorpayRefund[], amountPaise: number): RefundResult | null {
  const settled = items.filter((r) => r.status !== 'failed');
  const alreadyRefundedPaise = settled.reduce((sum, r) => sum + r.amount, 0);
  if (alreadyRefundedPaise < amountPaise) return null;

  // settled is non-empty here (sum >= amountPaise > 0) and never holds a
  // failed item, so match.status is only ever 'processed' | 'pending'.
  const processed = settled.find((r) => r.status === 'processed');
  const match = processed ?? settled[settled.length - 1];
  return {
    status: match?.status === 'processed' ? 'completed' : 'processing',
    razorpayRefundId: match?.id ?? null,
  };
}
