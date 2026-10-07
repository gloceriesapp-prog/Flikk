'use client';

// Rider payouts — weekly delivery-fee payouts (rider_payouts), paid manually:
// send each one from your bank/UPI app, then Mark paid with the transaction
// reference. Distinct pool from store commission (app/api/rider-payouts' note).

import { useCallback, useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/format';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';
import { Destination, MarkPaid } from '@/components/revenue/PayoutsTable';
import type { PayoutDestination } from '@/lib/types';

interface RiderPayout {
  id: string;
  riderName: string;
  riderPhone: string;
  cycleLabel: string;
  amount: number;
  status: 'pending' | 'paid';
  paidAt: string | null;
  paymentReference: string | null;
  destination: PayoutDestination | null;
}

interface Accruing {
  riderId: string;
  riderName: string;
  amount: number;
}

export default function RiderPayoutsPage() {
  const [payouts, setPayouts] = useState<RiderPayout[]>([]);
  const [accruing, setAccruing] = useState<Accruing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch('/api/rider-payouts');
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not load rider payouts.');
      const data = (await res.json()) as { payouts: RiderPayout[]; accruing: Accruing[] };
      setPayouts(data.payouts);
      setAccruing(data.accruing);
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

  async function markPaid(id: string, reference: string) {
    const res = await fetch('/api/rider-payouts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, reference }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Could not mark this payout paid.');
    await load();
  }

  const pending = payouts.filter((p) => p.status === 'pending');
  const paid = payouts.filter((p) => p.status === 'paid');
  const totalPending = pending.reduce((sum, p) => sum + p.amount, 0);
  const totalAccruing = accruing.reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-medium text-ink">Rider Payouts</h1>
        <p className="text-sm text-muted">Delivery fees owed to riders — separate from store commission.</p>
      </div>

      {loadError && <p className="text-sm text-danger">{loadError}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-xs font-semibold text-muted">Ready to pay ({pending.length})</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{formatCurrency(totalPending)}</p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-xs font-semibold text-muted">Accruing this week (payable after the weekly run)</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{formatCurrency(totalAccruing)}</p>
        </div>
      </div>

      <p className="text-sm text-muted">
        Pay each rider from your bank or UPI app, then press <span className="font-medium text-ink">Mark paid</span> and
        enter the transaction reference (UTR).
      </p>

      <RiderPayoutTable rows={pending} onMarkPaid={markPaid} emptyLabel={loading ? 'Loading…' : 'Nothing to pay right now.'} />

      <div>
        <h2 className="mb-3 text-sm font-medium text-ink">Paid</h2>
        <RiderPayoutTable rows={paid} emptyLabel="No rider payouts recorded yet." />
      </div>
    </div>
  );
}

function RiderPayoutTable({
  rows,
  emptyLabel,
  onMarkPaid,
}: {
  rows: RiderPayout[];
  emptyLabel: string;
  onMarkPaid?: (id: string, reference: string) => Promise<void>;
}) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-border bg-card">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="p-4 font-medium">Rider</th>
            <th className="p-4 font-medium">Cycle</th>
            <th className="p-4 text-right font-medium">Amount</th>
            <th className="p-4 font-medium">Pay to</th>
            <th className="p-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border align-top last:border-0">
              <td className="p-4">
                <p className="font-medium text-ink">{row.riderName}</p>
                <p className="text-xs text-muted">{row.riderPhone}</p>
              </td>
              <td className="p-4 text-ink-soft">{row.cycleLabel}</td>
              <td className="p-4 text-right font-semibold tabular-nums text-ink">{formatCurrency(row.amount)}</td>
              <td className="p-4 text-ink-soft">
                <Destination destination={row.destination} />
              </td>
              <td className="p-4">
                {row.status === 'paid' ? (
                  <div className="flex flex-col gap-1">
                    <span className="self-start rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-success">Paid · {row.paidAt}</span>
                    {row.paymentReference && <span className="text-xs text-muted">Ref {row.paymentReference}</span>}
                  </div>
                ) : onMarkPaid && row.destination ? (
                  <MarkPaid onSubmit={(reference) => onMarkPaid(row.id, reference)} />
                ) : (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    {row.destination ? 'Pending' : 'No payout account'}
                  </span>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-sm text-muted">
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
