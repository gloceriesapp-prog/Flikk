'use client';

// Inventory — cross-store catalog view for the founder: what every store
// stocks, priced, and how much of it is left, plus what customers will
// see (this is the same content the customer app lists, so name/price
// layout has to stay clean, never overlapping). Category AND store
// filters, both starting on "All" — "All" also sorts cheapest-first, the
// one sort a founder scanning the whole catalog actually wants.
//
// Products and stores are both real Supabase reads (lib/supabase/products.ts,
// anon key, covered by public RLS) — no dummy/placeholder inventory. Add/
// Edit write through app/api/products/* (service-role, see that route's own
// note on why) and this page refetches the full list afterward rather than
// optimistically patching local state, so it never drifts from what's
// actually in the DB.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, Home, Image as ImageIcon, IndianRupee, Pencil, Plus, Search, Trash2, X } from '@/components/icons';
import clsx from 'clsx';
import { formatNumber } from '@/lib/format';
import type { NewProductInput, Product, StockStatus } from '@/lib/types';
import { fetchProducts, fetchStoreOptions, type StoreOption } from '@/lib/supabase/products';
import { EditProductModal } from '@/components/inventory/EditProductModal';
import { ShowOnHomeModal } from '@/components/home/ShowOnHomeModal';
import { saveProductHomeSections } from '@/components/home/HomeSectionChecklist';
import { toast } from '@/components/ui/Toast';
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
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [storeId, setStoreId] = useState('all');
  const [editing, setEditing] = useState<Product | null>(null);
  const [showingOnHome, setShowingOnHome] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);
  // Two-step inline delete: first click arms, second click (while armed)
  // commits — no window.confirm. deleteError surfaces the 409 per row.
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<{ id: string; message: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const [productList, storeList] = await Promise.all([fetchProducts(), fetchStoreOptions()]);
      setProducts(productList);
      setStores(storeList);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load inventory from Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Promise.resolve().then(...) rather than calling loadData() directly —
    // loadData's first line (setLoadError(null)) is a setState call, and
    // this repo's react-hooks lint rule flags any setState that happens
    // synchronously within an effect's own call stack (cascading-render
    // risk). Deferring the call to a microtask moves that setState outside
    // the effect's synchronous execution without changing behavior —
    // fetchProducts/fetchStoreOptions were already async regardless.
    Promise.resolve().then(loadData);
  }, [loadData]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map((p) => p.category)))], [products]);

  // Store options carry district alongside name — a founder picking a store
  // out of a dropdown of 20+ across a zone needs the district to tell two
  // "Kirana Store"s apart. Only stores that actually have a product listed
  // show up in this filter (the Add/Edit modals get the full `stores` list
  // instead, since a store with zero products yet still needs to be
  // pickable there).
  const storeFilterOptions = useMemo(() => {
    const storeIdsWithProducts = new Set(products.map((p) => p.storeId));
    return stores.filter((s) => storeIdsWithProducts.has(s.id));
  }, [products, stores]);

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

  async function handleSave(updated: Product, homeKeys: string[] | null) {
    const res = await fetch(`/api/products/${updated.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? 'Save failed.');
    }
    if (homeKeys) await saveProductHomeSections(updated.id, homeKeys);
    await loadData();
    setEditing(null);
  }

  async function handleApproval(id: string, approve: boolean) {
    const res = await fetch(`/api/products/${id}/approval`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approve }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? 'Could not update approval status.');
    }
    await loadData();
  }

  async function handleDelete(id: string) {
    // First click arms, second click (while armed) commits.
    if (confirmingDelete !== id) {
      setConfirmingDelete(id);
      setDeleteError(null);
      return;
    }
    setDeleting(id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setDeleteError({ id, message: body?.error ?? 'Could not delete product.' });
        return;
      }
      await loadData();
    } catch {
      setDeleteError({ id, message: 'Could not delete product.' });
    } finally {
      setDeleting(null);
      setConfirmingDelete(null);
    }
  }

  async function handleAdd(newProduct: NewProductInput, homeKeys: string[]) {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? 'Add failed.');
    }
    const created = (await res.json()) as Product;
    await loadData();
    setAdding(false);
    // The product exists now; a failed pick must not look like a failed add.
    if (homeKeys.length > 0) {
      try {
        await saveProductHomeSections(created.id, homeKeys);
        toast.success('Product added', `Picked in ${homeKeys.length} Home section${homeKeys.length === 1 ? '' : 's'}.`);
      } catch (err) {
        toast.error('Product added, but not placed on Home', err instanceof Error ? err.message : undefined);
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="text-sm text-muted">
            {loading ? 'Loading…' : `${products.length} products listed across every store in the zone.`}
          </p>
        </div>
        <Link href="/inventory-pack-stock" className="ml-auto rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-ink">Set available packs</Link>
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={loading || stores.length === 0}
          className="flex shrink-0 items-center gap-1.5 rounded-[10px] bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 hover:bg-brand-strong"
        >
          <Plus size={15} />
          Add product
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
              {storeFilterOptions.map((s) => (
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
          <div key={product.id} className="flex items-center gap-4 card p-3 pr-4">
            {/* Real photo (product.imageUrl, set via Add/EditProductModal's
                ProductImageUpload -> Supabase Storage) when one's been
                uploaded — no random stock-photo fallback; a product with no
                photo shows an icon placeholder, same convention as Stores'
                own list, rather than a picsum image that isn't the actual
                product. bgColor (lib/bgColor.ts) is a pastel tint extracted
                from the photo itself, so a no-background product shot sits
                on a color pulled from its own image instead of a flat
                white or mismatched tile — object-contain, not cover, so a
                transparent-bg photo isn't cropped to fill the square. */}
            {product.imageUrl ? (
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: product.bgColor ?? '#F6FAF0' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.imageUrl} alt={product.name} className="h-full w-full rounded-2xl object-contain p-1.5" />
              </div>
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-accent">
                <ImageIcon size={22} className="text-muted" />
              </div>
            )}

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
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={clsx('rounded-full px-2.5 py-1 text-[11px] font-semibold', STOCK_STYLES[product.stockStatus])}>
                    {STOCK_LABELS[product.stockStatus]}
                  </span>
                  {product.approvalStatus === 'pending' && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                      Pending approval
                    </span>
                  )}
                  {product.approvalStatus === 'rejected' && (
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-danger">Rejected</span>
                  )}
                  {/* Partner name/price edit to this live product, awaiting
                      review on Approvals → Products (migration 115). */}
                  {product.pendingChanges && (
                    <Link href="/approvals" className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:underline">
                      Edit in review
                    </Link>
                  )}
                </div>
              </div>

              {/* Only a store owner's own submission (partner app's POST/
                  PATCH /partner/products) ever lands 'pending' — this
                  dashboard's own Add product always inserts 'approved'
                  directly, so this row never shows for anything added
                  from here. */}
              {product.approvalStatus === 'pending' && (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleApproval(product.id, true)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-success px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    <Check size={13} />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleApproval(product.id, false)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-border px-3 py-1.5 text-xs font-semibold text-danger hover:bg-red-50"
                  >
                    <X size={13} />
                    Reject
                  </button>
                </div>
              )}

              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-ink">
                  <IndianRupee size={14} className="shrink-0" />
                  <span className="text-base font-semibold tabular-nums">{formatNumber(product.price)}</span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-xs text-muted line-through tabular-nums">{formatNumber(product.originalPrice)}</span>
                  )}
                  {storeId === 'all' && (storeCountByName.get(product.name.toLowerCase()) ?? 1) > 1 && (
                    <span className="text-[11px] font-medium text-muted">
                      cheapest of {storeCountByName.get(product.name.toLowerCase())} stores
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {/* discount% = ((MRP − price) / MRP) × 100, rounded — only
                      shown when originalPrice is a real MRP above price
                      (same guard as the struck-through MRP itself). */}
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-danger">
                      {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowingOnHome(product)}
                    className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] border border-border text-ink-soft hover:bg-accent hover:text-ink"
                    aria-label={`Show ${product.name} on home`}
                    title="Show on home"
                  >
                    <Home size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(product)}
                    className="flex items-center gap-1.5 rounded-[10px] border border-border px-3.5 py-1.5 text-xs font-semibold text-ink-soft hover:bg-accent hover:text-ink"
                  >
                    <Pencil size={12} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(product.id)}
                    disabled={deleting === product.id}
                    className={clsx(
                      'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold disabled:opacity-40',
                      confirmingDelete === product.id
                        ? 'border-danger bg-red-50 text-danger'
                        : 'border-border text-ink-soft hover:bg-accent hover:text-danger',
                    )}
                    aria-label={`Delete ${product.name}`}
                  >
                    <Trash2 size={12} />
                    {confirmingDelete === product.id ? (deleting === product.id ? 'Deleting…' : 'Confirm') : 'Delete'}
                  </button>
                </div>
              </div>
              {deleteError?.id === product.id && (
                <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-medium text-danger">{deleteError.message}</p>
              )}
            </div>
          </div>
        ))}

        {!loading && filtered.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-muted">
            {products.length === 0 ? 'No products yet — add the first one.' : `No products match “${query}” in ${category}.`}
          </p>
        )}
      </div>

      {showingOnHome && <ShowOnHomeModal product={showingOnHome} onClose={() => setShowingOnHome(null)} />}
      {editing && <EditProductModal product={editing} stores={stores} onClose={() => setEditing(null)} onSave={handleSave} />}
      {adding && (
        <AddProductModal stores={stores} existingProducts={products} onClose={() => setAdding(false)} onAdd={handleAdd} />
      )}
    </div>
  );
}
