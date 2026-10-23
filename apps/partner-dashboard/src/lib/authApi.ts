// Maps to POST /auth/otp/request, POST /auth/otp/verify, GET /auth/me
// (backend/src/routes/auth.ts) — the exact same phone-OTP flow the
// partner mobile app uses. A store owner logs into this dashboard with
// the SAME phone number/account as their app, not a separate web-only
// identity.

import { ApiError, apiRequest } from './api';
import { setTokens } from './authStorage';

// Optional UI preflight; request and verify repeat this check on the server.
// Only existing users with the partner (store_owner) role can sign in here.
export function checkPartnerPhone(phone: string): Promise<{ registered: true }> {
  return apiRequest('/auth/otp/partner-check', { method: 'POST', body: { phone }, auth: false });
}

export function requestOtp(phone: string): Promise<{ ok: true }> {
  return apiRequest('/auth/partner-dashboard/otp/request', { method: 'POST', body: { phone, app: 'partner_dashboard' }, auth: false });
}

interface VerifyOtpResponse {
  access_token: string;
  refresh_token: string;
  is_approved: boolean;
  has_store: boolean;
  application_submitted: boolean;
  role: 'customer' | 'store_owner' | 'rider' | 'admin';
}

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
  const result = await apiRequest<VerifyOtpResponse>('/auth/partner-dashboard/otp/verify', {
    method: 'POST',
    body: { phone, code, app: 'partner_dashboard' },
    auth: false,
  });
  if (result.role !== 'store_owner') throw new ApiError(403, 'PARTNER_LOGIN_REQUIRED', 'Sign in with a registered partner phone number.');
  setTokens(result.access_token, result.refresh_token);
  return result;
}

export interface Me {
  role: 'customer' | 'store_owner' | 'rider' | 'admin';
  is_approved: boolean;
  has_store: boolean;
  application_submitted: boolean;
  is_rejected: boolean;
  rejection_reason: string | null;
  // Admin partner-account suspension (migration 114).
  partner_suspended?: boolean;
  partner_suspended_reason?: string | null;
  phone: string;
  name: string | null;
}

export function fetchMe(): Promise<Me> {
  return apiRequest('/auth/me');
}
