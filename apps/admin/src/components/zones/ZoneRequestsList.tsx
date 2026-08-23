// "Do you want Flikk in your place?" demand signal — a customer-app
// upvote feed (ZoneRequest's own note in lib/types.ts on where this data
// comes from), shown here sorted by upvote count so a founder can see
// what to consider for a future zone at a glance, without it implying
// any of these are activating.

import { ArrowBigUp } from 'lucide-react';
import type { ZoneRequest } from '@/lib/types';

export function ZoneRequestsList({ requests }: { requests: ZoneRequest[] }) {
  const topVotes = requests[0]?.upvotes ?? 1;

  return (
    <div className="flex flex-col gap-3">
      {requests.map((request, i) => (
        <div key={request.id} className="flex items-center gap-4 rounded-2xl border border-border p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-ink-soft">
            #{i + 1}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{request.placeName}</p>
            <p className="text-xs text-muted">
              {request.district} · requested since {request.firstRequestedAt}
            </p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-accent">
              <div className="h-full rounded-full bg-ink" style={{ width: `${(request.upvotes / topVotes) * 100}%` }} />
            </div>
          </div>

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
