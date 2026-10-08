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
  APPROVED_RIDER_SELECT,
  APPROVED_STORE_SELECT,
  RIDER_DRAFT_SELECT,
  STORE_DRAFT_SELECT,
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

const DOCUMENTS_BUCKET = 'rider-documents';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

// photo_url (selfie) / aadhaar_photo_url / dl_photo_url are object PATHS on
// the private rider-documents bucket — signed fresh on every page load, same
// as app/api/approvals/riders/route.ts's own signPhotoUrls.
async function signRiderPhotos<T extends { photo_url: string | null; aadhaar_photo_url: string | null; dl_photo_url: string | null }>(row: T): Promise<T> {
  const paths = [row.photo_url, row.aadhaar_photo_url, row.dl_photo_url].filter((p): p is string => !!p);
  if (paths.length === 0) return row;

  const { data } = await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  const signedByPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  const sign = (path: string | null) => (path ? (signedByPath.get(path) ?? null) : null);
  return { ...row, photo_url: sign(row.photo_url), aadhaar_photo_url: sign(row.aadhaar_photo_url), dl_photo_url: sign(row.dl_photo_url) };
}

// Pending/rejected (draft, no real row yet) and approved (real `stores`/
// `riders` row) are two different tables now, for both kinds — see
// lib/supabase/approvals.ts's own note on why. Check the draft first
// since that's the far more common case (most applications are pending
// review, not yet approved).
async function loadApplication(id: string): Promise<Application | null> {
  const { data: draftRow } = await supabaseAdmin
    .from('store_onboarding_drafts')
    .select(STORE_DRAFT_SELECT)
    .eq('user_id', id)
    .not('submitted_at', 'is', null)
    .maybeSingle();
  if (draftRow) {
    const { count } = await supabaseAdmin.from('stores').select('id', { count: 'exact', head: true }).eq('owner_user_id', id);
    return { ...mapStoreDraft(draftRow as unknown as ApiStoreDraft), alreadyOwnsStore: (count ?? 0) > 0 };
  }

  const { data: storeRow } = await supabaseAdmin.from('stores').select(APPROVED_STORE_SELECT).eq('owner_user_id', id).limit(1).maybeSingle();
  if (storeRow) return mapApprovedStore(storeRow as unknown as ApiApprovedStore);

  const { data: riderDraftRow } = await supabaseAdmin
    .from('rider_onboarding_drafts')
    .select(RIDER_DRAFT_SELECT)
    .eq('user_id', id)
    .not('submitted_at', 'is', null)
    .maybeSingle();
  if (riderDraftRow) return mapRiderDraft(await signRiderPhotos(riderDraftRow as unknown as ApiRiderDraft));

  const { data: riderRow } = await supabaseAdmin.from('riders').select(APPROVED_RIDER_SELECT).eq('user_id', id).maybeSingle();
  if (riderRow) return mapApprovedRider(await signRiderPhotos(riderRow as unknown as ApiApprovedRider));

  return null;
}

export default async function ApplicationReviewPage({ params }: PageProps<'/approvals/[id]'>) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) notFound();
  const application = await loadApplication(id);
  if (!application) notFound();
  const { data: zones } = await supabaseAdmin.from('zones').select('id, name').eq('is_active', true).order('name');

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
            {application.riderCode && (
              <span className="mt-1.5 inline-block rounded-full bg-accent px-2.5 py-1 font-mono text-xs font-semibold text-ink-soft">
                ID: {application.riderCode}
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-6 sm:grid-cols-2">
          <Field label="Phone" value={application.phone} />
          <Field label="Zone" value={application.zone} />
          {application.kind === 'store' && <Field label="District" value={application.district ?? '—'} />}
          {application.kind === 'store' && (
            <>
              <Field label="Owner name" value={application.ownerName ?? '—'} />
              <Field label="Owner email" value={application.ownerEmail ?? '—'} />
              <Field label="Store contact phone" value={application.storePhone ?? '—'} />
              <Field label="Hours" value={application.openTime || application.closeTime ? `${application.openTime ?? '?'} – ${application.closeTime ?? '?'}` : '—'} />
              <Field label="Address" value={application.addressLine ?? '—'} />
              <Field label="Landmark / directions" value={application.manualAddress ?? '—'} />
              <div>
                <p className="text-xs text-muted">Map pin</p>
                {application.lat != null && application.lng != null ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${application.lat},${application.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-ink underline"
                  >
                    {application.lat.toFixed(5)}, {application.lng.toFixed(5)} — open map
                  </a>
                ) : (
                  <p className="text-sm font-medium text-danger">No pin — the store would be invisible to customers</p>
                )}
              </div>
            </>
          )}
        </div>

        {application.rejectionReason && (
          <div className="mt-6 rounded-2xl border border-danger/20 bg-red-50 p-4">
            <p className="text-xs font-semibold text-danger">{application.status === 'rejected' ? 'Rejected' : 'Previously rejected'}</p>
            <p className="mt-1 text-sm text-ink">{application.rejectionReason}</p>
          </div>
        )}

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
            {application.alreadyOwnsStore && (
              <p className="mt-6 border-t border-border pt-6 text-xs font-medium text-danger">
                This applicant already owns a live store. Approving would create a duplicate, so it is blocked — reject this
                re-application (or edit the existing store on the Stores page).
              </p>
            )}
            <DecisionButtons
              applicationId={application.id}
              kind={application.kind}
              zones={application.kind === 'store' ? (zones ?? []) : []}
              canApprove={!application.alreadyOwnsStore}
            />
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
