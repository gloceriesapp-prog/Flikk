// Real backend auth — maps to POST /auth/otp/request, POST /auth/otp/
// verify, POST /auth/refresh, and GET /auth/me, shared across all 4 apps
// per specs/00-foundation/auth-and-roles.md. Replaces the old mock (any
// phone/any code succeeded, no backend round trip) now that backend/src/
// routes/rider.ts is real and this app actually needs a real session to
// call it.
//
// One real gap this does NOT solve: there is no self-serve "become a
// rider" endpoint anywhere in the backend. A brand-new phone number always
// gets provisioned as role='customer' (requireAuth's own lazy-provisioning
// note) — a rider account only exists because someone (currently: manual
// SQL against the users table) already flipped that row's role to 'rider'.
// fetchAccountStatus below is what lets RootNavigator tell "not a rider
// yet" apart from "a rider pending admin approval" instead of just 403ing
// forever on every backend/src/routes/rider.ts call.

import { apiRequest } from './client';
import type { AccountRole } from '../store/useAuthStore';

export interface VerifyOtpResult {
  accessToken: string;
  refreshToken: string;
  phone: string;
  // One phone number, one role (utils/roleGuard.ts's own note) — checked
  // by OtpVerificationScreen.tsx before ever persisting this session.
  role: AccountRole;
}

export async function requestOtp(phone: string): Promise<{ ok: true }> {
  return apiRequest('/auth/otp/request', { method: 'POST', body: { phone }, auth: false });
}

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
  const { access_token, refresh_token, role } = await apiRequest<{ access_token: string; refresh_token: string; role: AccountRole }>(
    '/auth/otp/verify',
    { method: 'POST', body: { phone, code }, auth: false },
  );
  return { accessToken: access_token, refreshToken: refresh_token, phone, role };
}

export interface AccountStatus {
  role: AccountRole;
  is_approved: boolean;
}

// Polled by a waiting/gate screen the same way apps/partner's own
// WaitingApprovalScreen polls GET /auth/me — see RootNavigator's own note
// on the two distinct blocking states this resolves.
export function fetchAccountStatus(): Promise<AccountStatus> {
  return apiRequest('/auth/me');
}

// Registers this device's Expo push token so backend/src/routes/admin.ts's
// PATCH /orders/:id/assign-rider can reach it the instant a founder
// assigns this rider a real order — see features/push-notifications/
// registerPushToken.ts for where this is called from. No dev-mode
// fallback needed: a failed registration just means no push, this app's
// own 12s poll (useRiderOrdersStore.ts) still covers it.
export function savePushToken(token: string): Promise<void> {
  return apiRequest('/auth/push-token', { method: 'POST', body: { token } });
}
