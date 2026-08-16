import { describe, expect, it } from 'vitest';
import { calcCommission, calcItemTotal, calcNetPayout, calcOrderTotal } from './pricing.js';

describe('pricing', () => {
  it('sums line items', () => {
    expect(calcItemTotal([{ unitPrice: 10, quantity: 2 }, { unitPrice: 5.5, quantity: 3 }])).toBe(36.5);
  });

  it('handles zero-quantity-free cart edge case (empty)', () => {
    expect(calcItemTotal([])).toBe(0);
  });

  it('rounds to 2dp at a rounding boundary', () => {
    expect(calcItemTotal([{ unitPrice: 0.1, quantity: 3 }])).toBe(0.3);
  });

  it('computes commission within the 12-18% band', () => {
    expect(calcCommission(1000, 0.12)).toBe(120);
    expect(calcCommission(1000, 0.18)).toBe(180);
  });

  it('rejects an out-of-range commission rate', () => {
    expect(() => calcCommission(1000, 1.5)).toThrow();
  });

  it('adds delivery fee for order total', () => {
    expect(calcOrderTotal(100, 25)).toBe(125);
  });

  it('computes net payout as gross minus commission', () => {
    expect(calcNetPayout(1000, 150)).toBe(850);
  });
});
