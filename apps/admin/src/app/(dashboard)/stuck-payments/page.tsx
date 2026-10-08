'use client';

// Stuck checkouts and payments: online checkouts still waiting for payment and
// refunds not completed, older than a chosen number of minutes. Read-only
// list with links to the existing actions: the order page (admin cancel) and
// the Refunds page / retry-refund route for refunds.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/format';

interface StuckCheckout {
  kind: 'order' | 'trip';
  id: string;
  reference: string;
  orderId: string | null;
  customerId: string;
  customer: string;
  total: number;
  since: string;
  providerOrderId: string | null;
  providerChecked: boolean;
}

interface StuckRefund {
  kind: 'order' | 'trip';
  id: string;
  reference: string;
  status: string;
  attempts: number;
  lastError: string | null;
  amount: number;
  since: string;
}

const MINUTE_OPTIONS = [15, 30, 60, 180, 1440];

function age(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  return `${Math.floor(minutes / 1440)} d`;
}

export default function StuckPaymentsPage() {
  const [minutes, setMinutes] = useState(30);
  const [data, setData] = useState<{ checkouts: StuckCheckout[]; refunds: StuckRefund[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (m: number) => {
    try {
      const res = await fetch(`/api/stuck-payments?minutes=${m}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not load stuck payments.');
      setData(body);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load stuck payments.');
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => load(minutes));
  }, [load, minutes]);

  async function retryRefund(orderId: string) {
    setBusyId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/retry-refund`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Could not retry the refund.');
      await load(minutes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not retry the refund.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Stuck checkouts and payments</h1>
        <p className="text-sm text-muted">
          Unpaid online checkouts are normally released 20 minutes after placement (at most 50 while Cashfree is checked). Anything listed here is older than that window or than the age you pick.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink">
        Older than
        {MINUTE_OPTIONS.map((m) => (
          <button key={m} type="button" onClick={() => { setData(null); setMinutes(m); }}
            className={m === minutes ? 'rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white' : 'rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-accent'}>
            {m < 60 ? `${m} min` : m < 1440 ? `${m / 60} h` : '1 day'}
          </button>
        ))}
      </div>
      {error && <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      {!data && !error && <p className="text-sm text-muted">Loading…</p>}
      {data && (
        <>
          <div className="rounded-3xl border border-border bg-card p-5">
            <h2 className="mb-1 text-sm font-semibold text-ink">Checkouts waiting for online payment ({data.checkouts.length})</h2>
            <p className="mb-4 text-xs text-muted">Stock is held for these. Open the order to cancel it; a payment that arrives later is refunded automatically.</p>
            {data.checkouts.length === 0 ? (
              <p className="text-sm text-muted">Nothing stuck.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.checkouts.map((c) => (
                  <div key={`${c.kind}-${c.id}`} className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {c.reference} {c.kind === 'trip' && <span className="text-xs text-muted">(multi-shop)</span>}
                      </p>
                      <p className="text-xs text-muted">
                        <Link href={`/customers/${c.customerId}`} className="hover:underline">{c.customer}</Link> · waiting {age(c.since)} ·{' '}
                        {c.providerOrderId ? `Cashfree ${c.providerOrderId}${c.providerChecked ? ' (checked, unpaid)' : ' (not checked yet)'}` : 'payment never started'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums text-ink">{formatCurrency(c.total)}</span>
                      {c.orderId && (
                        <Link href={`/orders/${c.orderId}`} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-accent">Open order</Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-card p-5">
            <h2 className="mb-1 text-sm font-semibold text-ink">Refunds not completed ({data.refunds.length})</h2>
            <p className="mb-4 text-xs text-muted">
              Queued and processing refunds are retried by the refund worker. Failed single-order refunds can be retried here; trip and manual refunds are handled on <Link href="/refunds" className="font-semibold text-ink hover:underline">Refunds</Link>.
            </p>
            {data.refunds.length === 0 ? (
              <p className="text-sm text-muted">Nothing stuck.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.refunds.map((r) => (
                  <div key={`${r.kind}-${r.id}`} className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {r.kind === 'order' ? <Link href={`/orders/${r.id}`} className="hover:underline">{r.reference}</Link> : `Trip ${r.reference.slice(0, 8)}`}
                        <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-ink-soft">{r.status.replace('_', ' ')}</span>
                      </p>
                      <p className="text-xs text-muted">
                        {age(r.since)} · {r.attempts} attempt{r.attempts === 1 ? '' : 's'}
                        {r.lastError && <span className="text-danger"> · {r.lastError}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums text-ink">{formatCurrency(r.amount)}</span>
                      {r.kind === 'order' && r.status === 'failed' ? (
                        <button type="button" disabled={busyId === r.id} onClick={() => void retryRefund(r.id)}
                          className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
                          {busyId === r.id ? 'Retrying…' : 'Retry refund'}
                        </button>
                      ) : (
                        <Link href="/refunds" className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-accent">Refunds</Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
