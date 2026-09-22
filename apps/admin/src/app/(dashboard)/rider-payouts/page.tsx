'use client';

// Rider payouts — real data (public.rider_earnings), previously zero
// admin visibility. Distinct pool from store commission/Revenue: a
// rider's earning is always that order's own delivery fee, never a share
// of the commission Flikk keeps (app/api/rider-payouts' own note has the
// full reasoning). "Release" here is a real settlement mechanism (stamps
// paid_at) — not a fake bank transfer; riders don't have a verified
// payout destination yet, this is the same honest manual mechanism
// stores themselves used before RazorpayX automation existed for them.

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/format';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';

interface RiderPayoutRow {
  riderId: string;
  name: string;
  phone: string;
  pending: number;
  paid: number;
  orderCount: number;
}

export default function RiderPayoutsPage() {
  const [riders, setRiders] = useState<RiderPayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [justReleased, setJustReleased] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch('/api/rider-payouts');
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not load rider payouts.');
      setRiders(await res.json());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load rider payouts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);
  useAdminRealtime(load);

  const totalPending = riders.reduce((sum, r) => sum + r.pending, 0);
  const totalPaid = riders.reduce((sum, r) => sum + r.paid, 0);

  async function handleRelease() {
    setReleasing(true);
    setJustReleased(false);
    try {
      const res = await fetch('/api/rider-payouts', { method: 'PATCH' });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not release rider payouts.');
      await load();
      setJustReleased(true);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not release rider payouts.');
    } finally {
      setReleasing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-medium text-ink">Rider Payouts</h1>
        <p className="text-sm text-muted">Delivery fees owed to riders — separate from store commission.</p>
      </div>

      {loadError && <p className="text-sm text-danger">{loadError}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-xs font-semibold text-muted">Pending across all riders</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{formatCurrency(totalPending)}</p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-xs font-semibold text-muted">Paid out so far</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{formatCurrency(totalPaid)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-3xl border border-border bg-card p-5">
        <p className="text-sm text-ink-soft">
          Marks every rider&apos;s pending delivery-fee earnings as settled. No bank transfer happens automatically —
          record this once you&apos;ve actually paid riders out.
        </p>
        <button
          type="button"
          onClick={handleRelease}
          disabled={totalPending === 0 || releasing}
          className="flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCircle2 size={15} />
          {releasing ? 'Releasing…' : 'Release pending payouts'}
        </button>
      </div>
      {justReleased && totalPending === 0 && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-success">
          <CheckCircle2 size={15} />
          Released — every rider is settled.
        </p>
      )}

      <div className="overflow-x-auto rounded-3xl border border-border bg-card">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="p-4 font-medium">Rider</th>
              <th className="p-4 font-medium">Phone</th>
              <th className="p-4 font-medium text-right">Deliveries</th>
              <th className="p-4 font-medium text-right">Pending</th>
              <th className="p-4 font-medium text-right">Paid</th>
            </tr>
          </thead>
          <tbody>
            {riders.map((rider) => (
              <tr key={rider.riderId} className="border-b border-border last:border-0">
                <td className="p-4 font-medium text-ink">{rider.name}</td>
                <td className="p-4 text-ink-soft">{rider.phone}</td>
                <td className="p-4 text-right tabular-nums text-ink-soft">{formatNumber(rider.orderCount)}</td>
                <td className="p-4 text-right font-semibold tabular-nums text-ink">{formatCurrency(rider.pending)}</td>
                <td className="p-4 text-right tabular-nums text-ink-soft">{formatCurrency(rider.paid)}</td>
              </tr>
            ))}

            {!loading && riders.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-muted">
                  No rider earnings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
