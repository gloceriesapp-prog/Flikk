import { ApiError } from '../../../api/client';

// The saved checkout attempt (idempotency key) exists ONLY so a lost/timed-out
// response can be retried without placing a second order. A definitive server
// rejection (OUT_OF_STOCK, PROMO_CHANGED, PRICE_CHANGED, QUOTE_CHANGED, …) means
// the checkout transaction rolled back, so keeping the attempt would only
// replay a cart the customer must change. Network errors, timeouts (status 0),
// 5xx, auth refresh (401) and throttling stay retryable.
export function keepsCheckoutAttempt(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.status === 0 || err.status >= 500 || [401, 408, 425, 429].includes(err.status);
}
