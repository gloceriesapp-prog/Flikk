// Rider onboarding wizard's own backend calls — POST /rider/application
// (submit), GET/PATCH /rider/draft (resume-where-you-left-off, same
// pattern apps/partner's own api/auth.ts submitStoreApplication/
// fetchStoreDraft/saveStoreDraft already established), and
// POST /rider/document-photo (Aadhaar/DL photo upload — see backend's own
// riderOnboarding.ts note on why the private bucket only ever returns an
// object path, not a public URL).

import { apiRequest } from './client';

export interface RiderApplication {
  fullName: string;
  dateOfBirth: string; // "YYYY-MM-DD"
  homeAddress: string;
  aadhaarNumber: string;
  aadhaarPhotoUrl: string; // real object path, from uploadDocumentPhoto
  dlNumber: string;
  dlPhotoUrl: string;
  vehicleType: 'bicycle' | 'scooter' | 'motorcycle';
  vehicleNumber?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
}

export async function submitRiderApplication(application: RiderApplication): Promise<{ ok: true }> {
  return apiRequest('/rider/application', { method: 'POST', body: application });
}

export interface SavedRiderDraft {
  full_name: string | null;
  date_of_birth: string | null;
  home_address: string | null;
  aadhaar_number: string | null;
  dl_number: string | null;
  vehicle_type: 'bicycle' | 'scooter' | 'motorcycle' | null;
  vehicle_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  submitted_at: string | null;
}

export async function fetchRiderDraft(): Promise<SavedRiderDraft | null> {
  return apiRequest('/rider/draft');
}

export type RiderDraftPatch = Partial<RiderApplication>;

export async function saveRiderDraft(patch: RiderDraftPatch): Promise<void> {
  await apiRequest('/rider/draft', { method: 'PATCH', body: patch });
}

// Real upload — base64 in, real Supabase Storage object PATH out (not a
// full URL; rider-documents is a private bucket). Best-effort caller
// convention isn't used here on purpose: a failed ID-photo upload must
// block moving to the next step, not silently continue with no photo.
export async function uploadRiderDocumentPhoto(base64: string, kind: 'aadhaar' | 'dl'): Promise<{ path: string }> {
  return apiRequest('/rider/document-photo', { method: 'POST', body: { base64, kind } });
}

// Real RazorpayX Fund Account Validation — post-approval payout setup,
// same underlying verification apps/partner's own PayoutAccountCard uses.
export interface RiderPayoutVerificationResult {
  maskedAccountNumber: string | null;
  ifsc: string | null;
  accountHolderName: string | null;
  accountStatus: string;
  bankName: string | null;
  nameMatchScore: number | null;
}

export async function verifyRiderPayout(accountNumber: string, ifsc: string, accountHolderName: string): Promise<RiderPayoutVerificationResult> {
  return apiRequest('/rider/verify-payout', { method: 'POST', body: { accountNumber, ifsc, accountHolderName } });
}
