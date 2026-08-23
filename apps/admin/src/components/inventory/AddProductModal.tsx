'use client';

// Add-product surface — same field set as EditProductModal, plus the one
// check that matters here: a store can't list the same product twice
// (name match is case/whitespace-insensitive, scoped to the chosen store
// only — Onion at two different stores is the normal cheapest-wins case,
// Onion twice at the same store is a data-entry mistake). Admin-local
// state only, same as edit — no customer-app write-through.

import { useState } from 'react';
import { X } from 'lucide-react';
import type { Product, StockStatus } from '@/lib/types';
import { PLACEHOLDER_STORES } from '@/lib/mock-data';

const STOCK_OPTIONS: { value: StockStatus; label: string }[] = [
  { value: 'in_stock', label: 'In stock' },
  { value: 'low_stock', label: 'Low stock' },
  { value: 'out_of_stock', label: 'Out of stock' },
];

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

const EMPTY_DRAFT = {
  name: '',
  category: '',
  storeId: PLACEHOLDER_STORES[0]?.id ?? '',
  price: 0,
  unit: '',
  stockStatus: 'in_stock' as StockStatus,
  imageEmoji: '📦',
};

export function AddProductModal({
  existingProducts,
  onClose,
  onAdd,
}: {
  existingProducts: Product[];
  onClose: () => void;
  onAdd: (product: Product) => void;
}) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    const name = draft.name.trim();
    const store = PLACEHOLDER_STORES.find((s) => s.id === draft.storeId);
    if (!name || !store) return;

    const alreadyListed = existingProducts.some(
      (p) => p.storeId === draft.storeId && p.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (alreadyListed) {
      setError(`${name} is already listed in ${store.name}.`);
      return;
    }

    onAdd({
      id: `pr-${Date.now()}`,
      name,
      category: draft.category.trim() || 'Uncategorized',
      storeName: store.name,
      storeId: store.id,
      price: draft.price,
      unit: draft.unit.trim() || 'unit',
      stockStatus: draft.stockStatus,
      imageEmoji: draft.imageEmoji,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Add product</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <select
            value={draft.storeId}
            onChange={(e) => {
              setError(null);
              setDraft({ ...draft, storeId: e.target.value });
            }}
            className={FIELD_CLASS}
            aria-label="Store"
          >
            {PLACEHOLDER_STORES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.district}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-3">
            <input
              value={draft.imageEmoji}
              onChange={(e) => setDraft({ ...draft, imageEmoji: e.target.value.slice(0, 2) })}
              className={`${FIELD_CLASS} w-16 text-center text-xl`}
              aria-label="Image (emoji)"
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
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            className={FIELD_CLASS}
            placeholder="Category"
            aria-label="Category"
          />

          <div className="flex gap-3">
            <input
              type="number"
              value={draft.price || ''}
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
            onClick={handleAdd}
            disabled={!draft.name.trim()}
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
