// Dedicated review screen for one application — the full submitted detail
// (photo, GST, district, phone) that a one-line list row can't show.
// Real data (supabaseAdmin, service-role — same rationale as every other
// app/api/* route in this dashboard) — `id` is the applicant's own
// users.id, checked against both stores and riders since this route
// doesn't know which kind it is ahead of time.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Store, User } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  mapApprovedRider,
  mapApprovedStore,
  mapRiderDraft,
  mapStoreDraft,
  type ApiApprovedRider,
  type ApiApprovedStore,
  type ApiRiderDraft,
  type ApiStoreDraft,
} from '@/lib/supabase/approvals';
import { DocumentChecklist } from '@/components/approvals/DocumentChecklist';
import { RiderDocumentChecklist } from '@/components/approvals/RiderDocumentChecklist';
import { DecisionButtons } from '@/components/approvals/DecisionButtons';
import type { Application } from '@/lib/types';

const DRAFT_SELECT = 'user_id, store_name, category, district, photo_url, gst_number, submitted_at, users!user_id(phone, is_rejected)';
const STORE_SELECT = 'owner_user_id, name, category, district, photo_url, gst_number, created_at, users!owner_user_id(phone)';
const RIDER_DRAFT_SELECT =
  'user_id, full_name, date_of_birth, home_address, aadhaar_number, aadhaar_photo_url, dl_number, dl_photo_url, vehicle_type, vehicle_number, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, submitted_at, users!user_id(phone, is_rejected)';
const RIDER_SELECT =
  'user_id, name, date_of_birth, home_address, aadhaar_number, aadhaar_photo_url, dl_number, dl_photo_url, vehicle_type, vehicle_number, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, created_at, users!user_id(phone)';

const DOCUMENTS_BUCKET = 'rider-documents';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

// aadhaar_photo_url/dl_photo_url are object PATHS on the private
// rider-documents bucket — signed fresh on every page load, same as
// app/api/approvals/riders/route.ts's own signPhotoUrls.
async function signRiderPhotos<T extends { aadhaar_photo_url: string | null; dl_photo_url: string | null }>(row: T): Promise<T> {
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

// Pending/rejected (draft, no real row yet) and approved (real `stores`/
// `riders` row) are two different tables now, for both kinds — see
// lib/supabase/approvals.ts's own note on why. Check the draft first
// since that's the far more common case (most applications are pending
// review, not yet approved).
async function loadApplication(id: string): Promise<Application | null> {
  const { data: draftRow } = await supabaseAdmin
    .from('store_onboarding_drafts')
    .select(DRAFT_SELECT)
    .eq('user_id', id)
    .not('submitted_at', 'is', null)
    .maybeSingle();
  if (draftRow) return mapStoreDraft(draftRow as unknown as ApiStoreDraft);

  const { data: storeRow } = await supabaseAdmin.from('stores').select(STORE_SELECT).eq('owner_user_id', id).maybeSingle();
  if (storeRow) return mapApprovedStore(storeRow as unknown as ApiApprovedStore);

  const { data: riderDraftRow } = await supabaseAdmin
    .from('rider_onboarding_drafts')
    .select(RIDER_DRAFT_SELECT)
    .eq('user_id', id)
    .not('submitted_at', 'is', null)
    .maybeSingle();
  if (riderDraftRow) return mapRiderDraft(await signRiderPhotos(riderDraftRow as unknown as ApiRiderDraft));

  const { data: riderRow } = await supabaseAdmin.from('riders').select(RIDER_SELECT).eq('user_id', id).maybeSingle();
  if (riderRow) return mapApprovedRider(await signRiderPhotos(riderRow as unknown as ApiApprovedRider));

  return null;
}

export default async function ApplicationReviewPage({ params }: PageProps<'/approvals/[id]'>) {
  const { id } = await params;
  const application = await loadApplication(id);
  if (!application) notFound();

  const Icon = application.kind === 'store' ? Store : User;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/approvals" className="flex w-fit items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft size={15} />
        Back to Approvals
      </Link>

      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          {application.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- real Storage URL, no next.config domain to register yet
            <img src={application.photoUrl} alt="" className="h-20 w-20 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-accent">
              <Icon size={28} className="text-ink-soft" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-medium text-ink">{application.name}</h1>
            <p className="text-sm text-muted">
              {application.kind === 'store' ? application.category : 'Rider application'} · Submitted{' '}
              {application.submittedAt}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-6 sm:grid-cols-2">
          <Field label="Phone" value={application.phone} />
          <Field label="Zone" value={application.zone} />
          {application.kind === 'store' && <Field label="District" value={application.district ?? '—'} />}
        </div>

        {application.kind === 'store' ? (
          <DocumentChecklist application={application} />
        ) : (
          <RiderDocumentChecklist application={application} />
        )}

        {application.status === 'approved' ? (
          <div className="mt-6 border-t border-border pt-6">
            <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-success">Approved</span>
          </div>
        ) : (
          <>
            {application.status === 'rejected' && (
              <p className="mt-6 border-t border-border pt-6 text-xs font-medium text-danger">
                Previously rejected — approving now still creates the {application.kind === 'store' ? 'store' : 'rider profile'}.
              </p>
            )}
            <DecisionButtons applicationId={application.id} kind={application.kind} />
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm font-medium text-ink">{value}</p>
    </div>
  );
}
