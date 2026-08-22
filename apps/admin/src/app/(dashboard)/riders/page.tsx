// Rider management — active roster + manual assignment (A3/FR22) on one
// screen, since a founder doing either is looking at "who's actually on
// shift right now" either way. Fully manual: no suggested-rider algorithm,
// no auto-assign (specs/00-foundation/out-of-scope.md).

import { Phone } from 'lucide-react';
import { AssignRiderRow } from '@/components/dispatch/AssignRiderRow';
import { PLACEHOLDER_ACTIVE_RIDERS, PLACEHOLDER_ORDERS } from '@/lib/mock-data';

export default function RidersPage() {
  const unassigned = PLACEHOLDER_ORDERS.filter((o) => o.status === 'packed' && !o.riderId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Riders</h1>
        <p className="text-sm text-muted">Active roster and manual order assignment.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-ink">Active riders</h3>
          <div className="flex flex-col gap-3">
            {PLACEHOLDER_ACTIVE_RIDERS.map((rider) => (
              <div key={rider.id} className="flex items-center gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-accent" />
                  <span
                    className={
                      rider.isOnline
                        ? 'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success'
                        : 'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-muted'
                    }
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{rider.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted">
                    <Phone size={11} />
                    {rider.phone}
                  </p>
                </div>
                <span className="text-xs font-semibold text-ink-soft">{rider.activeOrders} active</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Unassigned orders</h3>
            <span className="text-xs text-muted">{unassigned.length} waiting</span>
          </div>
          {unassigned.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Nothing waiting on a rider right now.</p>
          ) : (
            unassigned.map((order) => (
              <AssignRiderRow key={order.id} order={order} riders={PLACEHOLDER_ACTIVE_RIDERS.filter((r) => r.isOnline)} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
