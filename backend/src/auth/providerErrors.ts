import { AppError } from '../lib/errors.js';

type Operation = 'send' | 'verify' | 'refresh';
const expiredCodes = new Set(['otp_expired', 'otp_disabled', 'invalid_credentials']);
const invalidSessionCodes = new Set(['refresh_token_not_found', 'refresh_token_already_used', 'session_not_found', 'session_expired', 'bad_jwt']);

// Provider failures must never become an invalid-code/session response: clients
// legitimately clear sessions on 401. Keep provider details and codes private.
export function authProviderError(error: unknown, operation: Operation): AppError {
  const value = error && typeof error === 'object' ? error as { status?: unknown; code?: unknown; name?: unknown } : {};
  if (value.code === 'user_banned') return new AppError(403, 'ACCOUNT_BLOCKED', 'This account has been blocked. Contact Gloceries support.');
  if (value.status === 429 || value.code === 'over_request_rate_limit' || value.code === 'over_sms_send_rate_limit') {
    return new AppError(429, 'AUTH_RATE_LIMITED', 'Too many attempts. Wait a minute and try again.');
  }
  if (operation === 'verify' && typeof value.code === 'string' && expiredCodes.has(value.code)) {
    return new AppError(401, 'OTP_INVALID', 'Invalid or expired code.');
  }
  if (operation === 'refresh' && typeof value.code === 'string' && invalidSessionCodes.has(value.code)) {
    return new AppError(401, 'INVALID_REFRESH_TOKEN', 'Session could not be refreshed.');
  }
  return new AppError(503, 'AUTH_TEMPORARILY_UNAVAILABLE', 'Sign-in is temporarily unavailable. Please retry.');
}
