'use client';

// Flavours of one product (product_options): Bingo Mad Angles in Achaari
// Masti, Tomato Madness... Each has its own photo and name and sells at the
// product's own sizes and prices. Customers pick one next to the size and
// quantity; the order line keeps the flavour (backend migration 20261105120000).

import { useLayoutEffect, useRef } from 'react';
import { Plus, X } from '@/components/icons';
import type { ProductOption } from '@/lib/types';
import { MAX_EXTRA_IMAGES, MAX_PRODUCT_OPTIONS } from '@/lib/productValidation';
import { ProductImageUpload } from './ProductImageUpload';
import { ProductGalleryEditor } from './ProductGalleryEditor';

const FIELD_CLASS =
  'w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

export function ProductFlavoursEditor({ options, onChange, onBusyChange }: {
  options: ProductOption[];
  onChange: (options: ProductOption[]) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const latest = useRef(options);
  const pending = useRef(0);
  useLayoutEffect(() => { latest.current = options; }, [options]);
  const keyOf = (option: ProductOption) => option.id ?? option.editorId;
  // Upload completion targets a stable row and its latest state, even when
  // another flavour or a name changes while the request is in flight.
  function update(key: string | undefined, patch: (option: ProductOption) => Partial<ProductOption>) {
    const next = latest.current.map((option) => keyOf(option) === key ? { ...option, ...patch(option) } : option);
    latest.current = next;
    onChange(next);
  }
  function busy(uploading: boolean) {
    pending.current = Math.max(0, pending.current + (uploading ? 1 : -1));
    onBusyChange?.(pending.current > 0);
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Flavours <span className="normal-case text-muted/70">— optional; same sizes and prices, customer picks one</span>
      </p>
      {options.map((option, index) => (
        <div key={keyOf(option)} className="flex flex-col gap-3 rounded-xl border border-border p-2">
          <div className="flex items-center gap-2">
            <ProductImageUpload
              small
              imageUrl={option.imageUrl}
              onUploadingChange={busy}
              onChange={(imageUrl) => update(keyOf(option), (current) => ({
                imageUrl,
                extraImageUrls: current.extraImageUrls?.filter((url) => url !== imageUrl),
              }))}
            />
            <input
              value={option.name}
              onChange={(e) => update(keyOf(option), () => ({ name: e.target.value }))}
              placeholder="Flavour name (e.g. Achaari Masti)"
              maxLength={60}
              className={FIELD_CLASS}
              aria-label={`Flavour ${index + 1} name`}
            />
            <label className="flex shrink-0 items-center gap-1 text-xs text-ink">
              <input type="checkbox" checked={option.isAvailable} onChange={(e) => update(keyOf(option), () => ({ isAvailable: e.target.checked }))} />
              In stock
            </label>
            <button type="button" onClick={() => onChange(options.filter((_, i) => i !== index))} className="text-muted hover:text-danger" aria-label={`Remove flavour ${index + 1}`}>
              <X size={16} />
            </button>
          </div>
          <ProductGalleryEditor
            urls={option.extraImageUrls ?? []}
            hasCover={!!option.imageUrl}
            onChange={(extraImageUrls) => update(keyOf(option), () => ({ extraImageUrls }))}
            onUploadingChange={busy}
            onUpload={(url) => update(keyOf(option), (current) => ({
              extraImageUrls: [...new Set([...(current.extraImageUrls ?? []), url])]
                .filter((image) => image !== current.imageUrl).slice(0, MAX_EXTRA_IMAGES),
            }))}
          />
        </div>
      ))}
      {options.length < MAX_PRODUCT_OPTIONS && (
        <button
          type="button"
          onClick={() => onChange([...options, { editorId: crypto.randomUUID(), name: '', isAvailable: true, extraImageUrls: [] }])}
          className="flex items-center gap-1.5 self-start rounded-[10px] border border-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-accent hover:text-ink"
        >
          <Plus size={13} />
          Add flavour
        </button>
      )}
    </div>
  );
}
