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
// Rider applications don't have this draft/real split — a rider row is
// just `users` with role='rider', is_approved/is_rejected are real columns
// on it directly, no separate table.

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

export interface ApiRiderApplication {
  id: string;
  name: string | null;
  phone: string;
  is_approved: boolean;
  is_rejected: boolean;
  created_at: string;
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

export function mapRiderApplication(row: ApiRiderApplication): Application {
  return {
    id: row.id,
    kind: 'rider',
    name: row.name ?? 'Unnamed rider',
    category: null,
    zone: ZONE_NAME,
    submittedAt: new Date(row.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    status: row.is_approved ? 'approved' : row.is_rejected ? 'rejected' : 'pending',
    phone: row.phone,
  };
}
