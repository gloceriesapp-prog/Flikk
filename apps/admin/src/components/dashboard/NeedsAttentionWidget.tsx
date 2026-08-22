// Home snapshot's own addition, not in the original A1-A4 spec — "orders
// stuck too long / no rider yet" is exactly the kind of thing a founder
// needs surfaced without hunting for it across the Orders and Riders
// screens separately.

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { ATTENTION_THRESHOLD_MINUTES, PLACEHOLDER_ORDERS } from '@/lib/mock-data';

export function NeedsAttentionWidget() {
  const flagged = PLACEHOLDER_ORDERS.filter(
    (o) =>
      (o.status === 'placed' || o.status === 'packed') &&
      !o.riderId &&
      o.minutesSinceStatusChange >= ATTENTION_THRESHOLD_MINUTES
  );

  return (
    <Card
      title="Needs attention"
      subtitle={`Stuck ${ATTENTION_THRESHOLD_MINUTES}+ min with no rider assigned`}
      action={
        flagged.length > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-danger/10 px-2 text-xs font-bold text-danger">
            {flagged.length}
          </span>
        )
      }
    >
      {flagged.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">All caught up — nothing stuck right now.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {flagged.map((order) => (
            <div key={order.id} className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50">
                <AlertTriangle size={15} className="text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{order.storeName}</p>
                <p className="text-xs text-muted">
                  {order.id} · waiting {order.minutesSinceStatusChange} min
                </p>
              </div>
              <Link href="/riders" className="text-xs font-semibold text-ink underline underline-offset-2">
                Assign
              </Link>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
