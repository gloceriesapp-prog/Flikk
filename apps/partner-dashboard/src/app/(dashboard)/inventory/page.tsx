'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Boxes, Package, PackageSearch, PackageX, Plus, ShieldAlert } from 'lucide-react';
import { createProduct, fetchProductPage, updateProduct, type PartnerProduct, type ProductInput } from '@/lib/partnerApi';
import { DEMO_PRODUCTS } from '@/lib/demoProducts';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { ProductForm } from '@/components/ProductForm';
import { INVENTORY_FILTERS, InventoryFilterBar, type StockFilter } from '@/components/inventory/InventoryFilterBar';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { InventoryToolbar, type SortKey } from '@/components/inventory/InventoryToolbar';
import { MetricCard, MetricGrid } from '@/components/inventory/MetricCard';
import { BUTTON, EmptyState, ErrorState, MetricGridSkeleton, RowsSkeleton } from '@/components/inventory/DataStates';
import { DEMO_DATA_ENABLED } from '@/lib/demoMode';

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
  const [products, setProducts] = useState<PartnerProduct[]>([]);
  // Local-only override for demo rows: editing a demo product must never
  // hit the real /partner/products/:id endpoint (that id doesn't exist
  // server-side), so its change is applied here instead. Same pattern as
  // the Orders detail page's demo-order override.
  const [demoProducts, setDemoProducts] = useState(DEMO_PRODUCTS);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<Editing>(null);
  const [filter, setFilter] = useStockFilter();
  const [search, setSearch] = useState('');
  const [showStats, setShowStats] = useState(true);
  const [showFilter, setShowFilter] = useState(true);
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

  // DEMO DATA — this store has zero real products, so the table/filters/
  // stat strip would render entirely empty. Same isDemo convention as
  // Overview/Orders: shown only while products.length === 0, and replaced
  // outright the instant a real product is added (isDemo flips false on
  // the next reload(), demo rows are dropped rather than merged).
  const isDemo = DEMO_DATA_ENABLED && !error && !search.trim() && filter === 'all' && !isLoading && products.length === 0;
  const sourceProducts = isDemo ? demoProducts : products;

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
        if (isDemo) {
          setDemoProducts((prev) => prev.map((p) => (p.id === editing.product.id ? applyInputToDemoProduct(p, input) : p)));
        } else {
          await updateProduct(editing.product.id, input);
          await reload();
        }
      } else {
        await createProduct(input);
        await reload();
      }
    } catch (err) {
      toast.error(isEdit ? 'Could not update the product. Try again.' : 'Could not add the product. Try again.');
      throw err; // keep the inline message in the form too
    }
    toast.success(isEdit ? `“${input.name}” updated` : `“${input.name}” added`);
    setEditing(null);
  }

  const counts = useMemo(() => {
    const result = { all: sourceProducts.length } as Record<StockFilter, number>;
    result.in_stock = sourceProducts.filter((p) => p.is_in_stock).length;
    result.out_of_stock = sourceProducts.filter((p) => !p.is_in_stock).length;
    result.pending = sourceProducts.filter((p) => p.approval_status === 'pending').length;
    return result;
  }, [sourceProducts]);

  const filtered = useMemo(() => {
    let byFilter = sourceProducts;
    if (filter === 'in_stock') byFilter = sourceProducts.filter((p) => p.is_in_stock);
    if (filter === 'out_of_stock') byFilter = sourceProducts.filter((p) => !p.is_in_stock);
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
    body = <InventoryTable products={filtered} onEdit={(product) => setEditing({ mode: 'edit', product })} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <InventoryToolbar
        showStats={showStats}
        onToggleStats={() => setShowStats((v) => !v)}
        showFilter={showFilter}
        onToggleFilter={() => setShowFilter((v) => !v)}
        sort={sort}
        onSortChange={setSort}
        onExport={handleExport}
        onAddProduct={openCreate}
      />

      {showStats && !(error && products.length === 0) && (isLoading ? (
        <MetricGridSkeleton />
      ) : (
        <MetricGrid>
          <MetricCard label="Loaded products" value={counts.all} icon={Boxes} tone="blue" />
          <MetricCard label="Loaded in stock" value={counts.in_stock} icon={Package} tone="green" />
          <MetricCard label="Loaded out of stock" value={counts.out_of_stock} icon={PackageX} tone="red" />
          <MetricCard label="Loaded pending approval" value={counts.pending} icon={ShieldAlert} tone="amber" />
        </MetricGrid>
      ))}

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
        <div className="p-4 sm:p-5">
          {showFilter ? (
            <InventoryFilterBar filter={filter} onFilterChange={setFilter} search={search} onSearchChange={setSearch} counts={counts} />
          ) : (
            <div className="flex items-baseline gap-2">
              <h2 className="text-lg font-semibold text-ink">Products</h2>
              {!isLoading && !error && <span className="tnum text-sm text-slate-400">{filtered.length}</span>}
            </div>
          )}
        </div>
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

// Demo rows never touch the real backend, so this mirrors what
// backend/src/lib/products.ts's toProductRow + save_catalogue_product do server-side:
// variants[0] is the default, its price/unit denormalize onto the product
// itself, and is_in_stock follows stockStatus (a DB trigger does this for
// real products — there's no trigger here, so it's done by hand).
function applyInputToDemoProduct(product: PartnerProduct, input: ProductInput): PartnerProduct {
  const [defaultVariant] = input.variants;
  return {
    ...product,
    name: input.name,
    category: input.category,
    image_url: input.imageUrl ?? product.image_url,
    is_veg: input.isVeg ?? product.is_veg,
    stock_status: input.stockStatus,
    stock_quantity: input.variants.reduce((sum, v) => sum + (v.stockQuantity ?? 0), 0),
    is_in_stock: input.stockStatus !== 'out_of_stock',
    price: defaultVariant.price,
    original_price: defaultVariant.originalPrice ?? null,
    product_variants: input.variants.map((v, i) => ({
      id: product.product_variants[i]?.id ?? `${product.id}-v${i}`,
      unit_type: v.unitType,
      quantity: v.quantity,
      price: v.price,
      original_price: v.originalPrice ?? null,
      is_default: i === 0,
      stock_quantity: v.stockQuantity ?? null,
    })),
  };
}
