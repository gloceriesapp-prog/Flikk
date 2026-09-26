// Runnable self-check for the failed-delivery refund guard (the money path).
// No test runner in admin (package.json has no `test` script), so this is a
// plain assert script: `npx tsx src/lib/refunds/failedDeliveryRefund.check.mts`.
import assert from 'node:assert/strict';
import { failedDeliveryRefundEligibility } from './failedDeliveryRefund';

// Refundable: failed delivery, never refunded, has an online payment.
assert.deepEqual(
  failedDeliveryRefundEligibility({ status: 'failed', refundStatus: 'none', razorpayPaymentId: 'pay_1' }),
  { ok: true },
);

// Double-refund guard: anything other than 'none' is blocked (409).
for (const refundStatus of ['processing', 'completed', 'failed']) {
  const r = failedDeliveryRefundEligibility({ status: 'failed', refundStatus, razorpayPaymentId: 'pay_1' });
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.httpStatus, 409);
}

// Not a failed delivery (e.g. a cancelled order) — wrong flow, blocked.
assert.equal(
  failedDeliveryRefundEligibility({ status: 'cancelled', refundStatus: 'none', razorpayPaymentId: 'pay_1' }).ok,
  false,
);

// No online payment to refund — blocked.
assert.equal(
  failedDeliveryRefundEligibility({ status: 'failed', refundStatus: 'none', razorpayPaymentId: null }).ok,
  false,
);

console.log('failedDeliveryRefundEligibility: all checks passed');
