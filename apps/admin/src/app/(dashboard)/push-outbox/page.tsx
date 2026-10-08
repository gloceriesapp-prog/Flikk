'use client';

// Customer push outbox: every order update and admin message queued for
// push (customer_notifications). Shows queued/retrying, failed (out of
// attempts), sent and "no device" rows with the last error, and lets the admin
// requeue an unsent one. The backend worker does the sending.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { OUTBOX_STATUSES, OUTBOX_STATUS_LABEL, TEMPLATE_EVENT_LABEL, type OutboxStatus } from '@/lib/pushOutbox';

interface OutboxRow {
  id: string;
  customerId: string;
  customerLabel: string;
  orderId: string | null;
  tripId: string | null;
  kind: 'admin' | 'order';
  event: string;
  title: string;
  body: string;
  createdAt: string;
  sentAt: string | null;
  attempts: number;
  nextAttemptAt: string;
  lastError: string | null;
  status: OutboxStatus;
}

function when(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export default function PushOutboxPage() {
  const [status, setStatus] = useState<OutboxStatus>('failed');
  const [rows, setRows] = useState<OutboxRow[] | null>(null);
  const [counts, setCounts] = useState<Partial<Record<OutboxStatus, number>>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (next: OutboxStatus) => {
    try {
      const res = await fetch(`/api/push-outbox?status=${next}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not load the push outbox.');
      setRows(body.rows);
      setCounts(body.counts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the push outbox.');
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => load(status));
  }, [load, status]);

  async function retry(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/push-outbox/${id}/retry`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Could not retry.');
      await load(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not retry.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Push outbox</h1>
        <p className="text-sm text-muted">
          Customer pushes waiting, sent and failed. A push is retried automatically up to 6 times; after that it stays failed until you retry it.
          Edit wording or send a message on <Link href="/notifications" className="font-semibold text-ink hover:underline">Customer notifications</Link>.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {OUTBOX_STATUSES.map((s) => (
          <button key={s} type="button" onClick={() => { setRows(null); setStatus(s); }}
            className={clsx('rounded-full px-4 py-2 text-sm font-semibold', status === s ? 'bg-ink text-white' : 'border border-border text-ink hover:bg-accent')}>
            {OUTBOX_STATUS_LABEL[s]} {counts[s] != null && <span className="opacity-70">({counts[s]})</span>}
          </button>
        ))}
      </div>
      {error && <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      <div className="overflow-x-auto rounded-3xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold text-muted">
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Attempts</th>
              <th className="px-4 py-3">Last error</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows === null && !error && (
              <tr><td colSpan={6} className="px-4 py-6 text-muted">Loading…</td></tr>
            )}
            {rows?.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-muted">Nothing here.</td></tr>
            )}
            {rows?.map((r) => (
              <tr key={r.id} className="border-b border-border align-top last:border-0">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                  {when(r.createdAt)}
                  {r.sentAt && <div>sent {when(r.sentAt)}</div>}
                  {!r.sentAt && r.status === 'queued' && <div>next try {when(r.nextAttemptAt)}</div>}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/customers/${r.customerId}`} className="font-medium text-ink hover:underline">{r.customerLabel}</Link>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{r.title}</p>
                  <p className="text-xs text-muted">{r.body}</p>
                  <p className="mt-1 text-xs text-muted">
                    {r.kind === 'admin' ? 'Admin message' : TEMPLATE_EVENT_LABEL[r.event] ?? r.event}
                    {r.orderId && !r.tripId && <> · <Link href={`/orders/${r.orderId}`} className="hover:underline">order</Link></>}
                  </p>
                </td>
                <td className="px-4 py-3 tabular-nums text-ink">{r.attempts}</td>
                <td className="px-4 py-3 text-xs text-danger">{r.lastError ?? ''}</td>
                <td className="px-4 py-3 text-right">
                  {!r.sentAt && (
                    <button type="button" disabled={busyId === r.id} onClick={() => void retry(r.id)}
                      className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
                      {busyId === r.id ? 'Retrying…' : 'Retry now'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
