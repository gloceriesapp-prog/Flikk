// Real rider applications — two sources merged into one list, same
// pattern as approvals/stores/route.ts's own note: pending/rejected
// applicants only exist as a rider_onboarding_drafts row (no real
// `riders` row until approved); approved ones are the real `riders` row
// created at that moment. Service-role read.
//
// aadhaar_photo_url/dl_photo_url are object PATHS on the private
// rider-documents bucket (migrations/042_rider_onboarding.sql's own
// note) — signed into short-lived (1hr) URLs here, on every read, so a
// founder reviewing an application can actually see the photo without
// the bucket ever being public.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import {
  APPROVED_RIDER_SELECT,
  RIDER_DRAFT_SELECT,
  mapApprovedRider,
  mapRiderDraft,
  type ApiApprovedRider,
  type ApiRiderDraft,
} from '@/lib/supabase/approvals';

const DOCUMENTS_BUCKET = 'rider-documents';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

// photo_url (the rider's selfie), aadhaar_photo_url and dl_photo_url are all
// object paths on the private bucket.
async function signPhotoUrls<T extends { photo_url: string | null; aadhaar_photo_url: string | null; dl_photo_url: string | null }>(row: T): Promise<T> {
  const paths = [row.photo_url, row.aadhaar_photo_url, row.dl_photo_url].filter((p): p is string => !!p);
  if (paths.length === 0) return row;

  const { data } = await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  const signedByPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  const sign = (path: string | null) => (path ? (signedByPath.get(path) ?? null) : null);

  return { ...row, photo_url: sign(row.photo_url), aadhaar_photo_url: sign(row.aadhaar_photo_url), dl_photo_url: sign(row.dl_photo_url) };
}

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  try {
    const [draftsRes, ridersRes] = await Promise.all([
      supabaseAdmin
        .from('rider_onboarding_drafts')
        .select(RIDER_DRAFT_SELECT)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false }),
      supabaseAdmin
        .from('riders')
        .select(APPROVED_RIDER_SELECT)
        .not('user_id', 'is', null),
    ]);

    // Decoupled on purpose: a failure on ONE side must never hide the other.
    // Pending applications live only in rider_onboarding_drafts, so an issue
    // reading the approved `riders` table (a missing column, etc.) must not
    // blank out the pending list a founder is waiting to act on — and vice
    // versa. Only fail the whole request if BOTH reads error.
    if (draftsRes.error && ridersRes.error) throw draftsRes.error;

    const draftRows = draftsRes.error ? [] : (draftsRes.data as unknown as ApiRiderDraft[]);
    const riderRows = ridersRes.error ? [] : (ridersRes.data as unknown as ApiApprovedRider[]);

    const [signedDrafts, signedRiders] = await Promise.all([
      Promise.all(draftRows.map(signPhotoUrls)),
      Promise.all(riderRows.map(signPhotoUrls)),
    ]);

    const applications = [...signedDrafts.map(mapRiderDraft), ...signedRiders.map(mapApprovedRider)];

    return NextResponse.json(applications);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load rider applications.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
