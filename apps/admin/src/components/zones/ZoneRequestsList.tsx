'use client';
import { useState } from 'react';
// "Do you want Gloceries in your place?" demand signal — a customer-app
// upvote feed (ZoneRequest's own note in lib/types.ts on where this data
// comes from), shown here sorted by upvote count so a founder can see
// what to consider for a future zone at a glance, without it implying
// any of these are activating.

import { ArrowBigUp } from 'lucide-react';
import type { ZoneRequest } from '@/lib/types';

export function ZoneRequestsList({ requests }: { requests: ZoneRequest[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  async function notify(request: ZoneRequest) {
    if (busy) return;
    if (!window.confirm('Notify signed-in customers who joined this area’s launch waitlist? Confirm delivery is available here first.')) return;
    setBusy(request.id); setMessage(null);
    try {
      const res = await fetch('/api/area-upvotes/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ addressLabel: request.placeName, title: 'Gloceries is now nearby', body: 'Delivery is available in your requested area. Open Gloceries and choose your address to browse.' }) });
      const result = await res.json(); if (!res.ok) throw new Error(result.error);
      setMessage(`${result.queued} waitlist notifications queued.${result.more ? ' Send another batch to reach remaining voters.' : ''}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not send.'); }
    finally { setBusy(null); }
  }
  const topVotes = requests[0]?.upvotes ?? 1;

  return (
    <div className="flex flex-col gap-3">
      {!!message && <p role="status" className="text-sm">{message}</p>}
      {requests.map((request, i) => (
        <div key={request.id} className="flex items-center gap-4 rounded-2xl border border-border p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-ink-soft">
            #{i + 1}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{request.placeName}</p>
            <p className="text-xs text-muted">
              {request.district ? `${request.district} · ` : ''}requested since{' '}
              {new Date(request.firstRequestedAt).toLocaleDateString()}
            </p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-accent">
              <div className="h-full rounded-full bg-ink" style={{ width: `${(request.upvotes / topVotes) * 100}%` }} />
            </div>
          </div>

<button disabled={!!busy} onClick={() => void notify(request)} className="text-xs font-semibold text-blue-600">{busy === request.id ? 'Queuing…' : 'Notify waitlist'}</button>
          <div className="flex shrink-0 flex-col items-center gap-0.5 rounded-2xl bg-accent px-3 py-2">
            <ArrowBigUp size={16} className="text-ink" />
            <span className="text-sm font-semibold tabular-nums text-ink">{request.upvotes}</span>
          </div>
        </div>
      ))}

      {requests.length === 0 && <p className="py-6 text-center text-sm text-muted">No requests yet.</p>}
    </div>
  );
}
