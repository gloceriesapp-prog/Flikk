'use client';

// Edit surface for one product — admin-local state only (see Product's own
// note in lib/types.ts: no POS sync, no customer-app write-through). Every
// field a founder can eyeball on the card is editable here, including the
// emoji stand-in for a real photo.

import { useState } from 'react';
import { X } from 'lucide-react';
import type { Product, StockStatus } from '@/lib/types';
import { FRESHNESS_TAG_PRESETS } from '@/lib/mock-data';

const STOCK_OPTIONS: { value: StockStatus; label: string }[] = [
  { value: 'in_stock', label: 'In stock' },
  { value: 'low_stock', label: 'Low stock' },
  { value: 'out_of_stock', label: 'Out of stock' },
];

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

export function EditProductModal({
  product,
  onClose,
  onSave,
}: {
  product: Product;
  onClose: () => void;
  onSave: (updated: Product) => void;
}) {
  const [draft, setDraft] = useState<Product>(product);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Edit product</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <input
              value={draft.imageEmoji}
              onChange={(e) => setDraft({ ...draft, imageEmoji: e.target.value.slice(0, 2) })}
              className={`${FIELD_CLASS} w-16 text-center text-xl`}
              aria-label="Image (emoji)"
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

          <input
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            className={FIELD_CLASS}
            placeholder="Category"
            aria-label="Category"
          />

          <input
            value={draft.storeName}
            onChange={(e) => setDraft({ ...draft, storeName: e.target.value })}
            className={FIELD_CLASS}
            placeholder="Store"
            aria-label="Store"
          />

          <div className="flex gap-3">
            <input
              type="number"
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
              className={FIELD_CLASS}
              placeholder="Price"
              aria-label="Price"
            />
            <input
              value={draft.unit}
              onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Unit"
              aria-label="Unit"
            />
          </div>

          {/* Same fields the customer app's ProductCard reads — see
              Product's own note in lib/types.ts. */}
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
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
