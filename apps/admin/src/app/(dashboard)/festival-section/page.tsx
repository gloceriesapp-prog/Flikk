'use client';

// Festival Section — the one admin-curated shelf behind apps/customer's
// FestivalPicksSection.tsx (Home "All" tab, above "Shops Near You"),
// currently hardcoded to dummyFestivalProducts.ts. A founder edits the
// title, toggles it live, and picks real products from Inventory to show
// there — same "curated shelf of real rows" idea as Home Categories'
// tiles, just referencing real products instead of a name+image pair.
//
// Singleton screen, not a list — migrations/018_festival_section.sql's own
// note: one row is all this needs (single zone, one live festival at a
// time). Reorder is plain up/down buttons, not drag-and-drop — the shelf
// caps at 6 real cards on the customer app (FestivalPicksSection.tsx), a
// short list doesn't need a DnD library to reorder.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Search, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { fetchProducts } from '@/lib/supabase/products';
import type { Product } from '@/lib/types';

interface FestivalProductLink {
  id: string;
  sort_order: number;
  products: { id: string; name: string; price: number; unit: string; image_url: string | null } | null;
}

interface FestivalSection {
  id: string;
  title: string;
  is_active: boolean;
  products: FestivalProductLink[];
}

export default function FestivalSectionPage() {
  const [section, setSection] = useState<FestivalSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [sectionRes, products] = await Promise.all([fetch('/api/festival-section'), fetchProducts()]);
      const data: FestivalSection | null = sectionRes.ok ? await sectionRes.json() : null;
      setSection(data);
      setTitle(data?.title ?? '');
      setIsActive(data?.is_active ?? false);
      setAllProducts(products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the festival section.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const pickedIds = useMemo(() => new Set((section?.products ?? []).map((p) => p.products?.id)), [section]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allProducts.filter((p) => !pickedIds.has(p.id) && p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, allProducts, pickedIds]);

  async function handleSaveDetails() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/festival-section', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: section?.id, title, is_active: isActive }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddProduct(productId: string) {
    if (!section) return;
    const res = await fetch('/api/festival-section/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ festival_section_id: section.id, product_id: productId }),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? 'Could not add that product.');
      return;
    }
    setQuery('');
    await load();
  }

  async function handleRemove(linkId: string) {
    await fetch(`/api/festival-section/products/${linkId}`, { method: 'DELETE' });
    await load();
  }

  async function handleMove(link: FestivalProductLink, direction: -1 | 1) {
    if (!section) return;
    const sorted = [...section.products].sort((a, b) => a.sort_order - b.sort_order);
    const index = sorted.findIndex((l) => l.id === link.id);
    const swapWith = sorted[index + direction];
    if (!swapWith) return;

    await Promise.all([
      fetch(`/api/festival-section/products/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: swapWith.sort_order }),
      }),
      fetch(`/api/festival-section/products/${swapWith.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: link.sort_order }),
      }),
    ]);
    await load();
  }

  const sortedProducts = [...(section?.products ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Festival Section</h1>
        <p className="text-sm text-muted">The curated product row on Home&apos;s All tab, above &quot;Shops Near You&quot;.</p>
      </div>

      {error && <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-muted">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Ganesh Chaturthi Special"
              className="w-full rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </div>

          <label className="flex items-center gap-2 pb-2.5 text-sm font-medium text-ink">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-border" />
            Live on Home
          </label>

          <button
            type="button"
            onClick={handleSaveDetails}
            disabled={saving || !title.trim()}
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {section && (
        <div className="rounded-3xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink">Products ({sortedProducts.length})</h2>

          <div className="relative mb-4">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products to add…"
              className="w-full rounded-xl border border-border bg-canvas py-2.5 pl-9 pr-3.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
            {searchResults.length > 0 && (
              <div className="absolute z-10 mt-1.5 w-full rounded-xl border border-border bg-card shadow-lg">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAddProduct(p.id)}
                    className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-accent"
                  >
                    <span className="text-ink">{p.name}</span>
                    <span className="flex items-center gap-2 text-xs text-muted">
                      {formatCurrency(p.price)}
                      <Plus size={14} />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {sortedProducts.map((link, i) => (
              <div key={link.id} className="flex items-center gap-3 rounded-2xl bg-[#F9FAFB] px-3.5 py-3">
                <div className="flex flex-col gap-0.5">
                  <button type="button" onClick={() => handleMove(link, -1)} disabled={i === 0} className="text-muted disabled:opacity-20">
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(link, 1)}
                    disabled={i === sortedProducts.length - 1}
                    className="text-muted disabled:opacity-20"
                  >
                    <ArrowDown size={13} />
                  </button>
                </div>

                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">{link.products?.name ?? 'Deleted product'}</p>
                  <p className="text-xs text-muted">
                    {link.products ? `${formatCurrency(link.products.price)} · ${link.products.unit}` : ''}
                  </p>
                </div>

                <button type="button" onClick={() => handleRemove(link.id)} className="text-muted hover:text-danger">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}

            {sortedProducts.length === 0 && <p className="py-6 text-center text-sm text-muted">No products picked yet — search above to add some.</p>}
          </div>
        </div>
      )}

      {!section && (
        <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted">
          Save a title above to create the section, then come back here to add products.
        </p>
      )}
    </div>
  );
}
