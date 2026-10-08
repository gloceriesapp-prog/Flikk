'use client';

// Edit surface for one product — every field a founder can eyeball on the
// card is editable here, including the real product photo
// (ProductImageUpload) and the full per-size variant list. onSave is
// async — InventoryPage PATCHes /api/products/[id] (service-role write,
// see that route's own note) and refetches the live list; this modal just
// shows a submitting state and surfaces whatever error comes back.

import { useState } from 'react';
import { X } from 'lucide-react';
import type { Product, StockStatus } from '@/lib/types';
import { FRESHNESS_TAG_PRESETS } from '@/lib/mock-data';
import type { StoreOption } from '@/lib/supabase/products';
import { categoryHasVegToggle, PRODUCT_CATEGORIES } from '@/lib/product-options';
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

export function EditProductModal({
  product,
  stores,
  onClose,
  onSave,
}: {
  product: Product;
  stores: StoreOption[];
  onClose: () => void;
  onSave: (updated: Product) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Product>({
    ...product,
    variants: product.variants.length > 0 ? product.variants : [emptyVariant()],
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    const defaultVariant = draft.variants[0];
    if (!defaultVariant) return;
    // Same rule as Add: every size needs a counted stock to be orderable.
    if (draft.variants.some((v) => v.stockQuantity == null)) {
      setError('Enter packs in stock for every size (0 if none).');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSave({
        ...draft,
        // Kept in sync with variants[0] — see lib/productValidation.ts
        // toProductRow, which the API route recomputes server-side anyway.
        price: defaultVariant.price,
        originalPrice: defaultVariant.originalPrice,
        unit: formatVariantUnit(defaultVariant),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes — try again.');
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
          <h3 className="text-lg font-semibold text-ink">Edit product</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-5">
          <div className="flex items-center gap-3">
            <ProductImageUpload
              imageUrl={draft.imageUrl}
              onChange={(imageUrl, bgColor) => setDraft({ ...draft, imageUrl, bgColor: bgColor ?? draft.bgColor })}
            />
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Product name"
              aria-label="Product name"
            />
          </div>

          <input
            value={draft.localName ?? ''}
            onChange={(e) => setDraft({ ...draft, localName: e.target.value || undefined })}
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
            {!PRODUCT_CATEGORIES.includes(draft.category as (typeof PRODUCT_CATEGORIES)[number]) && (
              <option value={draft.category}>{draft.category}</option>
            )}
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <textarea
            value={draft.description ?? ''}
            onChange={(e) => setDraft({ ...draft, description: e.target.value || undefined })}
            className={`${FIELD_CLASS} min-h-[72px] resize-none`}
            placeholder="Description — optional"
            aria-label="Description"
          />

          <select
            value={draft.storeId}
            onChange={(e) => {
              const store = stores.find((s) => s.id === e.target.value);
              if (!store) return;
              setDraft({ ...draft, storeId: store.id, storeName: store.name });
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

          <ProductVariantsEditor category={draft.category} variants={draft.variants} onChange={(variants) => setDraft({ ...draft, variants })} />

          <SubCategoryPicker value={draft.subCategoryId} onChange={(subCategoryId) => setDraft({ ...draft, subCategoryId })} />

          {/* Same field the customer app's ProductCard reads — see
              Product's own note in lib/types.ts. Only shown for
              categories where veg/non-veg is a real distinction (meat/
              fish, dairy/eggs) — per an explicit ask. */}
          {categoryHasVegToggle(draft.category) && (
            <div className="flex items-center gap-2 rounded-xl border border-border p-1">
              <button
                type="button"
                onClick={() => setDraft({ ...draft, isVeg: true })}
                className={`flex-1 rounded-lg py-1.5 text-sm font-medium ${draft.isVeg !== false ? 'bg-success/10 text-success' : 'text-muted'}`}
              >
                Veg
              </button>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, isVeg: false })}
                className={`flex-1 rounded-lg py-1.5 text-sm font-medium ${draft.isVeg === false ? 'bg-danger/10 text-danger' : 'text-muted'}`}
              >
                Non-veg
              </button>
            </div>
          )}

          <select
            value={draft.freshnessTag ?? ''}
            onChange={(e) => setDraft({ ...draft, freshnessTag: e.target.value || undefined })}
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
            onClick={handleSave}
            disabled={submitting}
            className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
