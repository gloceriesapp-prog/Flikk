'use client';

// Admin suspension control for one store — separate from the open/closed
// switch in StoreDetailForm. See app/api/stores/[id]/suspension/route.ts.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReasonModal } from '@/components/ui/ReasonModal';

async function setSuspension(storeId: string, suspend: boolean, reason?: string) {
  const res = await fetch(`/api/stores/${storeId}/suspension`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suspend, reason }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Could not update the store.');
}

export function StoreSuspensionPanel({
  storeId,
  suspended,
  reason,
  suspendedAt,
}: {
  storeId: string;
  suspended: boolean;
  reason: string | null;
  suspendedAt: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unsuspend() {
    if (!window.confirm('Unsuspend this store? It stays closed until the partner reopens it.')) return;
    setBusy(true);
    setError(null);
    try {
      await setSuspension(storeId, false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the store.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`rounded-3xl border p-6 shadow-sm ${suspended ? 'border-danger/40 bg-red-50' : 'border-border bg-card'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">{suspended ? 'Suspended by Gloceries' : 'Store suspension'}</h2>
          {suspended ? (
            <p className="mt-1 text-sm text-ink">
              {reason ?? 'No reason recorded.'}
              {suspendedAt && (
                <span className="text-muted"> · since {new Date(suspendedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              )}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">Suspending closes the store and stops the partner from reopening it until you unsuspend.</p>
          )}
        </div>
        {suspended ? (
          <button type="button" disabled={busy} onClick={() => void unsuspend()} className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50">
            {busy ? 'Saving…' : 'Unsuspend'}
          </button>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white">
            Suspend store
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {open && (
        <ReasonModal
          title="Suspend store"
          description="The store closes now and the partner cannot reopen it. The reason is shown to the partner."
          confirmLabel="Suspend store"
          onClose={() => setOpen(false)}
          onConfirm={async (r) => {
            await setSuspension(storeId, true, r);
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}
