// Maps to POST /auth/otp/request, POST /auth/otp/verify, GET /auth/me, and
// POST /auth/push-token — the actual HTTP contract for all four now lives
// in one place (@gloceries/shared's auth module, packages/shared/src/auth/
// otp.ts) instead of being hand-copied per app; this file wraps that
// shared implementation with the two things that are genuinely specific to
// this app: the devAuthFallback dev-mode stand-in below, and this app's
// own richer VerifyOtpResponse/AccountStatus needs (is_approved/has_store/
// application_submitted — customer's own copy of the shared contract only
// needs "token exists = logged in", nothing else, so it stays on the
// shared shape unwrapped).
//
// Every OTP/session function here falls back to devAuthFallback.ts when
// the real backend is unreachable (not when it responds with a real error
// — see isBackendUnreachable's own note) — that's what "OTP not receiving"
// in this sandbox actually was: no backend/SMS provider reachable, same
// situation every other screen in this app already handles via
// placeholder data. The fallback disappears on its own the moment a real
// backend answers; nothing here needs to change when that happens.

import { createAuthApi, type AccountStatus, type VerifyOtpResponse } from '@gloceries/shared';
import { apiRequest } from './client';
import {
  devCheckAccountStatus,
  devRequestOtp,
  devSubmitStoreApplication,
  devVerifyOtp,
  isBackendUnreachable,
} from './devAuthFallback';

const authApi = createAuthApi({ apiRequest });

export type { AccountStatus, VerifyOtpResponse };

export interface RequestOtpResult {
  ok: true;
  devMode: boolean;
}

export async function requestOtp(phone: string): Promise<RequestOtpResult> {
  try {
    const result = await authApi.requestOtp(phone);
    return { ...result, devMode: false };
  } catch (err) {
    if (!isBackendUnreachable(err)) throw err;
    const result = await devRequestOtp(phone);
    return { ...result, devMode: true };
  }
}

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
  try {
    return await authApi.verifyOtp(phone, code);
  } catch (err) {
    if (!isBackendUnreachable(err)) throw err;
    return devVerifyOtp(phone, code);
  }
}

export interface StoreApplication {
  storeName: string;
  category: string;
  // Store's own contact phone — distinct from the account's own
  // OTP-verified login phone (Owner Details step shows that one read-only).
  phone?: string;
  district: string;
  addressLine?: string;
  manualAddress?: string;
  gstNumber?: string;
  photoUrl?: string;
  ownerName?: string;
  // Owner's own optional contact email — writes to users.email, a separate
  // table from the draft (backend's storeOnboarding.ts's own note).
  ownerEmail?: string;
  shopLicenseNumber?: string;
  // PAN is compulsory server-side (POST /store-application 400s without a
  // valid one) — kept optional in this type only so a partially-filled
  // in-progress draft still type-checks; StoreReviewScreen's own
  // canSubmit gate is what actually enforces it before this ever fires.
  fssaiNumber?: string;
  panNumber?: string;
  udyamNumber?: string;
  openTime?: string;
  closeTime?: string;
}

// Partner-only endpoint (Store Setup submission) — not part of the shared
// auth contract, stays local to this app.
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

// Saves payout details (backend's routes/partner.ts POST /verify-payout).
// With a payout provider configured the account is bank-verified first;
// without one (manual payouts) the details are saved as typed and the
// response says verified: false. No dev-mode fallback: a fake result here
// would be persisted as if it were real.
export interface PayoutVerificationResult {
  method: 'upi' | 'bank_account';
  vpa: string | null;
  maskedAccountNumber: string | null;
  ifsc: string | null;
  accountHolderName: string | null;
  accountStatus: string;
  bankName: string | null;
  accountType: string | null;
  nameMatchScore: number | null;
  // False when details were saved without a provider check (manual payouts).
  verified?: boolean;
}

export async function verifyPayoutUpi(vpa: string): Promise<PayoutVerificationResult> {
  return apiRequest('/partner/verify-payout', { method: 'POST', body: { method: 'upi', vpa } });
}

export async function verifyPayoutBankAccount(
  accountNumber: string,
  ifsc: string,
  accountHolderName: string,
): Promise<PayoutVerificationResult> {
  return apiRequest('/partner/verify-payout', {
    method: 'POST',
    body: { method: 'bank_account', accountNumber, ifsc, accountHolderName },
  });
}

// Re-checked on cold start (a returning session's approval/store status
// isn't persisted alongside the token, see useAuthStore.ts's own note) and
// polled by WaitingApprovalScreen — one endpoint, two callers.
export async function checkAccountStatus(): Promise<AccountStatus> {
  try {
    return await authApi.checkAccountStatus();
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
// worth a fake local stand-in for. Partner-only endpoint, stays local.
export interface StoreDraftPatch {
  storeName?: string;
  category?: string;
  phone?: string;
  district?: string;
  addressLine?: string;
  manualAddress?: string;
  lat?: number;
  lng?: number;
  photoUrl?: string;
  gstNumber?: string;
  ownerName?: string;
  ownerEmail?: string;
  shopLicenseNumber?: string;
  fssaiNumber?: string;
  panNumber?: string;
  udyamNumber?: string;
  openTime?: string;
  closeTime?: string;
}

export interface SavedStoreDraft {
  store_name: string | null;
  category: string | null;
  phone: string | null;
  district: string | null;
  address_line: string | null;
  manual_address: string | null;
  lat: number | null;
  lng: number | null;
  photo_url: string | null;
  gst_number: string | null;
  owner_name: string | null;
  owner_email: string | null;
  shop_establishment_number: string | null;
  fssai_number: string | null;
  pan_number: string | null;
  udyam_number: string | null;
  open_time: string | null;
  close_time: string | null;
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
  await authApi.savePushToken(token);
}
