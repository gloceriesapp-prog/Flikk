'use client';

// Add-product surface — same field set as EditProductModal, plus the one
// check that matters here: a store can't list the same product twice
// (name match is case/whitespace-insensitive, scoped to the chosen store
// only — Onion at two different stores is the normal cheapest-wins case,
// Onion twice at the same store is a data-entry mistake). onAdd is async —
// InventoryPage POSTs to /api/products (service-role write, see that
// route's own note) and refetches the live list; this modal just shows a
// submitting state and surfaces whatever error comes back.
//
// Category is a fixed dropdown (PRODUCT_CATEGORIES) and price/unit are
// replaced by a real per-size variant list (ProductVariantsEditor) — see
// that component's own note on the Blinkit/Instamart pricing model this
// follows.

import { useState } from 'react';
import { X } from 'lucide-react';
import type { NewProductInput, Product, StockStatus } from '@/lib/types';
import { FRESHNESS_TAG_PRESETS } from '@/lib/mock-data';
import type { StoreOption } from '@/lib/supabase/products';
import { PRODUCT_CATEGORIES } from '@/lib/product-options';
import { formatVariantUnit } from '@/lib/productValidation';
import { ProductImageUpload } from './ProductImageUpload';
import { ProductVariantsEditor, emptyVariant } from './ProductVariantsEditor';
import { SubCategoryPicker } from './SubCategoryPicker';

const STOCK_OPTIONS: { value: StockStatus; label: string }[] = [
  { value: 'in_stock', label: 'In stock' },
  { value: 'low_stock', label: 'Low stock' },
  { value: 'out_of_stock', label: 'Out of stock' },
];

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

function makeEmptyDraft(stores: StoreOption[]) {
  return {
    name: '',
    localName: '',
    category: PRODUCT_CATEGORIES[0] as string,
    description: '',
    storeId: stores[0]?.id ?? '',
    variants: [emptyVariant()],
    stockStatus: 'in_stock' as StockStatus,
    imageUrl: undefined as string | undefined,
    bgColor: undefined as string | undefined,
    subCategoryId: undefined as string | undefined,
    isVeg: true,
    freshnessTag: '',
  };
}

export function AddProductModal({
  stores,
  existingProducts,
  onClose,
  onAdd,
}: {
  stores: StoreOption[];
  existingProducts: Product[];
  onClose: () => void;
  onAdd: (product: NewProductInput) => Promise<void>;
}) {
  const [draft, setDraft] = useState(() => makeEmptyDraft(stores));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd() {
    const name = draft.name.trim();
    const store = stores.find((s) => s.id === draft.storeId);
    if (!name || !store) return;

    const alreadyListed = existingProducts.some(
      (p) => p.storeId === draft.storeId && p.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (alreadyListed) {
      setError(`${name} is already listed in ${store.name}.`);
      return;
    }

    const defaultVariant = draft.variants[0];
    if (!defaultVariant) return;

    setSubmitting(true);
    setError(null);
    try {
      await onAdd({
        name,
        localName: draft.localName.trim() || undefined,
        category: draft.category,
        description: draft.description.trim() || undefined,
        storeId: store.id,
        // Denormalized from the default (first) variant — see
        // lib/productValidation.ts toProductRow, which the API route
        // recomputes server-side from `variants` anyway; these just keep
        // NewProductInput's shape satisfied.
        price: defaultVariant.price,
        originalPrice: defaultVariant.originalPrice,
        unit: formatVariantUnit(defaultVariant),
        variants: draft.variants,
        stockStatus: draft.stockStatus,
        imageUrl: draft.imageUrl,
        bgColor: draft.bgColor,
        subCategoryId: draft.subCategoryId,
        isVeg: draft.isVeg,
        freshnessTag: draft.freshnessTag || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add product — try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h3 className="text-lg font-semibold text-ink">Add product</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-5">
          <select
            value={draft.storeId}
            onChange={(e) => {
              setError(null);
              setDraft({ ...draft, storeId: e.target.value });
            }}
            className={FIELD_CLASS}
            aria-label="Store"
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.district}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-3">
            <ProductImageUpload
              imageUrl={draft.imageUrl}
              onChange={(imageUrl, bgColor) => setDraft({ ...draft, imageUrl, bgColor: bgColor ?? undefined })}
            />
            <input
              value={draft.name}
              onChange={(e) => {
                setError(null);
                setDraft({ ...draft, name: e.target.value });
              }}
              className={FIELD_CLASS}
              placeholder="Product name"
              aria-label="Product name"
            />
          </div>

          <input
            value={draft.localName}
            onChange={(e) => setDraft({ ...draft, localName: e.target.value })}
            className={FIELD_CLASS}
            placeholder="Local name (e.g. Eerulli) — optional"
            aria-label="Local name"
          />

          <select
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            className={FIELD_CLASS}
            aria-label="Category"
          >
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className={`${FIELD_CLASS} min-h-[72px] resize-none`}
            placeholder="Description — optional"
            aria-label="Description"
          />

          <ProductVariantsEditor variants={draft.variants} onChange={(variants) => setDraft({ ...draft, variants })} />

          <SubCategoryPicker value={draft.subCategoryId} onChange={(subCategoryId) => setDraft({ ...draft, subCategoryId })} />

          {/* Same fields the customer app's ProductCard reads — see
              Product's own note in lib/types.ts. */}
          <div className="flex items-center gap-2 rounded-xl border border-border p-1">
            <button
              type="button"
              onClick={() => setDraft({ ...draft, isVeg: true })}
              className={`flex-1 rounded-lg py-1.5 text-sm font-medium ${draft.isVeg ? 'bg-success/10 text-success' : 'text-muted'}`}
            >
              Veg
            </button>
            <button
              type="button"
              onClick={() => setDraft({ ...draft, isVeg: false })}
              className={`flex-1 rounded-lg py-1.5 text-sm font-medium ${!draft.isVeg ? 'bg-danger/10 text-danger' : 'text-muted'}`}
            >
              Non-veg
            </button>
          </div>

          <select
            value={draft.freshnessTag}
            onChange={(e) => setDraft({ ...draft, freshnessTag: e.target.value })}
            className={FIELD_CLASS}
            aria-label="Freshness tag"
          >
            <option value="">No freshness tag</option>
            {FRESHNESS_TAG_PRESETS.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>

          <select
            value={draft.stockStatus}
            onChange={(e) => setDraft({ ...draft, stockStatus: e.target.value as StockStatus })}
            className={FIELD_CLASS}
            aria-label="Stock status"
          >
            {STOCK_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-danger">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!draft.name.trim() || submitting}
            className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            {submitting ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
