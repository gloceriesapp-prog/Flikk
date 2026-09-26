// Money-path guard for the refund idempotency decision. The regression this
// locks: a status:'failed' Razorpay refund carries a nonzero amount but moved
// no money, so it must NOT count as "already refunded" — otherwise a re-cancel
// (or the admin Retry mirror) skips creating a real refund and the customer
// stays unpaid.
import { describe, it, expect } from 'vitest';
import { resolveExistingRefund } from './refundPayment.js';

const FULL = 50000; // paise

describe('resolveExistingRefund', () => {
  it('single failed refund → null (must create a new refund, not treat as done)', () => {
    expect(resolveExistingRefund([{ id: 'rfnd_1', amount: FULL, status: 'failed' }], FULL)).toBeNull();
  });

  it('processed refund covering the amount → completed', () => {
    expect(resolveExistingRefund([{ id: 'rfnd_1', amount: FULL, status: 'processed' }], FULL)).toEqual({
      status: 'completed',
      razorpayRefundId: 'rfnd_1',
    });
  });

  it('failed + processed both present → ignores failed, resolves off processed', () => {
    const items = [
      { id: 'rfnd_fail', amount: FULL, status: 'failed' },
      { id: 'rfnd_ok', amount: FULL, status: 'processed' },
    ];
    expect(resolveExistingRefund(items, FULL)).toEqual({ status: 'completed', razorpayRefundId: 'rfnd_ok' });
  });

  it('pending refund covering the amount → processing', () => {
    expect(resolveExistingRefund([{ id: 'rfnd_1', amount: FULL, status: 'pending' }], FULL)).toEqual({
      status: 'processing',
      razorpayRefundId: 'rfnd_1',
    });
  });

  it('settled sum below requested → null (partial, still owed)', () => {
    expect(resolveExistingRefund([{ id: 'rfnd_1', amount: FULL - 1, status: 'processed' }], FULL)).toBeNull();
  });

  it('missing amount treated as 0 → null', () => {
    expect(resolveExistingRefund([{ id: 'rfnd_1', status: 'processed' }], FULL)).toBeNull();
  });
});
