// Maps to POST /auth/otp/request, POST /auth/otp/verify, GET /auth/me
// (backend/src/routes/auth.ts) — the exact same phone-OTP flow the
// partner mobile app uses. A store owner logs into this dashboard with
// the SAME phone number/account as their app, not a separate web-only
// identity.

import { apiRequest } from './api';
import { setTokens } from './authStorage';

// 'partner_web' tells the backend this is the dashboard: it only sends a code
// (and only signs in) a number whose user role is store_owner, otherwise it
// answers 404 PARTNER_NOT_REGISTERED without sending an SMS.
const APP = 'partner_web';

export function requestOtp(phone: string): Promise<{ ok: true }> {
  return apiRequest('/auth/otp/request', { method: 'POST', body: { phone, app: APP }, auth: false });
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
    body: { phone, code, app: APP },
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
  // Admin partner-account suspension (migration 114).
  partner_suspended?: boolean;
  partner_suspended_reason?: string | null;
  phone: string;
  name: string | null;
}

export function fetchMe(): Promise<Me> {
  return apiRequest('/auth/me');
}
