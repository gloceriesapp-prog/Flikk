// Partner authentication and uploads always use the real API.
import { createAuthApi, type AccountStatus, type VerifyOtpResponse as SharedVerifyOtpResponse } from '@gloceries/shared';
import { ApiError, apiRequest } from './client';
import { API_BASE_URL } from './baseUrl';
import { normalizeStoreHour } from '../utils/storeHours';

// Which of the four apps this is — sent on OTP request/verify so the
// backend can pin a number to one app and 403 ACCOUNT_WRONG_APP a number
// that already belongs to a different one (backend/src/routes/auth.ts).
// A module constant, so no call-site signature changes.
const APP = 'partner' as const;

const authApi = createAuthApi({ apiRequest });

// Shared verify contract plus account_type, which the one-phone-one-app
// backend now returns on verify (store_owner for this app).
export interface VerifyOtpResponse extends SharedVerifyOtpResponse {
  account_type: 'customer' | 'rider' | 'store_owner';
}

export type { AccountStatus };

export interface RequestOtpResult {
  ok: true;
  devMode: boolean;
}

// OTP requests always use the backend and surface real delivery failures.
function unreachable(err: unknown): never {
  if (!(err instanceof ApiError) || err.status === 0) {
    const message = __DEV__
      ? `Can't reach the Gloceries server (${API_BASE_URL}). Verify the API address, backend availability, and internet connection.`
      : "Couldn't connect to Gloceries. Check your internet connection and try again.";
    throw new ApiError(0, 'SERVER_UNREACHABLE', message);
  }
  throw err;
}

export async function requestOtp(phone: string): Promise<RequestOtpResult> {
  try {
    const result = await apiRequest<{ ok: true }>('/auth/otp/request', { method: 'POST', body: { phone, app: APP }, auth: false });
    return { ...result, devMode: false };
  } catch (err) {
    return unreachable(err);
  }
}

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
  try {
    return await apiRequest<VerifyOtpResponse>('/auth/otp/verify', { method: 'POST', body: { phone, code, app: APP }, auth: false });
  } catch (err) {
    return unreachable(err);
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
  lat?: number;
  lng?: number;
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
  drugLicenseNumber?: string;
  openTime?: string;
  closeTime?: string;
  // Private encrypted KYC document PATHs (never URLs) — uploaded ahead of
  // submit via POST /partner/store-document-photo, carried here as strings.
  profilePhotoPath?: string;
  storePhotoPath?: string;
}
// auth contract, stays local to this app.
export async function submitStoreApplication(application: StoreApplication): Promise<{ ok: true }> {
  try {
    return await apiRequest('/partner/store-application', { method: 'POST', body: normalizedApplicationHours(application) });
  } catch (err) {
    throw err;
  }
}

// Storefront photo — uploaded ahead of the actual application submit so
// StoreReviewScreen can show the (already-hosted) photo in its summary and
// submitStoreApplication only ever deals with a plain URL string, never a
// local file. base64 in, public URL out — see backend/src/routes/
// storeOnboarding.ts's own note on why this is its own endpoint, not
// bundled into POST /store-application's body.
export async function uploadStorePhoto(base64: string, contentType: string, _localUri: string): Promise<{ url: string }> {
  return apiRequest('/partner/store-photo', { method: 'POST', body: { base64, contentType } });
}

// Re-checked on cold start (a returning session's approval/store status
// isn't persisted alongside the token, see useAuthStore.ts's own note) and
// polled by WaitingApprovalScreen — one endpoint, two callers.
export async function checkAccountStatus(): Promise<AccountStatus> {
  try {
    return await authApi.checkAccountStatus();
  } catch (err) {
    throw err;
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
  drugLicenseNumber?: string;
  openTime?: string;
  closeTime?: string;
  profilePhotoPath?: string;
  storePhotoPath?: string;
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
  drug_license_number?: string | null;
  open_time: string | null;
  close_time: string | null;
  profile_photo_path?: string | null;
  aadhaar_photo_path?: string | null;
  store_doc_path?: string | null;
}

export async function fetchStoreDraft(): Promise<SavedStoreDraft | null> {
  return apiRequest('/partner/store-draft');
}

export async function saveStoreDraft(patch: StoreDraftPatch): Promise<void> {
  await apiRequest('/partner/store-draft', { method: 'PATCH', body: normalizedApplicationHours(patch) });
}

function normalizedApplicationHours<T extends { openTime?: string; closeTime?: string }>(input: T): T {
  const result = { ...input };
  for (const key of ['openTime', 'closeTime'] as const) {
    if (input[key] === undefined) continue;
    const value = normalizeStoreHour(input[key]);
    if (value === null) throw new ApiError(400, 'INVALID_STORE_HOURS', 'Enter valid opening and closing times in Indian Standard Time (IST).');
    result[key] = value;
  }
  return result;
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
