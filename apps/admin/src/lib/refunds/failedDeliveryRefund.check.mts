// Runnable self-check for the failed-delivery refund guard (the money path).
// No test runner in admin (package.json has no `test` script), so this is a
// plain assert script: `npx tsx src/lib/refunds/failedDeliveryRefund.check.mts`.
import assert from 'node:assert/strict';
import { failedDeliveryRefundEligibility, manualRefundReference } from './failedDeliveryRefund';

// Refundable: failed delivery, never refunded, has an online payment.
assert.deepEqual(
  failedDeliveryRefundEligibility({ status: 'failed', refundStatus: 'none', providerPaymentId: 'cf_pay_1' }),
  { ok: true },
);

// Double-refund guard: anything other than 'none' is blocked (409).
for (const refundStatus of ['processing', 'completed', 'failed', 'manual_required']) {
  const r = failedDeliveryRefundEligibility({ status: 'failed', refundStatus, providerPaymentId: 'cf_pay_1' });
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.httpStatus, 409);
}

// Not a failed delivery (e.g. a cancelled order) — wrong flow, blocked.
assert.equal(
  failedDeliveryRefundEligibility({ status: 'cancelled', refundStatus: 'none', providerPaymentId: 'cf_pay_1' }).ok,
  false,
);

// No online payment to refund — blocked.
assert.equal(
  failedDeliveryRefundEligibility({ status: 'failed', refundStatus: 'none', providerPaymentId: null }).ok,
  false,
);

// Manual refund reference: a real UTR/UPI ref passes trimmed; junk is rejected.
assert.equal(manualRefundReference('  UTR123456789 '), 'UTR123456789');
for (const bad of [undefined, 42, '', '   ', 'ab', '-leading', 'x'.repeat(65), 'ok<script>']) {
  assert.equal(manualRefundReference(bad), null);
}

console.log('failedDeliveryRefund checks: all passed');
