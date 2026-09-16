'use client';

import { useEffect, useMemo, useState } from 'react';
import { Boxes, Package, PackageX, Plus, ShieldAlert } from 'lucide-react';
import { createProduct, fetchMyProducts, updateProduct, type PartnerProduct, type ProductInput } from '@/lib/partnerApi';
import { DEMO_PRODUCTS } from '@/lib/demoProducts';
import { StatCard } from '@/components/StatCard';
import { ProductForm } from '@/components/ProductForm';
import { InventoryFilterBar, type StockFilter } from '@/components/inventory/InventoryFilterBar';
import { InventoryTable } from '@/components/inventory/InventoryTable';

type Editing = { mode: 'create' } | { mode: 'edit'; product: PartnerProduct } | null;

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
      throw new Error(`"${input.name}" already exists — edit that product to add another size instead of creating a duplicate.`);
    }

    if (editing?.mode === 'edit') {
      if (isDemo) {
        setDemoProducts((prev) => prev.map((p) => (p.id === editing.product.id ? applyInputToDemoProduct(p, input) : p)));
        setEditing(null);
        return;
      }
      await updateProduct(editing.product.id, input);
    } else {
      await createProduct(input);
    }
    await reload();
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
    if (!q) return byFilter;
    return byFilter.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [sourceProducts, filter, search]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black">Inventory</h1>
          <p className="mt-1 text-sm text-neutral-400">Everything your store has listed, in one place.</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing({ mode: 'create' })}
          className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          <Plus size={16} /> Add product
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total products" value={String(counts.all)} icon={Boxes} iconClassName="bg-neutral-100 text-neutral-600" />
        <StatCard label="In stock" value={String(counts.in_stock)} icon={Package} iconClassName="bg-emerald-50 text-emerald-600" />
        <StatCard label="Out of stock" value={String(counts.out_of_stock)} icon={PackageX} iconClassName="bg-red-50 text-red-600" />
        <StatCard label="Pending approval" value={String(counts.pending)} icon={ShieldAlert} iconClassName="bg-amber-50 text-amber-600" />
      </div>

      {editing && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="mb-4 text-base font-semibold text-black">
            {editing.mode === 'create' ? 'New product' : `Edit ${editing.product.name}`}
          </p>
          <ProductForm
            initial={editing.mode === 'edit' ? editing.product : undefined}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      <InventoryFilterBar filter={filter} onFilterChange={setFilter} search={search} onSearchChange={setSearch} counts={counts} />

      {isLoading ? (
        <div className="rounded-2xl border border-neutral-200 bg-white py-20 text-center text-sm text-neutral-400">Loading inventory…</div>
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
