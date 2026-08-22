'use client';

// A1 — Store + rider onboarding, tabbed (specs/04-admin-dashboard/
// screens.md's resolution of the PRD's numbering gap: one screen, not two).

import { useState } from 'react';
import clsx from 'clsx';
import { ApplicationRow } from '@/components/approvals/ApplicationRow';
import { PLACEHOLDER_APPLICATIONS } from '@/lib/mock-data';

const TABS = [
  { label: 'Stores', kind: 'store' as const },
  { label: 'Riders', kind: 'rider' as const },
];

export default function ApprovalsPage() {
  const [tab, setTab] = useState<'store' | 'rider'>('store');
  const applications = PLACEHOLDER_APPLICATIONS.filter((a) => a.kind === tab);
  const pendingCount = applications.filter((a) => a.status === 'pending').length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Approvals</h1>
        <p className="text-sm text-muted">Review and approve new store and rider applications.</p>
      </div>

      <div className="flex items-center gap-1 self-start rounded-full border border-border bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t.kind}
            type="button"
            onClick={() => setTab(t.kind)}
            className={clsx(
              'rounded-full px-5 py-2 text-sm font-semibold transition-colors',
              tab === t.kind ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">
            {tab === 'store' ? 'Store applications' : 'Rider applications'}
          </h3>
          <span className="text-xs text-muted">{pendingCount} pending</span>
        </div>

        {applications.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No applications yet.</p>
        ) : (
          applications.map((app) => <ApplicationRow key={app.id} application={app} />)
        )}
      </div>
    </div>
  );
}
