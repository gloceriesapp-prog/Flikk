'use client';

// Sidebar search (GET /api/search): orders by number / id / customer name or
// phone, customers by name or phone, stores by name / owner / phone. Results
// link to each detail page. ⌘K / Ctrl+K focuses the box from anywhere.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

interface Hit { id: string; label: string; detail: string }
interface Results { orders: Hit[]; customers: Hit[]; stores: Hit[] }

const GROUPS: { key: keyof Results; title: string; href: (id: string) => string }[] = [
  { key: 'orders', title: 'Orders', href: (id) => `/orders/${id}` },
  { key: 'customers', title: 'Customers', href: (id) => `/customers/${id}` },
  { key: 'stores', title: 'Stores', href: (id) => `/stores/${id}` },
];

export function SidebarSearch({ focusSignal }: { focusSignal: number }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // The collapsed rail's search button expands the sidebar, then asks for focus.
  useEffect(() => { if (focusSignal > 0) inputRef.current?.focus(); }, [focusSignal]);

  useEffect(() => {
    function onDown(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal, cache: 'no-store' });
        if (!res.ok) throw new Error();
        setResults(await res.json());
        setError(false);
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [q]);

  const term = q.trim();
  const hits = term.length >= 2 && results ? GROUPS.filter((g) => results[g.key].length > 0) : [];

  function clear() {
    setQ('');
    setResults(null);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative mb-5">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
        <Search size={14} className="text-muted" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); if (e.target.value.trim().length < 2) setResults(null); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Escape') { clear(); inputRef.current?.blur(); } }}
          placeholder="Search"
          aria-label="Search orders, customers and stores"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
        />
        <kbd className="rounded-md border border-border bg-canvas px-1.5 py-0.5 text-[10px] font-semibold text-muted">⌘K</kbd>
      </div>
      {open && term.length >= 2 && (
        <div className="absolute left-0 right-0 top-12 z-50 max-h-96 overflow-y-auto rounded-2xl border border-border bg-card p-2 shadow-lg">
          {error ? (
            <p className="px-3 py-3 text-sm text-danger">Search failed. Try again.</p>
          ) : !results ? (
            <p className="px-3 py-3 text-sm text-muted">Searching…</p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted">No orders, customers or stores match “{term}”.</p>
          ) : (
            hits.map((group) => (
              <div key={group.key} className="py-1">
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{group.title}</p>
                {results[group.key].map((hit) => (
                  <Link key={hit.id} href={group.href(hit.id)} onClick={clear} className="block rounded-xl px-3 py-2 hover:bg-canvas">
                    <span className="block truncate text-sm font-medium text-ink">{hit.label}</span>
                    {hit.detail && <span className="block truncate text-xs text-muted">{hit.detail}</span>}
                  </Link>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
