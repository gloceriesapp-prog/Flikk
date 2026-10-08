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
import { Check, ChevronRight, Clock, Store, User, X } from 'lucide-react';
import clsx from 'clsx';
import type { Application, ApplicationStatus } from '@/lib/types';

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
  const Icon = application.kind === 'store' ? Store : User;
  // Rejected still shows the decide buttons, not a terminal pill — a
  // founder who changes their mind can approve it later (the draft is
  // kept, not deleted, on reject — see the approve route's own note).
  const needsDecision = status !== 'approved';

  async function decide(approve: boolean) {
    // Reject asks for a reason so the applicant gets a real explanation,
    // not just a status flip — window.prompt is a plain-but-functional
    // way to collect that without a whole modal component for one text
    // field. Pre-filled with a clean default so a founder in a hurry can
    // just hit OK; editing it is optional, not required.
    let reason: string | undefined;
    if (!approve) {
      const typed = window.prompt('Reason for rejecting this application (shown to the applicant):', DEFAULT_REJECTION_REASON);
      if (typed === null) return; // cancelled — don't reject at all
      reason = typed.trim();
      if (reason.length < 3) {
        window.alert('A rejection reason is required — the applicant sees it.');
        return;
      }
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/approvals/${application.kind === 'store' ? 'stores' : 'riders'}/${application.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(approve ? { approve } : { approve, reason }),
      });
      if (res.ok) {
        setStatus(approve ? 'approved' : 'rejected');
      } else {
        // Previously silent — a failed decide() just stopped spinning
        // with zero indication anything went wrong, which is exactly
        // what "reject button does nothing" looked like from the outside.
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        window.alert(body?.error ?? 'Could not update this application.');
      }
    } catch {
      window.alert('Could not reach the server. Please try again.');
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
            onClick={() => decide(false)}
            disabled={busy}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-danger hover:bg-red-50 disabled:opacity-40"
            aria-label="Reject"
          >
            <X size={16} />
          </button>
          <button
            type="button"
            onClick={() => decide(true)}
            disabled={busy}
            className="flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
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
    </div>
  );
}
