'use client';

// Approve/Reject on the single-application review screen ([id]/page.tsx,
// a server component that can't hold its own client state) — same
// PATCH /api/approvals/{stores,riders}/[userId] as ApplicationRow.tsx's
// own decide(). Reject always asks for a reason (the applicant sees it);
// a failed request shows the server's error instead of silently refreshing.
// When more than one zone is active the founder picks the store's zone.
// router.refresh() re-runs the server component's own data fetch.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { ReasonModal } from '@/components/ui/ReasonModal';

interface Props {
  applicationId: string;
  kind: 'store' | 'rider';
  zones?: { id: string; name: string }[];
  canApprove?: boolean;
}

const DEFAULT_REASON: Record<Props['kind'], string> = {
  store: "We couldn't verify your store documents this time. Please double-check your store details and photo, then resubmit your application.",
  rider: "We couldn't verify your documents this time. Please double-check your details and photos, then resubmit your application.",
};

export function DecisionButtons({ applicationId, kind, zones = [], canApprove = true }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);

  async function send(body: Record<string, unknown>) {
    const res = await fetch(`/api/approvals/${kind === 'store' ? 'stores' : 'riders'}/${applicationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Could not update this application.');
    router.refresh();
  }

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      await send(kind === 'store' && zones.length > 1 ? { approve: true, zoneId } : { approve: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this application.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-border pt-6">
      {kind === 'store' && zones.length > 1 && canApprove && (
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Zone for this store
          <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm">
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setRejecting(true);
          }}
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border border-danger/30 py-3 text-sm font-semibold text-danger hover:bg-red-50 disabled:opacity-40"
        >
          <X size={16} />
          Reject
        </button>
        <button
          type="button"
          onClick={() => void approve()}
          disabled={busy || !canApprove}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
        >
          <Check size={16} />
          {busy ? 'Approving…' : 'Approve'}
        </button>
      </div>
      {rejecting && (
        <ReasonModal
          title="Reject application"
          description="The applicant sees this reason in their app and can fix and resubmit."
          confirmLabel="Reject"
          initialReason={DEFAULT_REASON[kind]}
          onClose={() => setRejecting(false)}
          onConfirm={async (reason) => {
            await send({ approve: false, reason });
            setRejecting(false);
          }}
        />
      )}
    </div>
  );
}
