// Money-path guard: CANCELLED/REJECTED refunds carry an amount but moved no
// money, so they must never count as "already refunded".
import { expect, it } from 'vitest';
import { mapRefundStatus, normalizeRefund, refundProgress } from './refundPayment.js';
it('maps every Cashfree refund status', () => {
  expect(mapRefundStatus('SUCCESS')).toBe('completed');
  for (const s of ['PENDING', 'PENDING_APPROVAL', 'ONHOLD']) expect(mapRefundStatus(s)).toBe('processing');
  for (const s of ['CANCELLED', 'REJECTED']) expect(mapRefundStatus(s)).toBe('failed');
});
it('ignores failed refunds when deciding what is still owed', () => {
  const items = [{ refund_id: 'rf_a', refund_amount: 500, refund_status: 'CANCELLED' }, { refund_id: 'rf_b', refund_amount: 499.99, refund_status: 'SUCCESS' }].map(normalizeRefund);
  expect(refundProgress(items, 50000)).toEqual({ remaining: 1, completed: 49999, settled: false });
  expect(() => normalizeRefund({ refund_id: '', refund_amount: 1, refund_status: 'SUCCESS' })).toThrow();
});
