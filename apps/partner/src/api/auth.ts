// Maps to POST /auth/otp/request and POST /auth/otp/verify — shared across
// all 4 apps per specs/00-foundation/auth-and-roles.md, same endpoints
// apps/customer/src/api/auth.ts calls. The verify response carries more
// than customer's does (`is_approved`, `has_store`) — this app needs both
// to decide where to route after login (straight to Orders, the waiting
// screen, or first-time Store Setup) in a way customer's simpler
// "token exists = logged in" check doesn't need. GET /auth/me is the
// lightweight recheck useAuthStore polls while the waiting screen is up,
// standing in for a real Supabase Realtime subscription on the user's own
// row (see specs/04-admin-dashboard/flows.md's onboarding flow) until this
// app wires that up directly.
//
// Every function here falls back to devAuthFallback.ts when the real
// backend is unreachable (not when it responds with a real error — see
// isBackendUnreachable's own note) — that's what "OTP not receiving" in
// this sandbox actually was: no backend/SMS provider running anywhere,
// same situation every other screen in this app already handles via
// placeholder data. The fallback disappears on its own the moment a real
// backend answers; nothing here needs to change when that happens.

import { apiRequest } from './client';
import {
  devCheckAccountStatus,
  devRequestOtp,
  devSubmitStoreApplication,
  devVerifyOtp,
  isBackendUnreachable,
} from './devAuthFallback';

export interface RequestOtpResult {
  ok: true;
  devMode: boolean;
}

export async function requestOtp(phone: string): Promise<RequestOtpResult> {
  try {
    const result = await apiRequest<{ ok: true }>('/auth/otp/request', { method: 'POST', body: { phone }, auth: false });
    return { ...result, devMode: false };
  } catch (err) {
    if (!isBackendUnreachable(err)) throw err;
    const result = await devRequestOtp(phone);
    return { ...result, devMode: true };
  }
}

export interface VerifyOtpResponse {
  access_token: string;
  is_approved: boolean;
  has_store: boolean;
}

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
  try {
    return await apiRequest('/auth/otp/verify', { method: 'POST', body: { phone, code }, auth: false });
  } catch (err) {
    if (!isBackendUnreachable(err)) throw err;
    return devVerifyOtp(phone, code);
  }
}

export interface StoreApplication {
  storeName: string;
  category: string;
  district: string;
  gstNumber?: string;
  photoUrl?: string;
}

export async function submitStoreApplication(application: StoreApplication): Promise<{ ok: true }> {
  try {
    return await apiRequest('/partner/store-application', { method: 'POST', body: application });
  } catch (err) {
    if (!isBackendUnreachable(err)) throw err;
    return devSubmitStoreApplication(application);
  }
}

// Storefront photo — uploaded ahead of the actual application submit so
// StoreReviewScreen can show the (already-hosted) photo in its summary and
// submitStoreApplication only ever deals with a plain URL string, never a
// local file. base64 in, public URL out — see backend/src/routes/
// storeOnboarding.ts's own note on why this is its own endpoint, not
// bundled into POST /store-application's body.
export async function uploadStorePhoto(base64: string, contentType: string, localUri: string): Promise<{ url: string }> {
  try {
    return await apiRequest('/partner/store-photo', { method: 'POST', body: { base64, contentType } });
  } catch (err) {
    if (!isBackendUnreachable(err)) throw err;
    // No real storage to fall back to — stands in with the picked file's own
    // local URI so StoreReviewScreen still has something to render.
    return { url: localUri };
  }
}

export interface AccountStatus {
  is_approved: boolean;
  has_store: boolean;
}

// Re-checked on cold start (a returning session's approval/store status
// isn't persisted alongside the token, see useAuthStore.ts's own note) and
// polled by WaitingApprovalScreen — one endpoint, two callers.
export async function checkAccountStatus(): Promise<AccountStatus> {
  try {
    return await apiRequest('/auth/me');
  } catch (err) {
    if (!isBackendUnreachable(err)) throw err;
    return devCheckAccountStatus();
  }
}

// Store Setup's "resume where you left off" — StoreDraft (navigation/
// types.ts) shape minus the derived Coordinates object, since lat/lng are
// what actually go over the wire. Both best-effort, no dev-mode fallback:
// a failed save just means a closed app restarts that step blank instead
// of resuming, same severity as a failed push-token registration, not
// worth a fake local stand-in for.
export interface StoreDraftPatch {
  storeName?: string;
  category?: string;
  district?: string;
  lat?: number;
  lng?: number;
  photoUrl?: string;
  gstNumber?: string;
}

export interface SavedStoreDraft {
  store_name: string | null;
  category: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  photo_url: string | null;
  gst_number: string | null;
}

export async function fetchStoreDraft(): Promise<SavedStoreDraft | null> {
  return apiRequest('/partner/store-draft');
}

export async function saveStoreDraft(patch: StoreDraftPatch): Promise<void> {
  await apiRequest('/partner/store-draft', { method: 'PATCH', body: patch });
}

// Registers this device's Expo push token so admin's approve action
// (apps/admin/src/app/api/approvals/*) can reach it — see
// features/push-notifications/registerPushToken.ts for where this is
// called from. Called even while pending approval (requireAuth only on
// the backend, not requireApproved) so the token is already on file the
// moment a founder approves, not only after. No dev-mode fallback needed —
// a failed registration just means no push, not a broken flow; the caller
// already treats this as best-effort.
export async function savePushToken(token: string): Promise<void> {
  await apiRequest('/auth/push-token', { method: 'POST', body: { token } });
}
