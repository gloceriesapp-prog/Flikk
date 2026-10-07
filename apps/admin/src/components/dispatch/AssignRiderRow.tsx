'use client';

// A3 — fully manual: founder picks from active riders, no suggested-rider
// algorithm, no auto-assign control (specs/00-foundation/out-of-scope.md).
// A plain <select> is the entire "algorithm" here, on purpose. Writes via
// app/api/orders/[id]/assign-rider (guarded packed + unassigned update).

import { useState } from 'react';
import { Check } from 'lucide-react';
import type { ActiveRider, Order } from '@/lib/types';
import { formatCurrency } from '@/lib/format';

interface Props {
  order: Order;
  riders: ActiveRider[];
}

export function AssignRiderRow({ order, riders }: Props) {
  const [selectedRiderId, setSelectedRiderId] = useState('');
  const [assigned, setAssigned] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign() {
    if (!selectedRiderId || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/assign-rider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderId: selectedRiderId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? 'Could not assign the rider.');
      setAssigned(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not assign the rider.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-border py-4 last:border-0">
      <div className="min-w-[160px] flex-1">
        <p className="text-sm font-semibold text-ink">{order.id}</p>
        <p className="text-xs text-muted">
          {order.storeName} · {formatCurrency(order.amount)}
        </p>
      </div>

      {assigned ? (
        <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-success">
          <Check size={13} />
          Assigned
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={selectedRiderId}
            onChange={(e) => setSelectedRiderId(e.target.value)}
            disabled={pending}
            className="rounded-full border border-border bg-canvas px-3.5 py-2 text-sm text-ink-soft focus:outline-none"
          >
            <option value="">Select rider</option>
            {riders.map((rider) => (
              <option key={rider.id} value={rider.id}>
                {rider.name} ({rider.activeOrders} active)
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedRiderId || pending}
            onClick={handleAssign}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            {pending ? 'Assigning…' : 'Assign'}
          </button>
        </div>
      )}
      {error && <p className="w-full text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
