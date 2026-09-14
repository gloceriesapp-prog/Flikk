import { describe, expect, it } from 'vitest';
import { calcDiscount, PromoValidationError, validatePromoCode, type PromoCodeRow } from './promos.js';

function makePromo(overrides: Partial<PromoCodeRow> = {}): PromoCodeRow {
  return {
    id: 'promo-1',
    code: 'FLAT50',
    discount_type: 'flat',
    discount_value: 50,
    max_discount_amount: null,
    min_order_value: 0,
    usage_limit: null,
    times_used: 0,
    is_active: true,
    expires_at: null,
    ...overrides,
  };
}

describe('calcDiscount', () => {
  it('applies a flat discount as-is', () => {
    expect(calcDiscount(500, makePromo({ discount_type: 'flat', discount_value: 50 }))).toBe(50);
  });

  it('applies a percent discount against the cart', () => {
    expect(calcDiscount(1000, makePromo({ discount_type: 'percent', discount_value: 10 }))).toBe(100);
  });

  it('caps a percent discount at max_discount_amount', () => {
    expect(calcDiscount(10000, makePromo({ discount_type: 'percent', discount_value: 50, max_discount_amount: 200 }))).toBe(200);
  });

  it('never discounts more than the cart itself', () => {
    expect(calcDiscount(30, makePromo({ discount_type: 'flat', discount_value: 500 }))).toBe(30);
  });
});

describe('validatePromoCode', () => {
  it('returns the discount for a valid, unused, qualifying code', () => {
    expect(validatePromoCode(makePromo({ min_order_value: 100 }), 500, false)).toBe(50);
  });

  it('rejects an inactive code', () => {
    expect(() => validatePromoCode(makePromo({ is_active: false }), 500, false)).toThrow(PromoValidationError);
  });

  it('rejects an expired code', () => {
    expect(() => validatePromoCode(makePromo({ expires_at: '2020-01-01T00:00:00Z' }), 500, false)).toThrow(PromoValidationError);
  });

  it('rejects a code past its overall usage limit', () => {
    expect(() => validatePromoCode(makePromo({ usage_limit: 10, times_used: 10 }), 500, false)).toThrow(PromoValidationError);
  });

  it('rejects a code this customer already redeemed', () => {
    expect(() => validatePromoCode(makePromo(), 500, true)).toThrow(PromoValidationError);
  });

  it('rejects a cart below min_order_value', () => {
    expect(() => validatePromoCode(makePromo({ min_order_value: 1000 }), 500, false)).toThrow(PromoValidationError);
  });

  it('throws with the specific error code callers branch on', () => {
    try {
      validatePromoCode(makePromo({ is_active: false }), 500, false);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PromoValidationError);
      expect((err as PromoValidationError).code).toBe('PROMO_INACTIVE');
    }
  });
});
