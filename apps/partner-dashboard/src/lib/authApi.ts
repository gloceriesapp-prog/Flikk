// Maps to POST /auth/otp/request, POST /auth/otp/verify, GET /auth/me
// (backend/src/routes/auth.ts) — the exact same phone-OTP flow the
// partner mobile app uses. A store owner logs into this dashboard with
// the SAME phone number/account as their app, not a separate web-only
// identity.

import { apiRequest } from './api';
import { setTokens } from './authStorage';

// Real pre-flight gate — backend/src/routes/auth.ts's own POST
// /otp/partner-check, called before requestOtp below. Throws ApiError
// (404 PARTNER_NOT_REGISTERED) if this phone was never approved as a
// store owner or never submitted an application — see that route's own
// note on why this has to happen BEFORE the real OTP send, not after.
export function checkPartnerPhone(phone: string): Promise<{ registered: true }> {
  return apiRequest('/auth/otp/partner-check', { method: 'POST', body: { phone }, auth: false });
}

export function requestOtp(phone: string): Promise<{ ok: true }> {
  return apiRequest('/auth/otp/request', { method: 'POST', body: { phone }, auth: false });
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
  const result = await apiRequest<VerifyOtpResponse>('/auth/otp/verify', {
    method: 'POST',
    body: { phone, code },
    auth: false,
  });
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
  phone: string;
  name: string | null;
}

export function fetchMe(): Promise<Me> {
  return apiRequest('/auth/me');
}
