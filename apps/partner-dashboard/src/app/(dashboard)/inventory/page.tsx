'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Package, PackageSearch, Plus } from 'lucide-react';
import { createProduct, deleteProduct, fetchProductPage, fetchInventoryOverview, updateProduct, type PartnerProduct, type ProductInput } from '@/lib/partnerApi';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { ProductForm } from '@/components/ProductForm';
import { INVENTORY_FILTERS, InventoryFilterBar, type StockFilter } from '@/components/inventory/InventoryFilterBar';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { InventoryToolbar, type SortKey } from '@/components/inventory/InventoryToolbar';
import { InventoryOverview } from '@/components/inventory/InventoryOverview';
import { useLiveData } from '@/lib/useLiveData';
import { BUTTON, EmptyState, ErrorState, RowsSkeleton } from '@/components/inventory/DataStates';

type Editing = { mode: 'create' } | { mode: 'edit'; product: PartnerProduct } | null;

// The stock filter lives in ?stock= so the sidebar's Inventory sub-menu can
// link straight to it. useSearchParams must sit under a Suspense boundary, or
// a production build bails the route out of prerendering.
export default function InventoryPage() {
  return (
    <Suspense fallback={null}>
      <InventoryScreen />
    </Suspense>
  );
}

function useStockFilter(): [StockFilter, (next: StockFilter) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = searchParams.get('stock');
  const filter = INVENTORY_FILTERS.find((f) => f.key === raw)?.key ?? 'all';
  const setFilter = useCallback(
    (next: StockFilter) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === 'all') params.delete('stock');
      else params.set('stock', next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );
  return [filter, setFilter];
}

function InventoryScreen() {
  const overview = useLiveData(fetchInventoryOverview, 60_000);
  const [products, setProducts] = useState<PartnerProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<PartnerProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deletePending = useRef(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [filter, setFilter] = useStockFilter();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('name');

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const requestVersion = useRef(0);
  const morePending = useRef(false);

  async function reload() {
    const version = ++requestVersion.current;
    setIsLoading(true);
    try {
      const page = await fetchProductPage({ q: search, stock: filter });
      if (version !== requestVersion.current) return;
      setProducts(page.items);
      setNextCursor(page.nextCursor);
      setLastUpdated(new Date());
      setError(null);
    } catch {
      if (version === requestVersion.current) setError('Could not refresh inventory. Showing the last loaded items.');
    } finally {
      if (version === requestVersion.current) setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => { void reload(); }, 300);
    return () => { clearTimeout(timer); requestVersion.current += 1; };
    // The request generation fences old searches and unmount responses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filter]);

  async function loadMore() {
    if (!nextCursor || morePending.current || isLoading) return;
    morePending.current = true;
    setLoadingMore(true);
    const version = requestVersion.current;
    try {
      const page = await fetchProductPage({ cursor: nextCursor, q: search, stock: filter });
      if (version !== requestVersion.current) return;
      setProducts((current) => [...current, ...page.items.filter((item) => !current.some((row) => row.id === item.id))]);
      setNextCursor(page.nextCursor);
      setError(null);
    } catch {
      if (version === requestVersion.current) setError('Could not load more items. Please retry.');
    } finally {
      morePending.current = false;
      setLoadingMore(false);
    }
  }

  function retryLoad() {
    void reload();
  }

  const sourceProducts = products;

  async function handleSubmit(input: ProductInput) {
    // A store owner can't list the same product twice under two rows —
    // that's what a size/variant is for (Onion 500 g + 1 kg is one row,
    // never two). Match is case/whitespace-insensitive and excludes the
    // row being edited, same rule the partner mobile app's own catalog
    // enforces (apps/partner/src/screens/catalog/data.ts's
    // isDuplicateProductName).
    const excludeId = editing?.mode === 'edit' ? editing.product.id : undefined;
    if (isDuplicateProductName(sourceProducts, input.name, excludeId)) {
      // Thrown, not toasted — ProductForm shows it inline next to the field.
      throw new Error(`"${input.name}" already exists — edit that product to add another size instead of creating a duplicate.`);
    }

    const isEdit = editing?.mode === 'edit';
    try {
      if (editing?.mode === 'edit') {
        await updateProduct(editing.product.id, input);
        await reload();
      } else {
        await createProduct(input);
        await reload();
      }
    } catch (err) {
      toast.error(isEdit ? 'Could not update the product. Try again.' : 'Could not add the product. Try again.');
      throw err; // keep the inline message in the form too
    }
    void overview.refetch();
    toast.success(isEdit ? `“${input.name}” updated` : `“${input.name}” added`);
    setEditing(null);
  }

  async function confirmDelete() {
    if (!deleteTarget || deletePending.current) return;
    deletePending.current = true;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      toast.success('Product deleted');
      await Promise.all([reload(), overview.refetch()]);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not delete this product. Try again.');
    } finally {
      deletePending.current = false;
      setDeleting(false);
    }
  }

  const counts = useMemo(() => {
    if (overview.data) {
      const totals = overview.data;
      return { all: totals.total, in_stock: totals.total - totals.outOfStock, out_of_stock: totals.outOfStock, low_stock: totals.runningLow, pending: totals.pending };
    }
    const result = { all: sourceProducts.length } as Record<StockFilter, number>;
    result.in_stock = sourceProducts.filter((p) => p.is_in_stock).length;
    result.out_of_stock = sourceProducts.filter((p) => !p.is_in_stock).length;
    result.low_stock = sourceProducts.filter(isRunningLow).length;
    result.pending = sourceProducts.filter((p) => p.approval_status === 'pending').length;
    return result;
  }, [sourceProducts, overview.data]);

  const filtered = useMemo(() => {
    let byFilter = sourceProducts;
    if (filter === 'in_stock') byFilter = sourceProducts.filter((p) => p.is_in_stock);
    if (filter === 'out_of_stock') byFilter = sourceProducts.filter((p) => !p.is_in_stock);
    if (filter === 'low_stock') byFilter = sourceProducts.filter(isRunningLow);
    if (filter === 'pending') byFilter = sourceProducts.filter((p) => p.approval_status === 'pending');

    const q = search.trim().toLowerCase();
    const bySearch = !q
      ? byFilter
      : byFilter.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));

    return [...bySearch].sort((a, b) => {
      if (sort === 'stock') return Number(b.is_in_stock) - Number(a.is_in_stock);
      if (sort === 'price_high') return b.price - a.price;
      if (sort === 'price_low') return a.price - b.price;
      return a.name.localeCompare(b.name);
    });
  }, [sourceProducts, filter, search, sort]);

  // Export the currently-shown rows to a CSV the owner can open in Excel/
  // Sheets. Values quoted + inner quotes doubled so a comma or quote in a
  // product name can't shift columns. Client-only (Blob + object URL) — no
  // new dep, no endpoint.
  function handleExport() {
    const header = ['Name', 'Category', 'Price', 'In stock', 'Approval'];
    const rows = filtered.map((p) => [
      p.name,
      p.category,
      String(p.price),
      p.is_in_stock ? 'Yes' : 'No',
      p.approval_status,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const openCreate = () => setEditing({ mode: 'create' });
  const hasFilters = filter !== 'all' || search.trim() !== '';

  let body: ReactNode;
  if (isLoading && products.length === 0) {
    body = <RowsSkeleton rows={6} />;
  } else if (error && products.length === 0) {
    body = <ErrorState title="Couldn’t load your products" onRetry={retryLoad} />;
  } else if (sourceProducts.length === 0 && !hasFilters) {
    body = (
      <EmptyState
        icon={Package}
        title="No products yet"
        description="Add your first product so customers nearby can order it."
        action={
          <button type="button" onClick={openCreate} className={BUTTON.primary}>
            <Plus size={16} /> Add product
          </button>
        }
      />
    );
  } else if (filtered.length === 0) {
    body = (
      <EmptyState
        icon={PackageSearch}
        title="No products match this view"
        description="Try a different filter or search term."
        action={
          hasFilters && (
            <button
              type="button"
              onClick={() => {
                setFilter('all');
                setSearch('');
              }}
              className={BUTTON.secondary}
            >
              Clear filters
            </button>
          )
        }
      />
    );
  } else {
    body = <InventoryTable products={filtered} onEdit={(product) => setEditing({ mode: 'edit', product })} onDelete={(product) => { setDeleteError(null); setDeleteTarget(product); }} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <InventoryOverview data={overview.data} onSelect={(next) => { setSearch(''); setFilter(next); }} />
      {!!overview.error && <p role="alert" className="text-sm text-slate-600">Could not refresh inventory totals. <button type="button" onClick={() => void overview.refetch()} className="font-semibold underline">Retry</button></p>}
      <InventoryToolbar
        sort={sort}
        onSortChange={setSort}
        onExport={handleExport}
        onAddProduct={openCreate}
      >
        <InventoryFilterBar filter={filter} onFilterChange={setFilter} search={search} onSearchChange={setSearch} counts={counts} />
      </InventoryToolbar>


      <Modal open={!!deleteTarget} onClose={() => { if (!deletePending.current) setDeleteTarget(null); }} title="Delete product?">
        <p className="text-sm leading-6 text-gray-600">Delete <strong className="text-gray-950">{deleteTarget?.name}</strong> from your catalogue? This cannot be undone. Products with past orders cannot be deleted; mark them out of stock instead.</p>
        {deleteError && <p role="alert" className="mt-3 text-sm text-red-600">{deleteError}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={deleting} onClick={() => setDeleteTarget(null)} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50">Cancel</button>
          <button type="button" disabled={deleting} onClick={() => void confirmDelete()} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{deleting ? 'Deleting…' : 'Delete product'}</button>
        </div>
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.mode === 'edit' ? `Edit ${editing.product.name}` : 'New product'}
      >
        {editing && (
          <ProductForm
            initial={editing.mode === 'edit' ? editing.product : undefined}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      {error && products.length > 0 && <div role="alert" className="flex items-center justify-between rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}<button onClick={retryLoad} className="font-semibold underline">Retry</button></div>}
      {lastUpdated && <p className="text-sm text-neutral-500">{products.length} loaded · Updated {lastUpdated.toLocaleTimeString()} · Export includes loaded items</p>}
      <Card className="overflow-hidden">
        {body}
      </Card>
      {nextCursor && <button disabled={loadingMore || isLoading} onClick={() => void loadMore()} className="self-center rounded-xl border border-hairline px-6 py-3 font-semibold disabled:opacity-50">{loadingMore ? 'Finding more items…' : 'Load more items'}</button>}
    </div>
  );
}

function isDuplicateProductName(products: PartnerProduct[], name: string, excludeProductId?: string): boolean {
  const normalized = name.trim().toLowerCase();
  return products.some((p) => p.id !== excludeProductId && p.name.trim().toLowerCase() === normalized);
}

function isRunningLow(product: PartnerProduct): boolean {
  return product.stock_tracking_enabled === true && product.is_in_stock && product.stock_quantity != null && product.stock_quantity > 0 && product.stock_quantity < 5;
}
