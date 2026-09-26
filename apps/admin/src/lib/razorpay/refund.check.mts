// Runnable self-check for the refund idempotency decision (the money path).
// No test runner in admin (package.json has no `test` script), so this is a
// plain assert script: `npx tsx src/lib/razorpay/refund.check.mts`.
//
// The regression it locks: a status:'failed' Razorpay refund carries a nonzero
// amount but moved no money, so it must NOT count as "already refunded" —
// otherwise Retry skips creating a real refund and the customer stays unpaid.
// Mirrors backend/src/payments/refundPayment.resolve.test.ts.
import assert from 'node:assert/strict';
import { resolveExistingRefund } from './refund';

const FULL = 50000; // paise

// Single failed refund → null: Retry MUST create a new one, not treat as done.
assert.equal(resolveExistingRefund([{ id: 'rfnd_1', amount: FULL, status: 'failed' }], FULL), null);

// Processed refund covering the amount → completed.
assert.deepEqual(resolveExistingRefund([{ id: 'rfnd_1', amount: FULL, status: 'processed' }], FULL), {
  status: 'completed',
  razorpayRefundId: 'rfnd_1',
});

// Failed + processed both present → ignores failed, resolves off processed.
assert.deepEqual(
  resolveExistingRefund(
    [
      { id: 'rfnd_fail', amount: FULL, status: 'failed' },
      { id: 'rfnd_ok', amount: FULL, status: 'processed' },
    ],
    FULL,
  ),
  { status: 'completed', razorpayRefundId: 'rfnd_ok' },
);

// Pending refund covering the amount → processing.
assert.deepEqual(resolveExistingRefund([{ id: 'rfnd_1', amount: FULL, status: 'pending' }], FULL), {
  status: 'processing',
  razorpayRefundId: 'rfnd_1',
});

// Settled sum below requested → null (partial, still owed).
assert.equal(resolveExistingRefund([{ id: 'rfnd_1', amount: FULL - 1, status: 'processed' }], FULL), null);

console.log('resolveExistingRefund: all checks passed');
