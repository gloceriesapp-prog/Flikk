import { expect, it } from 'vitest';
import { authProviderError } from './providerErrors.js';

it.each(['send', 'verify', 'refresh'] as const)('keeps %s outages and rate limits distinct from invalid credentials', operation => {
  for (const error of [new TypeError('fetch failed'), { status: 503 }, { name: 'AuthRetryableFetchError', status: 0 }, null]) expect(authProviderError(error, operation)).toMatchObject({ status: 503, code: 'AUTH_TEMPORARILY_UNAVAILABLE' });
  expect(authProviderError({ status: 429 }, operation)).toMatchObject({ status: 429, code: 'AUTH_RATE_LIMITED' });
  expect(authProviderError({ code: 'user_banned' }, operation)).toMatchObject({ status: 403, code: 'ACCOUNT_BLOCKED' });
});
it('only classifies known rejected credentials as invalid', () => {
  expect(authProviderError({ code: 'otp_expired', status: 403 }, 'verify')).toMatchObject({ status: 401, code: 'OTP_INVALID' });
  expect(authProviderError({ code: 'refresh_token_already_used', status: 400 }, 'refresh')).toMatchObject({ status: 401, code: 'INVALID_REFRESH_TOKEN' });
  expect(authProviderError({ status: 400, code: 'hook_timeout' }, 'send')).toMatchObject({ status: 503 });
});
