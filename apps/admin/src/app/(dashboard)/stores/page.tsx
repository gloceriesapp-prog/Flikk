'use client';

// Store management — the live roster (PRD A1/FR19's "active stores"
// half; the pending half lives on /approvals). Search, real Supabase read
// (lib/supabase/stores.ts, anon key, public RLS) — no dummy/placeholder
// roster. "+ Add store" sits at the title's right end (same convention as
// Inventory's own "Add product") and opens AddStoreModal, which POSTs to
// app/api/stores (service-role write, see that route's own note); this
// page refetches the full list afterward rather than patching local state.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { Pencil, Clock, MapPin, Plus, Search, Store as StoreIcon } from 'lucide-react';
import type { NewStoreInput, Store } from '@/lib/types';
import { fetchStores } from '@/lib/supabase/stores';
import { AddStoreModal } from '@/components/stores/AddStoreModal';

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      setStores(await fetchStores());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load stores from Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred to a microtask — see inventory/page.tsx's own note on why
    // (react-hooks/set-state-in-effect: loadData's first line is a setState
    // call).
    Promise.resolve().then(loadData);
  }, [loadData]);

  // /stores?new=1 (TopNav's "Add Store" on Overview) opens the Add store
  // form directly; the flag is dropped from the URL so a reload doesn't
  // reopen it.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new') !== '1') return;
    window.history.replaceState(null, '', window.location.pathname);
    Promise.resolve().then(() => setAdding(true));
  }, []);

  const filtered = stores.filter((s) => [s.name, s.ownerName, s.phone, s.city, s.district].some(value => value.toLowerCase().includes(query.trim().toLowerCase())));

  async function handleAdd(newStore: NewStoreInput) {
    const res = await fetch('/api/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStore),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? 'Add failed.');
    }
    await loadData();
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink">Stores</h1>
          <p className="text-sm text-muted">{loading ? 'Loading…' : `${stores.length} stores · ${stores.filter(store => store.isActive).length} active`}</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus size={15} />
          Add store
        </button>
      </div>

      {loadError && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">
          {loadError} —{' '}
          <button type="button" onClick={loadData} className="underline">
            retry
          </button>
        </p>
      )}

      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 sm:max-w-sm">
        <Search size={15} className="text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, owner, phone or place…"
          className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {filtered.map((store) => (
          <Link
            key={store.id}
            href={`/stores/${store.id}`}
            className="group flex items-center gap-4 rounded-3xl border border-border bg-card p-4 pr-5 transition hover:border-ink/15 hover:shadow-sm"
          >
            {store.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={store.photoUrl}
                alt=""
                className="h-16 w-16 shrink-0 rounded-2xl border border-border object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-border bg-accent">
                <StoreIcon size={22} className="text-ink-soft" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-base font-semibold text-ink group-hover:underline">{store.name}</p>
                <span
                  className={clsx(
                    'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                    store.isActive ? 'bg-green-50 text-success' : 'bg-red-50 text-danger'
                  )}
                  title={store.adminSuspended ? (store.suspendedReason ?? undefined) : undefined}
                >
                  {store.adminSuspended ? 'Suspended' : store.isActive ? 'Open' : 'Closed'}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs font-medium text-muted">{store.category}</p>

              <div className="mt-2 flex flex-col gap-1 text-xs text-muted">
                <span className="flex items-center gap-1.5 truncate">
                  <MapPin size={12} className="shrink-0" />
                  <span className="truncate">
                    {store.addressLine ? `${store.addressLine}, ` : ''}
                    {store.city}
                    {store.state ? `, ${store.state}` : ''}
                  </span>
                </span>
                {(store.openTime || store.closeTime) && (
                  <span className="flex items-center gap-1.5">
                    <Clock size={12} className="shrink-0" />
                    {store.openTime} – {store.closeTime}
                  </span>
                )}
              </div>
            </div>

            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 py-2 text-xs font-semibold text-ink-soft"><Pencil size={13} /><span className="hidden sm:inline">Edit store</span></span>
          </Link>
        ))}
        {!loading && filtered.length === 0 && (
          <p className="col-span-full rounded-3xl border border-border bg-card py-8 text-center text-sm text-muted">
            {stores.length === 0 ? 'No stores yet — add the first one.' : `No stores match "${query}".`}
          </p>
        )}
      </div>

      {adding && <AddStoreModal onClose={() => setAdding(false)} onAdd={handleAdd} />}
    </div>
  );
}
