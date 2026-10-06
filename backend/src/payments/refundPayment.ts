// Legacy pure reconciliation helper, retained for regression checks.
// Refund creation is exclusively owned by the durable backend refund workers;
// API routes and the admin app enqueue database intents instead of moving money.
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
// Pure decision, split out so the money logic is unit-testable without a
// network call (refundPayment.resolve.test.ts). See the header note above for
// why the idempotency check exists at all.
//
// The load-bearing rule: EXCLUDE status:'failed' items. A failed Razorpay
// refund still carries its requested `amount` but moved no money, so summing
// it made a re-cancel (or the admin Retry mirror) wrongly conclude "already
// refunded" and skip creating a real one — the customer stayed unpaid.
// Keep in sync with apps/admin/src/lib/razorpay/refund.ts.
interface RefundItem {
  id: string;
  amount?: number;
  status: string;
}

export function resolveExistingRefund(items: RefundItem[], amountPaise: number): RefundResult | null {
  const settled = items.filter((r) => r.status !== 'failed');
  const alreadyRefundedPaise = settled.reduce((sum, r) => sum + (r.amount ?? 0), 0);
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
