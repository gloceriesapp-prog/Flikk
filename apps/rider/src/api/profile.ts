// GET /rider/profile — the single sync source for the profile screen. Post-
// approval the onboarding draft is gone (admin's approve route deletes it),
// so the backend reads the `riders` row instead. Aadhaar + bank account come
// back masked (last-4); DL/UPI/vehicle as entered.

import { apiRequest } from './client';

export interface RiderProfilePayout {
  method: 'bank_account' | 'upi' | null;
  upiId: string | null;
  upiVerifiedName: string | null;
  bankName: string | null;
  maskedAccountNumber: string | null;
  ifsc: string | null;
  accountHolderName: string | null;
}

export interface RiderProfile {
  riderCode: string | null;
  name: string | null;
  phone: string | null;
  photoUrl: string | null;
  dateOfBirth: string | null;
  homeAddress: string | null;
  aadhaarMasked: string | null;
  dlNumber: string | null;
  vehicleType: 'bicycle' | 'scooter' | 'motorcycle' | null;
  vehicleNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  memberSince: string | null;
  payout: RiderProfilePayout;
}

export async function fetchRiderProfile(): Promise<RiderProfile> {
  return apiRequest('/rider/profile');
}
