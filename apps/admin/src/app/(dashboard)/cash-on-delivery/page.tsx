'use client';

// Cash on delivery — cash riders collected at the door and still hold. Each
// delivered cash-on-delivery order (or multi-shop trip) records one
// collection; "Mark settled" records that the rider handed the cash over.
// Styling mirrors the Failed deliveries page.

import { useCallback, useEffect, useState } from 'react';
import { HandCoins } from 'lucide-react';
import clsx from 'clsx';
import type { CashCollectionsResponse, RiderCashBalance } from '@/app/api/cash-collections/route';
import { formatDateTime, formatRupees } from '@/lib/format';

export default function CashOnDeliveryPage() {
  const [data, setData] = useState<CashCollectionsResponse>({ riders: [], collections: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settling, setSettling] = useState<RiderCashBalance | null>(null);
  const [reference, setReference] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/cash-collections');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not load cash on delivery records.');
      setData(body as CashCollectionsResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load cash on delivery records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  async function handleSettle() {
    if (!settling || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/cash-collections/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderId: settling.riderId, reference, collectionIds: settling.outstandingIds }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not record the settlement.');
      setNotice(`${settling.riderName}: ${formatRupees(body.settledAmount)} settled (${body.settledCount} ${body.settledCount === 1 ? 'delivery' : 'deliveries'}).`);
      setSettling(null);
      setReference('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the settlement.');
    } finally {
      setIsSaving(false);
    }
  }

  const totalOutstanding = data.riders.reduce((sum, rider) => sum + Math.round(rider.outstandingAmount * 100), 0) / 100;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Cash on delivery</h1>
        <p className="text-sm text-muted">
          Cash riders collected from customers and have not handed over yet.{' '}
          {data.riders.length > 0 ? `${formatRupees(totalOutstanding)} outstanding across ${data.riders.length} ${data.riders.length === 1 ? 'rider' : 'riders'}.` : 'Nothing outstanding.'}
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {notice && <p role="status" className="text-sm text-success">{notice}</p>}

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <h2 className="px-4 pt-4 text-base font-semibold text-ink">Outstanding by rider</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="bg-accent/40 text-left text-xs font-semibold uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Rider</th>
              <th className="px-4 py-3">Cash held</th>
              <th className="px-4 py-3">Deliveries</th>
              <th className="px-4 py-3">Oldest</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Loading…</td></tr>
            ) : data.riders.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No rider is holding cash.</td></tr>
            ) : (
              data.riders.map((rider) => (
                <tr key={rider.riderId} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="text-ink">{rider.riderName}</p>
                    <p className="text-xs tabular-nums text-muted">{rider.riderPhone}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-ink">{formatRupees(rider.outstandingAmount)}</td>
                  <td className="px-4 py-3 tabular-nums text-muted">{rider.outstandingCount}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">{rider.oldestCollectedAt ? formatDateTime(rider.oldestCollectedAt) : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => { setSettling(rider); setReference(''); setNotice(null); }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                    >
                      <HandCoins size={13} />
                      Mark settled
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {settling && (
        <div role="dialog" aria-modal="true" aria-labelledby="settle-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
            <h2 id="settle-title" className="text-lg font-semibold text-ink">Mark cash settled</h2>
            <p className="mt-1 text-sm text-muted">
              Record that {settling.riderName} handed over {formatRupees(settling.outstandingAmount)} for {settling.outstandingCount}{' '}
              {settling.outstandingCount === 1 ? 'delivery' : 'deliveries'}. Cash collected after this page loaded stays
              outstanding.
            </p>
            <label htmlFor="settlement-ref" className="mt-4 block text-sm font-medium text-ink">Reference (optional)</label>
            <input
              id="settlement-ref"
              value={reference}
              maxLength={200}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Receipt number, UPI reference or note"
              className="mt-1 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-ink outline-none"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setSettling(null)} disabled={isSaving} className="rounded-xl px-4 py-2 text-sm font-semibold text-muted">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSettle}
                disabled={isSaving}
                className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {isSaving ? 'Saving…' : 'Mark settled'}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <h2 className="px-4 pt-4 text-base font-semibold text-ink">Recent collections</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="bg-accent/40 text-left text-xs font-semibold uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Rider</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Collected</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Loading…</td></tr>
            ) : data.collections.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No cash on delivery orders delivered yet.</td></tr>
            ) : (
              data.collections.map((collection) => (
                <tr key={collection.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium text-ink">
                    {collection.orderLabel}
                    {collection.isTrip && <span className="ml-2 text-xs font-normal text-muted">multi-shop</span>}
                  </td>
                  <td className="px-4 py-3 text-ink">{collection.riderName}</td>
                  <td className="px-4 py-3 tabular-nums text-ink">{formatRupees(collection.amount)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDateTime(collection.collectedAt)}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('rounded-full px-2.5 py-1 text-xs font-semibold',
                      collection.settledAt ? 'bg-green-50 text-success' : 'bg-amber-50 text-amber-600')}>
                      {collection.settledAt ? `Settled ${formatDateTime(collection.settledAt)}` : 'With rider'}
                    </span>
                    {collection.settlementRef && <p className="mt-1 max-w-[12rem] truncate text-xs text-muted">{collection.settlementRef}</p>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
