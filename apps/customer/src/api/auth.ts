// Maps to POST /auth/otp/request, POST /auth/otp/verify, POST /auth/refresh,
// and GET /auth/me — shared across all 4 apps per
// specs/00-foundation/auth-and-roles.md. No customer-specific auth logic.

import { apiRequest } from './client';
import type { AccountRole } from '../utils/roleGuard';

export function requestOtp(phone: string): Promise<{ ok: true }> {
  return apiRequest('/auth/otp/request', { method: 'POST', body: { phone }, auth: false });
}

export interface VerifyOtpResult {
  access_token: string;
  refresh_token: string;
  // One phone number, one role (utils/roleGuard.ts's own note) — checked
  // by OtpVerificationScreen.tsx before ever persisting this session.
  role: AccountRole;
}

export function verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
  return apiRequest('/auth/otp/verify', { method: 'POST', body: { phone, code }, auth: false });
}

// Exchanges a still-valid refresh token for a new access/refresh pair — see
// useAuthStore.ts's own note on why this exists. Called from api/client.ts's
// `refresh` handling on a 401, not directly from any screen.
export function refreshSession(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
  return apiRequest('/auth/refresh', { method: 'POST', body: { refresh_token: refreshToken }, auth: false });
}

// AddressFormScreen's own phone prefill (the account's own verified number
// is the sensible default recipient contact — see that screen's own note).
export function fetchAccountInfo(): Promise<{ phone: string; name: string | null; created_at: string }> {
  return apiRequest('/auth/me');
}

// Registers this device's Expo push token so backend/src/routes/orders.ts's
// PATCH /:id/status can reach it the moment a store/rider moves the order
// forward — see features/push-notifications/registerPushToken.ts for where
// this is called from. No dev-mode fallback needed: a failed registration
// just means no push, TrackOrderScreen's own polling still covers it.
export function savePushToken(token: string): Promise<void> {
  return apiRequest('/auth/push-token', { method: 'POST', body: { token } });
}
