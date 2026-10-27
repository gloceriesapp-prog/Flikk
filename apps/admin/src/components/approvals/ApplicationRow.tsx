'use client';

// A1 — approve/reject via PATCH /api/approvals/{stores,riders}/[userId],
// which flips users.is_approved/is_rejected (both real, persisted columns —
// manual review only for now, no auto-approve logic; that's a later-scale
// problem per CLAUDE.md's own MVP scope). Approving also sends the
// applicant a push notification — see that route's own note. Each
// application is its own bordered card, not a thin table row — a pending
// one gets an amber left accent, so the ones actually needing a decision
// read as distinct from the ones already resolved.

import { useState } from 'react';
import Link from 'next/link';
import { Check, ChevronRight, Clock, Store, User, X } from '@/components/icons';
import clsx from 'clsx';
import type { Application, ApplicationStatus } from '@/lib/types';
import { ReasonModal } from '@/components/ui/ReasonModal';
import { toast } from '@/components/ui/Toast';

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-success',
  rejected: 'bg-red-50 text-danger',
};

const DEFAULT_REJECTION_REASON =
  "We couldn't verify your store documents this time. Please double-check your store details and photo, then resubmit your application.";

export function ApplicationRow({ application }: { application: Application }) {
  const [status, setStatus] = useState(application.status);
  const [busy, setBusy] = useState(false);
  // Reject asks for a reason (shown to the applicant), pre-filled with a
  // clean default a founder in a hurry can keep.
  const [rejecting, setRejecting] = useState(false);
  const Icon = application.kind === 'store' ? Store : User;
  // Rejected still shows the decide buttons, not a terminal pill — a
  // founder who changes their mind can approve it later (the draft is
  // kept, not deleted, on reject — see the approve route's own note).
  const needsDecision = status !== 'approved';

  // Throws on failure so the reject dialog can show the error and stay open.
  async function send(approve: boolean, reason?: string) {
    const res = await fetch(`/api/approvals/${application.kind === 'store' ? 'stores' : 'riders'}/${application.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(approve ? { approve } : { approve, reason }),
    }).catch(() => null);
    if (!res) throw new Error('Could not reach the server. Please try again.');
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? 'Could not update this application.');
    }
    setStatus(approve ? 'approved' : 'rejected');
    toast.success(approve ? `${application.name} approved` : `${application.name} rejected`, approve ? 'They have been notified.' : 'The applicant sees your reason.');
  }

  async function approve() {
    if (busy) return;
    setBusy(true);
    try {
      await send(true);
    } catch (err) {
      toast.error('Could not approve', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={clsx(
        'flex items-center gap-4 rounded-2xl border p-4 transition-colors',
        needsDecision ? 'border-amber-100 bg-amber-50/40' : 'border-border bg-card',
      )}
    >
      <div
        className={clsx(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
          needsDecision ? 'bg-amber-100' : 'bg-accent',
        )}
      >
        <Icon size={17} className={needsDecision ? 'text-amber-700' : 'text-ink-soft'} />
      </div>

      <Link href={`/approvals/${application.id}`} className="group flex min-w-0 flex-1 items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink group-hover:underline">{application.name}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <span className="truncate">
              {application.kind === 'store' ? application.category : 'Rider'} · {application.zone}
            </span>
            <span className="flex shrink-0 items-center gap-0.5">
              <Clock size={11} />
              {application.submittedAt}
            </span>
          </p>
        </div>
        <ChevronRight size={15} className="shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>

      {needsDecision ? (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setRejecting(true)}
            disabled={busy}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-danger hover:bg-red-50 disabled:opacity-40"
            aria-label="Reject"
          >
            <X size={16} />
          </button>
          <button
            type="button"
            onClick={approve}
            disabled={busy}
            className="flex h-9 items-center gap-1.5 rounded-[10px] bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40 hover:bg-brand-strong"
          >
            <Check size={14} />
            {busy ? 'Approving…' : 'Approve'}
          </button>
        </div>
      ) : (
        <span className={clsx('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold', STATUS_STYLES[status])}>
          {status === 'approved' ? 'Approved' : 'Rejected'}
        </span>
      )}
      {rejecting && (
        <ReasonModal
          title={`Reject ${application.name}?`}
          description="The applicant sees this reason and can resubmit."
          confirmLabel="Reject application"
          initialReason={DEFAULT_REJECTION_REASON}
          onClose={() => setRejecting(false)}
          onConfirm={async (reason) => { await send(false, reason); setRejecting(false); }}
        />
      )}
    </div>
  );
}
