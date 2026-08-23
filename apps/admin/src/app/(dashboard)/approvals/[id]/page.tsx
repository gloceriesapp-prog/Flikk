// Dedicated review screen for one application — the full submitted detail
// (photo, GST, district, phone) that a one-line list row can't show.
// Mirrors apps/partner's StoreReviewScreen almost exactly, because it's
// genuinely the same submission viewed from the other side of the same
// flow. Approving here is the only UI path that flips users.is_approved
// (specs/04-admin-dashboard/screens.md) once wired to a real endpoint.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Store, User, X } from 'lucide-react';
import { PLACEHOLDER_APPLICATIONS } from '@/lib/mock-data';
import { DocumentChecklist } from '@/components/approvals/DocumentChecklist';

export default async function ApplicationReviewPage({ params }: PageProps<'/approvals/[id]'>) {
  const { id } = await params;
  const application = PLACEHOLDER_APPLICATIONS.find((a) => a.id === id);
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
            // eslint-disable-next-line @next/next/no-img-element -- external/mock URL, no next.config domain to register yet
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

        {application.kind === 'store' && <DocumentChecklist application={application} />}

        {application.status === 'pending' ? (
          <div className="mt-6 flex items-center gap-3 border-t border-border pt-6">
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-danger/30 py-3 text-sm font-semibold text-danger hover:bg-red-50"
            >
              <X size={16} />
              Reject
            </button>
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              <Check size={16} />
              Approve
            </button>
          </div>
        ) : (
          <div className="mt-6 border-t border-border pt-6">
            <span
              className={
                application.status === 'approved'
                  ? 'rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-success'
                  : 'rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-danger'
              }
            >
              {application.status === 'approved' ? 'Approved' : 'Rejected'}
            </span>
          </div>
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
