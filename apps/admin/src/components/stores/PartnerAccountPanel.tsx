'use client';

// Admin control for the partner (store owner) account behind a store —
// separate from StoreSuspensionPanel (the store itself). Suspending blocks
// the owner from the partner app/dashboard and every partner API route, and
// closes the store. Every action is audited (partner_account_actions) and the
// recent history is listed here. See app/api/stores/[id]/owner-suspension.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReasonModal } from '@/components/ui/ReasonModal';

export interface PartnerAccountAction {
  id: string;
  action: 'suspend' | 'reinstate';
  reason: string | null;
  createdAt: string;
}

async function setOwnerSuspension(storeId: string, suspend: boolean, reason?: string) {
  const res = await fetch(`/api/stores/${storeId}/owner-suspension`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suspend, reason }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Could not update the partner account.');
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export function PartnerAccountPanel({
  storeId,
  ownerLabel,
  suspended,
  reason,
  suspendedAt,
  history,
}: {
  storeId: string;
  ownerLabel: string;
  suspended: boolean;
  reason: string | null;
  suspendedAt: string | null;
  history: PartnerAccountAction[];
}) {
  const router = useRouter();
  const [modal, setModal] = useState<'suspend' | 'reinstate' | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className={`rounded-3xl border p-6 shadow-sm ${suspended ? 'border-danger/40 bg-red-50' : 'border-border bg-card'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">{suspended ? 'Partner account suspended' : 'Partner account'}</h2>
          <p className="mt-0.5 text-xs text-muted">{ownerLabel}</p>
          {suspended ? (
            <p className="mt-1 text-sm text-ink">
              {reason ?? 'No reason recorded.'}
              {suspendedAt && <span className="text-muted"> · since {formatDate(suspendedAt)}</span>}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">
              Suspending revokes the owner&apos;s access to the partner app and dashboard and closes the store. Cancel any open orders from Orders.
            </p>
          )}
        </div>
        {suspended ? (
          <button type="button" onClick={() => { setError(null); setModal('reinstate'); }} className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-ink">
            Reinstate partner
          </button>
        ) : (
          <button type="button" onClick={() => { setError(null); setModal('suspend'); }} className="rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white">
            Suspend partner
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {history.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Account history</p>
          <ul className="flex flex-col gap-1.5">
            {history.map((entry) => (
              <li key={entry.id} className="text-sm text-ink">
                <span className={entry.action === 'suspend' ? 'font-semibold text-danger' : 'font-semibold text-success'}>
                  {entry.action === 'suspend' ? 'Suspended' : 'Reinstated'}
                </span>
                <span className="text-muted"> · {formatDate(entry.createdAt)}</span>
                {entry.reason && <span> — {entry.reason}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {modal === 'suspend' && (
        <ReasonModal
          title="Suspend partner account"
          description="The owner is signed out of every partner surface and sees this reason. The store closes and cannot reopen until you reinstate."
          confirmLabel="Suspend partner"
          onClose={() => setModal(null)}
          onConfirm={async (r) => {
            await setOwnerSuspension(storeId, true, r);
            setModal(null);
            router.refresh();
          }}
        />
      )}
      {modal === 'reinstate' && (
        <ReasonModal
          title="Reinstate partner account"
          description="The owner gets access back. The store stays closed until they reopen it. A note is optional and kept in the audit history."
          confirmLabel="Reinstate"
          reasonRequired={false}
          onClose={() => setModal(null)}
          onConfirm={async (r) => {
            await setOwnerSuspension(storeId, false, r || undefined);
            setModal(null);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}
