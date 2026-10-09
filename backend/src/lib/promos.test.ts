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

// Exact reimplementation of the SQL guard (migrations 083/096) on BigInt
// paise: numeric(10,2) inputs, items*value/100 exact, round(...,2) half
// away from zero (all values non-negative), least(items, raw, cap).
function sqlDiscountPaise(itemPaise: bigint, type: 'flat' | 'percent', valueHundredths: bigint, capPaise: bigint | null): bigint {
  let raw = type === 'flat' ? valueHundredths : (itemPaise * valueHundredths + 5000n) / 10000n;
  if (capPaise != null && capPaise < raw) raw = capPaise;
  return raw < itemPaise ? raw : itemPaise;
}

describe('calcDiscount matches the SQL promotion guard exactly', () => {
  it('sweeps cart totals × percentages (including half-paisa boundaries) and caps', () => {
    const percents = [1, 2.5, 5, 7.5, 10, 12.5, 15, 17.25, 18, 20, 25, 33.33, 50, 99.99, 100];
    const caps: (number | null)[] = [null, 25, 99.99, 150];
    let checked = 0;
    for (let paise = 1; paise <= 300_000; paise += paise < 2_000 ? 1 : 137) {
      for (const pct of percents) for (const cap of caps) {
        const expected = sqlDiscountPaise(BigInt(paise), 'percent', BigInt(Math.round(pct * 100)), cap == null ? null : BigInt(Math.round(cap * 100)));
        const got = calcDiscount(paise / 100, makePromo({ discount_type: 'percent', discount_value: pct, max_discount_amount: cap }));
        if (Math.round(got * 100) !== Number(expected) || got !== Number(expected) / 100) {
          throw new Error(`₹${paise / 100} @ ${pct}% cap ${cap}: JS ${got} vs SQL ${Number(expected) / 100}`);
        }
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100_000);
  });

  it('rounds a classic float trap half-up like numeric', () => {
    // 10.05 * 5% = 0.5025 → 0.50; 1.10 * 50% = 0.55 (float gives 0.55000000000000004)
    expect(calcDiscount(10.05, makePromo({ discount_type: 'percent', discount_value: 5 }))).toBe(0.5);
    expect(calcDiscount(1.1, makePromo({ discount_type: 'percent', discount_value: 50 }))).toBe(0.55);
    // 0.30 * 12.5% = 0.0375 → 0.04 (half-up at the paisa)
    expect(calcDiscount(0.3, makePromo({ discount_type: 'percent', discount_value: 12.5 }))).toBe(0.04);
  });

  it('matches SQL for flat codes against small carts', () => {
    for (let paise = 1; paise <= 20_000; paise += 7) {
      const expected = sqlDiscountPaise(BigInt(paise), 'flat', 5000n, null);
      expect(calcDiscount(paise / 100, makePromo({ discount_type: 'flat', discount_value: 50 }))).toBe(Number(expected) / 100);
    }
  });

  it('discounts float-accumulated cart totals exactly as the stored numeric(10,2) item_total', () => {
    // numeric(10,2) stores round(itemTotal, 2); the guard recomputes from that.
    const carts = [0.1 + 0.2, 19.99 * 3, 33.33 + 33.33 + 33.34, 1.1 * 3, 4.35 * 100];
    for (const itemTotal of carts) for (const pct of [12.5, 33.33, 7.5]) {
      const stored = BigInt(Math.round(itemTotal * 100));
      const expected = Number(sqlDiscountPaise(stored, 'percent', BigInt(Math.round(pct * 100)), null)) / 100;
      expect(calcDiscount(itemTotal, makePromo({ discount_type: 'percent', discount_value: pct }))).toBe(expected);
    }
    // 199.90 @ 12.5% = 24.9875 → 24.99; 0.01 @ 50% = 0.005 → 0.01 (half-up)
    expect(calcDiscount(199.9, makePromo({ discount_type: 'percent', discount_value: 12.5 }))).toBe(24.99);
    expect(calcDiscount(0.01, makePromo({ discount_type: 'percent', discount_value: 50 }))).toBe(0.01);
  });
});


describe('promotion scheduling and configurable customer usage', () => {
  it('rejects a future start and allows a started promotion', () => {
    expect(() => validatePromoCode(makePromo({ starts_at: new Date(Date.now() + 60000).toISOString() }), 500, 0)).toThrow('not available yet');
    expect(validatePromoCode(makePromo({ starts_at: '2020-01-01T00:00:00Z' }), 500, 0)).toBe(50);
  });
  it('allows repeats below the configured cap and rejects the final used slot', () => {
    expect(validatePromoCode(makePromo({ per_customer_limit: 3 }), 500, 2)).toBe(50);
    expect(() => validatePromoCode(makePromo({ per_customer_limit: 3 }), 500, 3)).toThrow('usage limit');
  });
  it('keeps the legacy one-use default', () => {
    expect(() => validatePromoCode(makePromo(), 500, 1)).toThrow('usage limit');
  });
});
