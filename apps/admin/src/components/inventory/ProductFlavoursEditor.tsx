'use client';

// Flavours of one product (product_options): Bingo Mad Angles in Achaari
// Masti, Tomato Madness... Each has its own photo and name and sells at the
// product's own sizes and prices. Customers pick one next to the size and
// quantity; the order line keeps the flavour (backend migration 20261105120000).

import { Plus, X } from '@/components/icons';
import type { ProductOption } from '@/lib/types';
import { MAX_PRODUCT_OPTIONS } from '@/lib/productValidation';
import { ProductImageUpload } from './ProductImageUpload';

const FIELD_CLASS =
  'w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

export function ProductFlavoursEditor({ options, onChange }: { options: ProductOption[]; onChange: (options: ProductOption[]) => void }) {
  const update = (index: number, patch: Partial<ProductOption>) => onChange(options.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Flavours <span className="normal-case text-muted/70">— optional; same sizes and prices, customer picks one</span>
      </p>
      {options.map((option, index) => (
        <div key={option.id ?? `new-${index}`} className="flex items-center gap-2 rounded-xl border border-border p-2">
          <ProductImageUpload small imageUrl={option.imageUrl} onChange={(imageUrl) => update(index, { imageUrl })} />
          <input
            value={option.name}
            onChange={(e) => update(index, { name: e.target.value })}
            placeholder="Flavour name (e.g. Achaari Masti)"
            maxLength={60}
            className={FIELD_CLASS}
            aria-label={`Flavour ${index + 1} name`}
          />
          <label className="flex shrink-0 items-center gap-1 text-xs text-ink">
            <input type="checkbox" checked={option.isAvailable} onChange={(e) => update(index, { isAvailable: e.target.checked })} />
            In stock
          </label>
          <button type="button" onClick={() => onChange(options.filter((_, i) => i !== index))} className="text-muted hover:text-danger" aria-label={`Remove flavour ${index + 1}`}>
            <X size={16} />
          </button>
        </div>
      ))}
      {options.length < MAX_PRODUCT_OPTIONS && (
        <button
          type="button"
          onClick={() => onChange([...options, { name: '', isAvailable: true }])}
          className="flex items-center gap-1.5 self-start rounded-[10px] border border-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-accent hover:text-ink"
        >
          <Plus size={13} />
          Add flavour
        </button>
      )}
    </div>
  );
}
