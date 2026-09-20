// Phone-OTP auth contract — the actual HTTP shape of POST /auth/otp/request,
// POST /auth/otp/verify, GET /auth/me, POST /auth/push-token
// (backend/src/routes/auth.ts), shared across every app that authenticates
// this way. `createAuthApi` takes an already-configured ApiClient
// (createApiClient from ./client) so it never has to know how a given app
// stores its session — same separation of concerns as that module's own
// note.
//
// What's deliberately NOT here: any devAuthFallback-style "no backend
// reachable, simulate it locally" logic. That's a per-app development
// convenience (see apps/partner/src/api/devAuthFallback.ts), not part of
// the real contract — mixing it in here would make this module lie about
// what the actual backend does.

import type { ApiClient } from './client';

export interface RequestOtpResult {
  ok: true;
}

export interface VerifyOtpResponse {
  access_token: string;
  // Long-lived, unlike access_token — an app that persists this and wires
  // it into createApiClient's own `refresh` option (client.ts) never gets
  // logged out just because the short-lived access token expired. See
  // backend's own note on POST /otp/verify and POST /refresh.
  refresh_token: string;
  is_approved: boolean;
  has_store: boolean;
  application_submitted: boolean;
  // One phone number, one role — real across all 4 apps (they share one
  // users table). Never mutated by verifying OTP; only a real admin
  // approval changes it. Each app's own OTP screen checks this against
  // the role(s) that app allows before ever persisting the session.
  role: 'customer' | 'store_owner' | 'rider' | 'admin';
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

export interface AccountStatus {
  is_approved: boolean;
  has_store: boolean;
  application_submitted: boolean;
  // Only true for a still-current rejection (a resubmission clears this
  // server-side, see backend's POST /store-application own note) — never
  // stale once the owner has tried again.
  is_rejected?: boolean;
  rejection_reason?: string | null;
  phone?: string;
  name?: string | null;
}

export interface AuthApi {
  requestOtp: (phone: string) => Promise<RequestOtpResult>;
  verifyOtp: (phone: string, code: string) => Promise<VerifyOtpResponse>;
  checkAccountStatus: () => Promise<AccountStatus>;
  savePushToken: (token: string) => Promise<void>;
  // Not wired through apiRequest's own automatic-retry-on-401 (client.ts's
  // `refresh` option) — this IS that option's implementation. An app calls
  // this directly from the `refresh` callback it hands to createApiClient.
  refreshSession: (refreshToken: string) => Promise<RefreshResponse>;
}

export function createAuthApi({ apiRequest }: ApiClient): AuthApi {
  return {
    requestOtp: (phone) => apiRequest<RequestOtpResult>('/auth/otp/request', { method: 'POST', body: { phone }, auth: false }),

    verifyOtp: (phone, code) =>
      apiRequest<VerifyOtpResponse>('/auth/otp/verify', { method: 'POST', body: { phone, code }, auth: false }),

    checkAccountStatus: () => apiRequest<AccountStatus>('/auth/me'),

    savePushToken: (token) => apiRequest<void>('/auth/push-token', { method: 'POST', body: { token } }),

    refreshSession: (refreshToken) =>
      apiRequest<RefreshResponse>('/auth/refresh', { method: 'POST', body: { refresh_token: refreshToken }, auth: false }),
  };
}
