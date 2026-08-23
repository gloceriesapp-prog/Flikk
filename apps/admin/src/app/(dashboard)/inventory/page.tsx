'use client';

// Inventory — cross-store catalog view for the founder: what every store
// stocks, priced, and how much of it is left, plus what customers will
// see (this is the same content the customer app lists, so name/price
// layout has to stay clean, never overlapping). Category AND store
// filters, both starting on "All" — "All" also sorts cheapest-first, the
// one sort a founder scanning the whole catalog actually wants. Editing
// is admin-local only (Product's own note in lib/types.ts) — no
// customer-app write-through logic here.

import { useMemo, useState } from 'react';
import { ChevronDown, IndianRupee, Pencil, Plus, Search } from 'lucide-react';
import clsx from 'clsx';
import { formatNumber } from '@/lib/format';
import { PLACEHOLDER_PRODUCTS, PLACEHOLDER_STORES } from '@/lib/mock-data';
import type { Product, StockStatus } from '@/lib/types';
import { EditProductModal } from '@/components/inventory/EditProductModal';
import { AddProductModal } from '@/components/inventory/AddProductModal';

const STOCK_STYLES: Record<StockStatus, string> = {
  in_stock: 'bg-green-50 text-success',
  low_stock: 'bg-amber-50 text-amber-700',
  out_of_stock: 'bg-red-50 text-danger',
};

const STOCK_LABELS: Record<StockStatus, string> = {
  in_stock: 'In stock',
  low_stock: 'Low stock',
  out_of_stock: 'Out of stock',
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>(PLACEHOLDER_PRODUCTS);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [storeId, setStoreId] = useState('all');
  const [editing, setEditing] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map((p) => p.category)))], [products]);

  // Store options carry place alongside name — a founder picking a store
  // out of a dropdown of 20+ across a zone needs the district to tell two
  // "Kirana Store"s apart, same as PLACEHOLDER_STORES already shows on
  // /stores.
  const storeOptions = useMemo(() => {
    const storeIdsWithProducts = new Set(products.map((p) => p.storeId));
    return PLACEHOLDER_STORES.filter((s) => storeIdsWithProducts.has(s.id));
  }, [products]);

  // Same product listed by more than one store shows once, at the
  // cheapest store's price — this list is exactly what the customer app's
  // home/catalog screen pulls from, and a customer only ever sees one
  // Onion, priced at whoever sells it cheapest. Only collapses across
  // stores when viewing "All stores" — picking one store on purpose means
  // seeing that store's own listing, price included, not the cheapest
  // elsewhere.
  const storeCountByName = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      const key = p.name.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [products]);

  function dedupeCheapest(list: Product[]): Product[] {
    const cheapestByName = new Map<string, Product>();
    for (const p of list) {
      const key = p.name.toLowerCase();
      const current = cheapestByName.get(key);
      if (!current || p.price < current.price) cheapestByName.set(key, p);
    }
    return Array.from(cheapestByName.values());
  }

  const filtered = (() => {
    const base = products.filter((p) => {
      const matchesCategory = category === 'All' || p.category === category;
      const matchesStore = storeId === 'all' || p.storeId === storeId;
      const matchesQuery =
        p.name.toLowerCase().includes(query.trim().toLowerCase()) ||
        p.storeName.toLowerCase().includes(query.trim().toLowerCase());
      return matchesCategory && matchesStore && matchesQuery;
    });
    const deduped = storeId === 'all' ? dedupeCheapest(base) : base;
    return deduped.sort((a, b) => (category === 'All' ? a.price - b.price : 0));
  })();

  function handleSave(updated: Product) {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setEditing(null);
  }

  function handleAdd(newProduct: Product) {
    setProducts((prev) => [...prev, newProduct]);
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium text-ink">Inventory</h1>
          <p className="text-sm text-muted">{products.length} products listed across every store in the zone.</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus size={15} />
          Add product
        </button>
      </div>

      {/* Search on the left, both filters as dropdowns on the right —
          category has real range now (Vegetables/Dairy/Pharmacy/…), too
          many to stay as a pill row without wrapping awkwardly, so it
          gets the same dropdown treatment as store. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 sm:max-w-sm sm:flex-1">
          <Search size={15} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products or stores…"
            className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="appearance-none rounded-full bg-accent py-2 pl-3.5 pr-8 text-xs font-semibold text-ink-soft focus:outline-none focus:ring-2 focus:ring-ink/10"
            >
              <option value="all">All stores</option>
              {storeOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.district}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          </div>

          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="appearance-none rounded-full bg-accent py-2 pl-3.5 pr-8 text-xs font-semibold text-ink-soft focus:outline-none focus:ring-2 focus:ring-ink/10"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {filtered.map((product) => (
          <div key={product.id} className="flex items-center gap-4 rounded-3xl border border-border bg-card p-3 pr-4">
            {/* Random placeholder photo, seeded by product id so it stays
                stable across re-renders — no upload pipeline yet, this is
                the "image" slot until one exists. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://picsum.photos/seed/${product.id}/160/160`}
              alt={product.name}
              className="h-20 w-20 shrink-0 rounded-2xl object-cover"
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p title={product.name} className="truncate text-base font-semibold text-ink">
                    {product.name}
                  </p>
                  <p title={product.storeName} className="truncate text-sm text-muted">
                    {product.storeName}
                  </p>
                </div>
                <span className={clsx('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold', STOCK_STYLES[product.stockStatus])}>
                  {STOCK_LABELS[product.stockStatus]}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-ink">
                  <IndianRupee size={14} className="shrink-0" />
                  <span className="text-base font-semibold tabular-nums">{formatNumber(product.price)}</span>
                  {storeId === 'all' && (storeCountByName.get(product.name.toLowerCase()) ?? 1) > 1 && (
                    <span className="text-[11px] font-medium text-muted">
                      cheapest of {storeCountByName.get(product.name.toLowerCase())} stores
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(product)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-ink-soft hover:bg-accent hover:text-ink"
                >
                  <Pencil size={12} />
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-muted">
            No products match “{query}” in {category}.
          </p>
        )}
      </div>

      {editing && <EditProductModal product={editing} onClose={() => setEditing(null)} onSave={handleSave} />}
      {adding && <AddProductModal existingProducts={products} onClose={() => setAdding(false)} onAdd={handleAdd} />}
    </div>
  );
}
