import { ApiError } from '../src/api/client';
import { keepsCheckoutAttempt } from '../src/screens/cart/payment/attemptPolicy';
import { iosUpiLink } from '../src/payments/upiIntent';
import { UPI_APPS } from '../src/payments/upiApps';

jest.mock('expo-intent-launcher', () => ({ startActivityAsync: jest.fn() }));

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

describe('iOS UPI app routing', () => {
  const link = 'upi://pay?pa=merchant@cashfree&pn=Gloceries&am=123.45&tr=abc&cu=INR';
  it('swaps only the scheme prefix for the tapped app', () => {
    const app = (id: string) => UPI_APPS.find((a) => a.id === id)!;
    expect(iosUpiLink(app('gpay'), link)).toBe('tez://upi/pay?pa=merchant@cashfree&pn=Gloceries&am=123.45&tr=abc&cu=INR');
    expect(iosUpiLink(app('phonepe'), link)).toBe('phonepe://pay?pa=merchant@cashfree&pn=Gloceries&am=123.45&tr=abc&cu=INR');
    expect(iosUpiLink(app('paytm'), link)).toBe('paytmmp://pay?pa=merchant@cashfree&pn=Gloceries&am=123.45&tr=abc&cu=INR');
  });
  it('every iOS prefix scheme is declared in LSApplicationQueriesSchemes', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const schemes: string[] = require('../app.config.js').expo.ios.infoPlist.LSApplicationQueriesSchemes;
    for (const app of UPI_APPS) expect(schemes).toContain(app.iosUpiPrefix.split('://')[0]);
  });
  it('rejects anything that is not a upi:// link', () => {
    expect(() => iosUpiLink(UPI_APPS[0]!, 'https://evil.example')).toThrow();
  });
});
