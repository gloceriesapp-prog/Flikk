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
  is_approved: boolean;
  has_store: boolean;
  application_submitted: boolean;
}

export interface AccountStatus {
  is_approved: boolean;
  has_store: boolean;
  application_submitted: boolean;
  phone?: string;
  name?: string | null;
}

export interface AuthApi {
  requestOtp: (phone: string) => Promise<RequestOtpResult>;
  verifyOtp: (phone: string, code: string) => Promise<VerifyOtpResponse>;
  checkAccountStatus: () => Promise<AccountStatus>;
  savePushToken: (token: string) => Promise<void>;
}

export function createAuthApi({ apiRequest }: ApiClient): AuthApi {
  return {
    requestOtp: (phone) => apiRequest<RequestOtpResult>('/auth/otp/request', { method: 'POST', body: { phone }, auth: false }),

    verifyOtp: (phone, code) =>
      apiRequest<VerifyOtpResponse>('/auth/otp/verify', { method: 'POST', body: { phone, code }, auth: false }),

    checkAccountStatus: () => apiRequest<AccountStatus>('/auth/me'),

    savePushToken: (token) => apiRequest<void>('/auth/push-token', { method: 'POST', body: { token } }),
  };
}
