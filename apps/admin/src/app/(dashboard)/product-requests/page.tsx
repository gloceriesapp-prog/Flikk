'use client';

// Product requests — what customers typed in the Store list's "Didn't find
// an item?" sheet. Mark each done once it is stocked or answered.

import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import type { ProductRequest } from '@/app/api/product-requests/route';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export default function ProductRequestsPage() {
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/product-requests');
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? 'Could not load product requests.');
      setRequests(body as ProductRequest[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load product requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  async function setStatus(request: ProductRequest, status: ProductRequest['status']) {
    setError(null);
    const res = await fetch(`/api/product-requests/${request.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? 'Could not update the request.');
      return;
    }
    setRequests((current) => current.map((item) => (item.id === request.id ? { ...item, status } : item)));
  }

  const openCount = requests.filter((item) => item.status === 'new').length;
  const visible = showDone ? requests : requests.filter((item) => item.status === 'new');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Product requests</h1>
          <p className="mt-1 text-sm text-muted">From the customer Store page — “Didn’t find an item?”. {openCount} open.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={showDone} onChange={(event) => setShowDone(event.target.checked)} />
          Show done
        </label>
      </div>

      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">{error}</p>}

      <div className="card divide-y divide-border">
        {loading && <p className="p-4 text-sm text-muted">Loading…</p>}
        {!loading && visible.length === 0 && <p className="p-4 text-sm text-muted">No {showDone ? '' : 'open '}requests.</p>}
        {visible.map((request) => (
          <div key={request.id} className="flex flex-wrap items-start gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="whitespace-pre-wrap break-words text-sm font-medium text-ink">{request.message}</p>
              <p className="mt-1 text-xs text-muted">
                {formatDate(request.createdAt)}
                {request.city ? ` · ${request.city}` : ''}
                {request.storeName ? ` · nearest: ${request.storeName}` : ''}
              </p>
            </div>
            <span className={clsx('rounded-full px-2.5 py-1 text-xs font-semibold', request.status === 'new' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-success')}>
              {request.status === 'new' ? 'Open' : 'Done'}
            </span>
            <button
              type="button"
              onClick={() => void setStatus(request, request.status === 'new' ? 'done' : 'new')}
              className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-accent"
            >
              {request.status === 'new' ? 'Mark done' : 'Reopen'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
