'use client';

// A1 — Store + rider onboarding, tabbed (specs/04-admin-dashboard/
// screens.md's resolution of the PRD's numbering gap: one screen, not two).
// Real applications (GET /api/approvals/stores, /api/approvals/riders) —
// replaces PLACEHOLDER_APPLICATIONS.

import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { ApplicationRow } from '@/components/approvals/ApplicationRow';
import { ProductReviewRow } from '@/components/approvals/ProductReviewRow';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';
import type { Application, Product } from '@/lib/types';

const TABS = [
  { label: 'Stores', kind: 'store' as const },
  { label: 'Riders', kind: 'rider' as const },
  { label: 'Products', kind: 'product' as const },
];

type TabKind = 'store' | 'rider' | 'product';

export default function ApprovalsPage() {
  const [tab, setTab] = useState<TabKind>('store');
  const [stores, setStores] = useState<Application[]>([]);
  const [riders, setRiders] = useState<Application[]>([]);
  const [products, setProducts] = useState<{ pending: Product[]; imageChanges: Product[]; edits: Product[] }>({ pending: [], imageChanges: [], edits: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [storesRes, ridersRes, productsRes] = await Promise.all([
        fetch('/api/approvals/stores'),
        fetch('/api/approvals/riders'),
        fetch('/api/approvals/products'),
      ]);
      if (!storesRes.ok || !ridersRes.ok || !productsRes.ok) throw new Error('Could not load applications.');
      setStores(await storesRes.json());
      setRiders(await ridersRes.json());
      const productGroups = (await productsRes.json()) as { pending: Product[]; imageChanges: Product[]; edits?: Product[] };
      setProducts({ ...productGroups, edits: productGroups.edits ?? [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  // Live-refresh the instant a store/rider submits (or an approval/rejection
  // lands) — the SSE stream fires on writes to the onboarding-draft/users
  // tables, so a new application shows up here without a manual refresh.
  useAdminRealtime(load);

  // Polling fallback — realtime only fires when the supabase_realtime
  // publication includes the draft tables (migrations/043) AND Realtime is
  // enabled on the Supabase project. If either isn't set up yet, this still
  // keeps the list current every 10s so the page always updates on its own.
  useEffect(() => {
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [load]);

  const applications = tab === 'store' ? stores : riders;
  const productCount = products.pending.length + products.imageChanges.length + products.edits.length;
  const pendingCount = tab === 'product' ? productCount : applications.filter((a) => a.status === 'pending').length;

  function tabCount(kind: TabKind): number {
    if (kind === 'product') return productCount;
    return (kind === 'store' ? stores : riders).filter((a) => a.status === 'pending').length;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-medium text-ink">Approvals</h1>
        <p className="text-sm text-muted">Review and approve new store and rider applications.</p>
      </div>

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">
          {error} —{' '}
          <button type="button" onClick={load} className="underline">
            retry
          </button>
        </p>
      )}

      <div className="flex items-center gap-1 self-start rounded-full border border-border bg-card p-1">
        {TABS.map((t) => {
          const count = tabCount(t.kind);
          const active = tab === t.kind;
          return (
            <button
              key={t.kind}
              type="button"
              onClick={() => setTab(t.kind)}
              className={clsx(
                'flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium transition-colors',
                active ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink',
              )}
            >
              {t.label}
              {count > 0 && (
                <span
                  className={clsx(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    active ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700',
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-ink">
            {tab === 'store' ? 'Store applications' : tab === 'rider' ? 'Rider applications' : 'Product approvals'}
          </h3>
          <span className="text-xs text-muted">{pendingCount} pending</span>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted">Loading…</p>
        ) : tab === 'product' ? (
          productCount === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Nothing awaiting review.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {products.pending.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">New products</p>
                  {products.pending.map((p) => (
                    <ProductReviewRow key={p.id} product={p} mode="new" onDone={load} />
                  ))}
                </div>
              )}
              {products.imageChanges.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Image changes</p>
                  {products.imageChanges.map((p) => (
                    <ProductReviewRow key={p.id} product={p} mode="image" onDone={load} />
                  ))}
                </div>
              )}
              {products.edits.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Name &amp; price changes</p>
                  {products.edits.map((p) => (
                    <ProductReviewRow key={p.id} product={p} mode="changes" onDone={load} />
                  ))}
                </div>
              )}
            </div>
          )
        ) : applications.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No applications yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {applications.map((app) => (
              <ApplicationRow key={app.id} application={app} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
