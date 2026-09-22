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
import {
  mapApprovedRider,
  mapRiderDraft,
  type ApiApprovedRider,
  type ApiRiderDraft,
} from '@/lib/supabase/approvals';

const DOCUMENTS_BUCKET = 'rider-documents';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

async function signPhotoUrls<T extends { aadhaar_photo_url: string | null; dl_photo_url: string | null }>(row: T): Promise<T> {
  const paths = [row.aadhaar_photo_url, row.dl_photo_url].filter((p): p is string => !!p);
  if (paths.length === 0) return row;

  const { data } = await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  const signedByPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));

  return {
    ...row,
    aadhaar_photo_url: row.aadhaar_photo_url ? (signedByPath.get(row.aadhaar_photo_url) ?? null) : null,
    dl_photo_url: row.dl_photo_url ? (signedByPath.get(row.dl_photo_url) ?? null) : null,
  };
}

export async function GET() {
  try {
    const [draftsRes, ridersRes] = await Promise.all([
      supabaseAdmin
        .from('rider_onboarding_drafts')
        .select(
          'user_id, full_name, date_of_birth, home_address, aadhaar_number, aadhaar_photo_url, dl_number, dl_photo_url, vehicle_type, vehicle_number, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, submitted_at, users!user_id(phone, is_rejected)',
        )
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false }),
      supabaseAdmin
        .from('riders')
        .select(
          'user_id, name, date_of_birth, home_address, aadhaar_number, aadhaar_photo_url, dl_number, dl_photo_url, vehicle_type, vehicle_number, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, created_at, users!user_id(phone)',
        )
        .not('user_id', 'is', null),
    ]);
    if (draftsRes.error) throw draftsRes.error;
    if (ridersRes.error) throw ridersRes.error;

    const [signedDrafts, signedRiders] = await Promise.all([
      Promise.all((draftsRes.data as unknown as ApiRiderDraft[]).map(signPhotoUrls)),
      Promise.all((ridersRes.data as unknown as ApiApprovedRider[]).map(signPhotoUrls)),
    ]);

    const applications = [...signedDrafts.map(mapRiderDraft), ...signedRiders.map(mapApprovedRider)];

    return NextResponse.json(applications);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load rider applications.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
