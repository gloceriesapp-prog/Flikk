'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { createProduct, fetchMyProducts, updateProduct, type PartnerProduct, type ProductInput } from '@/lib/partnerApi';
import { formatInr } from '@/lib/format';
import { ProductForm } from '@/components/ProductForm';
import clsx from 'clsx';

type Editing = { mode: 'create' } | { mode: 'edit'; product: PartnerProduct } | null;

export default function InventoryPage() {
  const [products, setProducts] = useState<PartnerProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<Editing>(null);

  function reload() {
    return fetchMyProducts().then(setProducts);
  }

  useEffect(() => {
    reload().finally(() => setIsLoading(false));
  }, []);

  async function handleSubmit(input: ProductInput) {
    if (editing?.mode === 'edit') {
      await updateProduct(editing.product.id, input);
    } else {
      await createProduct(input);
    }
    await reload();
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Inventory</h1>
          <p className="mt-1 text-sm text-neutral-500">{products.length} products</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing({ mode: 'create' })}
          className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white"
        >
          <Plus size={16} /> Add product
        </button>
      </div>

      {editing && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="mb-4 text-sm font-semibold text-neutral-900">
            {editing.mode === 'create' ? 'New product' : `Edit ${editing.product.name}`}
          </p>
          <ProductForm
            initial={editing.mode === 'edit' ? editing.product : undefined}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-neutral-400">No products yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div key={product.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex gap-3">
                {product.image_url ? (
                  <img src={product.image_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-xl bg-neutral-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-900">{product.name}</p>
                  <p className="text-xs text-neutral-400">{product.category}</p>
                  <p className="mt-1 text-sm font-medium text-neutral-900">{formatInr(product.price)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
                <span
                  className={clsx(
                    'rounded-full px-2.5 py-1 text-xs font-medium',
                    product.is_in_stock ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
                  )}
                >
                  {product.is_in_stock ? 'In stock' : 'Out of stock'}
                </span>
                <button
                  type="button"
                  onClick={() => setEditing({ mode: 'edit', product })}
                  className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
