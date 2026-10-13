import { ApiError } from '../src/api/client';
import { keepsCheckoutAttempt } from '../src/screens/cart/payment/attemptPolicy';


describe('checkout attempt retention', () => {
  it('drops the idempotency key on definitive server rejections', () => {
    for (const code of ['OUT_OF_STOCK', 'PROMO_CHANGED', 'PRICE_CHANGED', 'QUOTE_CHANGED', 'ATTEMPT_CONFLICT'])
      expect(keepsCheckoutAttempt(new ApiError(409, code, 'x'))).toBe(false);
    expect(keepsCheckoutAttempt(new ApiError(400, 'INVALID_ORDER', 'x'))).toBe(false);
  });
  it('keeps it only for uncertain outcomes (network, timeout, 5xx, auth, throttle)', () => {
    expect(keepsCheckoutAttempt(new TypeError('Network request failed'))).toBe(true);
    for (const status of [0, 401, 408, 429, 500, 502, 503]) expect(keepsCheckoutAttempt(new ApiError(status, 'X', 'x'))).toBe(true);
  });
});
