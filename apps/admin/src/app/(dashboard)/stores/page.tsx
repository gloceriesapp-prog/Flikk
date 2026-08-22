'use client';

// Store management — the live roster (PRD A1/FR19's "active stores"
// half; the pending half lives on /approvals). Search + zone filter, same
// interaction language as OrdersTable's status pills.

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Search, Store as StoreIcon } from 'lucide-react';
import { PLACEHOLDER_STORES } from '@/lib/mock-data';

export default function StoresPage() {
  const [query, setQuery] = useState('');
  const filtered = PLACEHOLDER_STORES.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Stores</h1>
        <p className="text-sm text-muted">{PLACEHOLDER_STORES.length} active stores across the zone.</p>
      </div>

      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 sm:max-w-sm">
        <Search size={15} className="text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stores…"
          className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
        />
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        {filtered.map((store) => (
          <Link
            key={store.id}
            href={`/stores/${store.id}`}
            className="group flex items-center gap-4 border-b border-border py-4 last:border-0"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent">
              <StoreIcon size={16} className="text-ink-soft" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink group-hover:underline">{store.name}</p>
              <p className="text-xs text-muted">
                {store.category} · {store.district}
              </p>
            </div>
            <span
              className={
                store.isActive
                  ? 'rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-success'
                  : 'rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-danger'
              }
            >
              {store.isActive ? 'Open' : 'Deactivated'}
            </span>
            <ChevronRight size={15} className="shrink-0 text-muted" />
          </Link>
        ))}
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted">No stores match “{query}”.</p>}
      </div>
    </div>
  );
}
