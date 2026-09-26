'use client';

import { useEffect, useMemo, useState } from 'react';
import { Boxes, Package, PackageX, ShieldAlert } from 'lucide-react';
import { createProduct, fetchMyProducts, updateProduct, type PartnerProduct, type ProductInput } from '@/lib/partnerApi';
import { DEMO_PRODUCTS } from '@/lib/demoProducts';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { StatTile } from '@/components/ui/StatTile';
import { ProductForm } from '@/components/ProductForm';
import { InventoryFilterBar, type StockFilter } from '@/components/inventory/InventoryFilterBar';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { InventoryToolbar, type SortKey } from '@/components/inventory/InventoryToolbar';

type Editing = { mode: 'create' } | { mode: 'edit'; product: PartnerProduct } | null;

// DUMMY month-over-month deltas for the stat strip. There's no product-count
// history table yet, so these are placeholders (same "UI exists, data not
// wired" convention as the rest of the dashboard). Wire to a real snapshot
// once inventory history is tracked. Signs match tone: out-of-stock / pending
// rising is bad (invertTone on those tiles flips the pill red).
const INVENTORY_TRENDS = { total: 3.4, inStock: 5.1, outOfStock: 12.5, pending: 8.0 };

export default function InventoryPage() {
  const [products, setProducts] = useState<PartnerProduct[]>([]);
  // Local-only override for demo rows: editing a demo product must never
  // hit the real /partner/products/:id endpoint (that id doesn't exist
  // server-side), so its change is applied here instead. Same pattern as
  // the Orders detail page's demo-order override.
  const [demoProducts, setDemoProducts] = useState(DEMO_PRODUCTS);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<Editing>(null);
  const [filter, setFilter] = useState<StockFilter>('all');
  const [search, setSearch] = useState('');
  const [showStats, setShowStats] = useState(true);
  const [showFilter, setShowFilter] = useState(true);
  const [sort, setSort] = useState<SortKey>('name');

  function reload() {
    return fetchMyProducts().then(setProducts);
  }

  useEffect(() => {
    reload().finally(() => setIsLoading(false));
  }, []);

  // DEMO DATA — this store has zero real products, so the table/filters/
  // stat strip would render entirely empty. Same isDemo convention as
  // Overview/Orders: shown only while products.length === 0, and replaced
  // outright the instant a real product is added (isDemo flips false on
  // the next reload(), demo rows are dropped rather than merged).
  const isDemo = !isLoading && products.length === 0;
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

  return (
    <div className="flex flex-col gap-6">
      <InventoryToolbar
        showStats={showStats}
        onToggleStats={() => setShowStats((v) => !v)}
        showFilter={showFilter}
        onToggleFilter={() => setShowFilter((v) => !v)}
        sort={sort}
        onSortChange={setSort}
        onExport={handleExport}
        onAddProduct={() => setEditing({ mode: 'create' })}
      />

      {showStats && (
        <div className="grid grid-cols-2 divide-x divide-y divide-hairline overflow-hidden rounded-xl border border-hairline md:grid-cols-4 md:divide-y-0">
          <StatTile label="Total products" value={String(counts.all)} icon={Boxes} deltaPercent={INVENTORY_TRENDS.total} />
          <StatTile label="In stock" value={String(counts.in_stock)} icon={Package} deltaPercent={INVENTORY_TRENDS.inStock} />
          <StatTile label="Out of stock" value={String(counts.out_of_stock)} icon={PackageX} deltaPercent={INVENTORY_TRENDS.outOfStock} invertTone />
          <StatTile label="Pending approval" value={String(counts.pending)} icon={ShieldAlert} deltaPercent={INVENTORY_TRENDS.pending} invertTone />
        </div>
      )}

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

      {showFilter && (
        <InventoryFilterBar filter={filter} onFilterChange={setFilter} search={search} onSearchChange={setSearch} counts={counts} />
      )}

      {isLoading ? (
        <Card className="py-20 text-center text-sm text-neutral-400">Loading inventory…</Card>
      ) : (
        <InventoryTable products={filtered} onEdit={(product) => setEditing({ mode: 'edit', product })} />
      )}
    </div>
  );
}

function isDuplicateProductName(products: PartnerProduct[], name: string, excludeProductId?: string): boolean {
  const normalized = name.trim().toLowerCase();
  return products.some((p) => p.id !== excludeProductId && p.name.trim().toLowerCase() === normalized);
}

// Demo rows never touch the real backend, so this mirrors what
// backend/src/lib/products.ts's toProductRow + toVariantRows do server-side:
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
    })),
  };
}
