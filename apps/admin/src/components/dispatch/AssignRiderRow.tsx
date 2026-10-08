'use client';

// A3 — fully manual: founder picks a rider, no auto-assign control
// (specs/00-foundation/out-of-scope.md). RiderSelect lists riders who are
// live now (online + fresh ping) first. Writes via
// app/api/orders/[id]/assign-rider (admin_assign_order_rider: trip-wide via
// assign_trip_rider for a trip leg, guarded packed + unassigned otherwise).

import { useState } from 'react';
import { Check } from 'lucide-react';
import type { ActiveRider, Order } from '@/lib/types';
import { formatCurrency } from '@/lib/format';
import { RiderSelect } from './RiderSelect';

interface Props {
  // Only these fields are read, so the Trips & dispatch board can pass a
  // trip's waiting leg without loading the full order.
  order: Pick<Order, 'id' | 'tripId' | 'storeName' | 'amount'>;
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
        <p className="text-sm font-semibold text-ink">
          #{order.id.slice(0, 6).toUpperCase()}
          {order.tripId && <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Trip — all stops</span>}
        </p>
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
          <RiderSelect riders={riders} value={selectedRiderId} onChange={setSelectedRiderId} disabled={pending} />
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
