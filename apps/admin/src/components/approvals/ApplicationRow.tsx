'use client';

// A1 — approving here is the only UI path that flips users.is_approved to
// true (specs/04-admin-dashboard/screens.md's own note); rejecting must
// leave a clear terminal state, not silently do nothing — hence a real
// "Rejected" pill state below rather than the row just disappearing.
// Each application is its own bordered card, not a thin table row — a
// pending one gets an amber left accent, so the ones actually needing a
// decision read as distinct from the ones already resolved.

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

export function ApplicationRow({ application }: { application: Application }) {
  const [status, setStatus] = useState(application.status);
  const Icon = application.kind === 'store' ? Store : User;
  const isPending = status === 'pending';

  return (
    <div
      className={clsx(
        'flex items-center gap-4 rounded-2xl border p-4 transition-colors',
        isPending ? 'border-amber-100 bg-amber-50/40' : 'border-border bg-card',
      )}
    >
      <div
        className={clsx(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
          isPending ? 'bg-amber-100' : 'bg-accent',
        )}
      >
        <Icon size={17} className={isPending ? 'text-amber-700' : 'text-ink-soft'} />
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

      {isPending ? (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setStatus('rejected')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-danger hover:bg-red-50"
            aria-label="Reject"
          >
            <X size={16} />
          </button>
          <button
            type="button"
            onClick={() => setStatus('approved')}
            className="flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white hover:opacity-90"
          >
            <Check size={14} />
            Approve
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
