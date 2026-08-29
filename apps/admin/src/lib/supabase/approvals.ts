// Real store/rider applications (A1) — replaces lib/mock-data.ts's
// PLACEHOLDER_APPLICATIONS. `id` is always the applicant's own users.id
// (owner_user_id for a store, the rider's own id for a rider) — that's
// what the approve/deny routes key off, matching the same is_approved flip
// apps/partner's WaitingApprovalScreen polls for. is_rejected is a real,
// persisted tri-state alongside is_approved (both default false = still
// pending) — manual review only for now (a founder decides every
// application by hand); an automated approval path is a later-scale
// problem per CLAUDE.md's own MVP scope, not built speculatively now.

import { ZONE_NAME } from '../mock-data';
import type { Application } from '../types';

function statusFor(isApproved: boolean, isRejected: boolean): Application['status'] {
  if (isApproved) return 'approved';
  if (isRejected) return 'rejected';
  return 'pending';
}

export interface ApiStoreApplication {
  owner_user_id: string;
  name: string;
  category: string | null;
  district: string | null;
  photo_url: string | null;
  gst_number: string | null;
  fssai_number: string | null;
  shop_establishment_number: string | null;
  pan_number: string | null;
  aadhaar_last4: string | null;
  bank_account_last4: string | null;
  turnover_exceeds_gst_threshold: boolean | null;
  drug_license_number: string | null;
  created_at: string;
  users: { phone: string; is_approved: boolean; is_rejected: boolean } | null;
}

export interface ApiRiderApplication {
  id: string;
  name: string | null;
  phone: string;
  is_approved: boolean;
  is_rejected: boolean;
  created_at: string;
}

export function mapStoreApplication(row: ApiStoreApplication): Application {
  return {
    id: row.owner_user_id,
    kind: 'store',
    name: row.name,
    category: row.category,
    zone: ZONE_NAME,
    submittedAt: new Date(row.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    status: statusFor(row.users?.is_approved ?? false, row.users?.is_rejected ?? false),
    phone: row.users?.phone ?? '',
    photoUrl: row.photo_url ?? undefined,
    gstNumber: row.gst_number ?? undefined,
    district: row.district ?? undefined,
    fssaiNumber: row.fssai_number ?? undefined,
    shopEstablishmentNumber: row.shop_establishment_number ?? undefined,
    panNumber: row.pan_number ?? undefined,
    aadhaarLast4: row.aadhaar_last4 ?? undefined,
    bankAccountLast4: row.bank_account_last4 ?? undefined,
    turnoverExceedsGstThreshold: row.turnover_exceeds_gst_threshold ?? undefined,
    drugLicenseNumber: row.drug_license_number ?? undefined,
  };
}

export function mapRiderApplication(row: ApiRiderApplication): Application {
  return {
    id: row.id,
    kind: 'rider',
    name: row.name ?? 'Unnamed rider',
    category: null,
    zone: ZONE_NAME,
    submittedAt: new Date(row.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    status: statusFor(row.is_approved, row.is_rejected),
    phone: row.phone,
  };
}
