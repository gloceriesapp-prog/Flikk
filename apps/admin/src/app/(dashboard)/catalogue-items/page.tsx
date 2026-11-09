'use client';

// Pending items: progress on the master item list (catalogue_items, from the
// supermarket catalogue sheet). Totals and a bar per main section, then the
// items themselves: still to add (no product yet), added, or needing a
// category. Items are added from Products → Add product, where typing a name
// suggests them.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from '@/components/icons';
import type { CatalogueItem, CatalogueProgressRow } from '@/lib/catalogueItems';

type Status = 'pending' | 'added' | 'needs-category';
const TABS: { key: Status; label: string }[] = [
  { key: 'pending', label: 'Still to add' },
  { key: 'added', label: 'Added' },
  { key: 'needs-category', label: 'Needs category' },
];
const NEEDS_CATEGORY = 'Needs category';
const nf = new Intl.NumberFormat('en-IN');

interface Page { items: CatalogueItem[]; total: number; page: number; pageSize: number; summary: CatalogueProgressRow[] }

export default function CatalogueItemsPage() {
  const [status, setStatus] = useState<Status>('pending');
  const [section, setSection] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search waits for a pause in typing.
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search); setPage(0); }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ status, page: String(page) });
    if (section) params.set('section', section);
    if (query.trim()) params.set('q', query.trim());
    const res = await fetch(`/api/catalogue-items?${params}`);
    const body = await res.json().catch(() => null);
    if (!res.ok) { setError(body?.error ?? 'Could not load items.'); return; }
    setError(null);
    setData(body as Page);
  }, [status, section, query, page]);
  // Deferred to a microtask, as on the Categories and Products pages
  // (react-hooks/set-state-in-effect).
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const summary = data?.summary ?? [];
  const filed = summary.filter((r) => r.sectionName !== NEEDS_CATEGORY);
  const total = filed.reduce((n, r) => n + r.total, 0);
  const added = filed.reduce((n, r) => n + r.added, 0);
  const needsCategory = summary.find((r) => r.sectionName === NEEDS_CATEGORY)?.total ?? 0;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Pending items</h1>
          <p className="text-sm text-muted">Items from the catalogue sheet. An item is added once a product with a photo is created from it on <Link href="/inventory" className="font-medium text-ink underline">Products</Link>.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Items', value: total },
          { label: 'Added', value: added },
          { label: 'Still to add', value: total - added },
          { label: 'Needs category', value: needsCategory },
        ].map((card) => (
          <div key={card.label} className="card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{nf.format(card.value)}</p>
          </div>
        ))}
      </div>

      {filed.length > 0 && (
        <div className="card grid grid-cols-1 gap-x-8 gap-y-3 p-4 md:grid-cols-2">
          {filed.map((row) => {
            const pct = row.total ? Math.round((row.added / row.total) * 100) : 0;
            return (
              <button key={row.sectionName} type="button" onClick={() => { setSection(row.sectionName); setStatus('pending'); setPage(0); }}
                className="flex flex-col gap-1 text-left">
                <span className="flex justify-between text-sm"><span className="font-medium text-ink">{row.sectionName}</span>
                  <span className="text-muted">{nf.format(row.added)} / {nf.format(row.total)} · {pct}%</span></span>
                <span className="h-1.5 w-full overflow-hidden rounded-full bg-accent"><span className="block h-full rounded-full bg-brand" style={{ width: `${pct}%` }} /></span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-full bg-accent p-1">
          {TABS.map((tab) => (
            <button key={tab.key} type="button" onClick={() => { setStatus(tab.key); setPage(0); }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${status === tab.key ? 'bg-card text-ink shadow-sm' : 'text-muted'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        {status !== 'needs-category' && (
          <select value={section} onChange={(e) => { setSection(e.target.value); setPage(0); }} aria-label="Section"
            className="rounded-full border border-border bg-card px-4 py-2 text-sm text-ink">
            <option value="">All sections</option>
            {filed.map((r) => <option key={r.sectionName} value={r.sectionName}>{r.sectionName}</option>)}
          </select>
        )}
        <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
          <Search size={16} className="text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items…" aria-label="Search items"
            className="w-full bg-transparent text-sm text-ink focus:outline-none" />
        </label>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">{error} — <button type="button" onClick={() => void load()} className="underline">retry</button></p>}

      <div className="card divide-y divide-border">
        {!data ? (
          <p className="p-6 text-center text-sm text-muted">Loading…</p>
        ) : data.items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">No items here.</p>
        ) : data.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{item.name}</p>
              <p className="truncate text-xs text-muted">{item.subCategoryName ? `${item.sectionName} › ${item.categoryName} › ${item.subCategoryName}` : NEEDS_CATEGORY}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${item.added ? 'bg-success-soft text-success' : 'bg-accent text-muted'}`}>
              {item.added ? 'Added' : item.subCategoryName ? 'To add' : 'Unfiled'}
            </span>
          </div>
        ))}
      </div>

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>{nf.format(data.total)} items · page {page + 1} of {nf.format(pages)}</span>
          <div className="flex gap-2">
            <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-full border border-border px-4 py-1.5 disabled:opacity-40">Previous</button>
            <button type="button" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-full border border-border px-4 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
