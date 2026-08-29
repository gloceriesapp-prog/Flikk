'use client';

// Approve/Reject on the single-application review screen ([id]/page.tsx,
// a server component that can't hold its own client state) — same
// PATCH /api/approvals/{stores,riders}/[userId] as ApplicationRow.tsx's
// own decide(). router.refresh() re-runs the server component's own data
// fetch so the page reflects the new, persisted status without a full
// navigation.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';

interface Props {
  applicationId: string;
  kind: 'store' | 'rider';
}

export function DecisionButtons({ applicationId, kind }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      await fetch(`/api/approvals/${kind === 'store' ? 'stores' : 'riders'}/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 flex items-center gap-3 border-t border-border pt-6">
      <button
        type="button"
        onClick={() => decide(false)}
        disabled={busy}
        className="flex flex-1 items-center justify-center gap-2 rounded-full border border-danger/30 py-3 text-sm font-semibold text-danger hover:bg-red-50 disabled:opacity-40"
      >
        <X size={16} />
        Reject
      </button>
      <button
        type="button"
        onClick={() => decide(true)}
        disabled={busy}
        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
      >
        <Check size={16} />
        {busy ? 'Approving…' : 'Approve'}
      </button>
    </div>
  );
}
