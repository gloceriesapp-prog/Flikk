// Real store/rider applications (A1) — replaces lib/mock-data.ts's
// PLACEHOLDER_APPLICATIONS. `id` is always the applicant's own users.id —
// that's what the approve/deny routes key off, matching the same
// is_approved flip apps/partner's WaitingApprovalScreen polls for.
//
// Store applications are two different shapes stitched into one list now:
// a *pending* (or rejected) one only exists as a store_onboarding_drafts
// row — no real `stores` row is created until a founder actually approves
// it (see app/api/approvals/stores/[userId]/route.ts's own note on why:
// an explicit ask that unapproved data never lands in the main `stores`
// table). An *approved* one is the real `stores` row created at that
// moment — the draft is gone by then, deleted the instant it's
// materialized. GET /api/approvals/stores fetches both and maps each
// through its own function below into the one shared Application shape.
//
// Rider applications now follow the exact same draft/real split as stores
// (migrations/042_rider_onboarding.sql) — a *pending* (or rejected) rider
// only exists as a rider_onboarding_drafts row (role stays 'customer' the
// whole time, no real `riders` row yet); an *approved* one is the real
// `riders` row created at approval, draft deleted. aadhaarPhotoUrl/
// dlPhotoUrl are object PATHS on the private rider-documents bucket —
// GET /api/approvals/riders signs them into short-lived URLs before this
// mapping ever sees them, so mapRiderDraft/mapApprovedRider just pass the
// (already-signed) string through.

import { ZONE_NAME } from '../mock-data';
import type { Application } from '../types';

export interface ApiStoreDraft {
  user_id: string;
  store_name: string | null;
  category: string | null;
  district: string | null;
  photo_url: string | null;
  gst_number: string | null;
  submitted_at: string;
  users: { phone: string; is_rejected: boolean } | null;
}

export interface ApiApprovedStore {
  owner_user_id: string;
  name: string;
  category: string | null;
  district: string | null;
  photo_url: string | null;
  gst_number: string | null;
  created_at: string;
  users: { phone: string } | null;
}

export interface ApiRiderDraft {
  user_id: string;
  full_name: string | null;
  date_of_birth: string | null;
  home_address: string | null;
  aadhaar_number: string | null;
  aadhaar_photo_url: string | null;
  dl_number: string | null;
  dl_photo_url: string | null;
  vehicle_type: 'bicycle' | 'scooter' | 'motorcycle' | null;
  vehicle_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  submitted_at: string;
  users: { phone: string; is_rejected: boolean } | null;
}

export interface ApiApprovedRider {
  user_id: string;
  rider_code?: string | null;
  name: string;
  date_of_birth: string | null;
  home_address: string | null;
  aadhaar_number: string | null;
  aadhaar_photo_url: string | null;
  dl_number: string | null;
  dl_photo_url: string | null;
  vehicle_type: 'bicycle' | 'scooter' | 'motorcycle' | null;
  vehicle_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  // Optional: the riders table only gains created_at once migration 044 is
  // applied. The select omits it (selecting a missing column errors the
  // whole query and hides pending drafts too), and the mapper below just
  // shows a blank date when it isn't present.
  created_at?: string | null;
  users: { phone: string } | null;
}

export function mapStoreDraft(row: ApiStoreDraft): Application {
  return {
    id: row.user_id,
    kind: 'store',
    name: row.store_name ?? 'Untitled store',
    category: row.category,
    zone: ZONE_NAME,
    submittedAt: new Date(row.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    status: row.users?.is_rejected ? 'rejected' : 'pending',
    phone: row.users?.phone ?? '',
    photoUrl: row.photo_url ?? undefined,
    gstNumber: row.gst_number ?? undefined,
    district: row.district ?? undefined,
  };
}

export function mapApprovedStore(row: ApiApprovedStore): Application {
  return {
    id: row.owner_user_id,
    kind: 'store',
    name: row.name,
    category: row.category,
    zone: ZONE_NAME,
    submittedAt: new Date(row.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    status: 'approved',
    phone: row.users?.phone ?? '',
    photoUrl: row.photo_url ?? undefined,
    gstNumber: row.gst_number ?? undefined,
    district: row.district ?? undefined,
  };
}

export function mapRiderDraft(row: ApiRiderDraft): Application {
  return {
    id: row.user_id,
    kind: 'rider',
    name: row.full_name ?? 'Unnamed rider',
    category: null,
    zone: ZONE_NAME,
    submittedAt: new Date(row.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    status: row.users?.is_rejected ? 'rejected' : 'pending',
    phone: row.users?.phone ?? '',
    dateOfBirth: row.date_of_birth ?? undefined,
    homeAddress: row.home_address ?? undefined,
    aadhaarNumber: row.aadhaar_number ?? undefined,
    aadhaarPhotoUrl: row.aadhaar_photo_url ?? undefined,
    dlNumber: row.dl_number ?? undefined,
    dlPhotoUrl: row.dl_photo_url ?? undefined,
    vehicleType: row.vehicle_type ?? undefined,
    vehicleNumber: row.vehicle_number ?? undefined,
    emergencyContactName: row.emergency_contact_name ?? undefined,
    emergencyContactPhone: row.emergency_contact_phone ?? undefined,
    emergencyContactRelationship: row.emergency_contact_relationship ?? undefined,
  };
}

export function mapApprovedRider(row: ApiApprovedRider): Application {
  return {
    id: row.user_id,
    kind: 'rider',
    name: row.name,
    riderCode: row.rider_code ?? undefined,
    category: null,
    zone: ZONE_NAME,
    submittedAt: row.created_at ? new Date(row.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '',
    status: 'approved',
    phone: row.users?.phone ?? '',
    dateOfBirth: row.date_of_birth ?? undefined,
    homeAddress: row.home_address ?? undefined,
    aadhaarNumber: row.aadhaar_number ?? undefined,
    aadhaarPhotoUrl: row.aadhaar_photo_url ?? undefined,
    dlNumber: row.dl_number ?? undefined,
    dlPhotoUrl: row.dl_photo_url ?? undefined,
    vehicleType: row.vehicle_type ?? undefined,
    vehicleNumber: row.vehicle_number ?? undefined,
    emergencyContactName: row.emergency_contact_name ?? undefined,
    emergencyContactPhone: row.emergency_contact_phone ?? undefined,
    emergencyContactRelationship: row.emergency_contact_relationship ?? undefined,
  };
}
