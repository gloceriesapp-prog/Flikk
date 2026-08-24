'use client';

// "Sizes & pricing" — the Blinkit/Instamart per-size pricing model: a
// product can be sold in more than one size, and each size has its own
// price (250 g Onion at ₹15, 1 kg Onion at ₹52 — never one price scaled by
// weight). Shared by AddProductModal and EditProductModal so the row UI
// can't drift between "add" and "edit". The first row is always the
// default/primary listing — its price/unit are what shows on the Inventory
// card itself; every row after it is an additional size a shopper can pick
// on the customer app's own size-chip row (ProductDetailInfo).
//
// g/ml quantities come from a fixed preset dropdown (real Indian grocery
// pack sizes); kg/l/pc are free numeric input — a store owner needs 2.5 kg
// or a dozen eggs, not just whole-number presets. See product-options.ts's
// own note on why the split is exactly there.

import { Plus, X } from 'lucide-react';
import { GRAM_PRESETS, ML_PRESETS, UNIT_TYPE_OPTIONS, hasFixedPresets, presetsForUnit, type UnitType } from '@/lib/product-options';
import type { ProductVariant } from '@/lib/types';

function emptyVariant(unitType: UnitType = 'g'): ProductVariant {
  return { unitType, quantity: hasFixedPresets(unitType) ? presetsForUnit(unitType)[0]! : 1, price: 0 };
}

export { emptyVariant };

export function ProductVariantsEditor({
  variants,
  onChange,
}: {
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
}) {
  function updateVariant(index: number, patch: Partial<ProductVariant>) {
    onChange(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function changeUnitType(index: number, unitType: UnitType) {
    // Switching between a preset unit (g/ml) and a custom one (kg/l/pc)
    // resets quantity to a sane default for the new type instead of
    // carrying over a number that made sense for the old one (e.g. "500"
    // surviving a switch from ml to pc would read as 500 pieces).
    const quantity = hasFixedPresets(unitType) ? presetsForUnit(unitType)[0]! : 1;
    updateVariant(index, { unitType, quantity });
  }

  function removeVariant(index: number) {
    onChange(variants.filter((_, i) => i !== index));
  }

  function addVariant() {
    onChange([...variants, emptyVariant()]);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Sizes &amp; pricing {variants.length > 1 && <span className="normal-case text-muted/70">— first size shown on the card</span>}
      </p>

      {variants.map((variant, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2.5">
          <select
            value={variant.unitType}
            onChange={(e) => changeUnitType(index, e.target.value as UnitType)}
            className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
            aria-label={`Size ${index + 1} unit type`}
          >
            {UNIT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {hasFixedPresets(variant.unitType) ? (
            <select
              value={variant.quantity}
              onChange={(e) => updateVariant(index, { quantity: Number(e.target.value) })}
              className="w-24 rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
              aria-label={`Size ${index + 1} quantity`}
            >
              {(variant.unitType === 'g' ? GRAM_PRESETS : ML_PRESETS).map((preset) => (
                <option key={preset} value={preset}>
                  {preset} {variant.unitType}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              value={variant.quantity || ''}
              onChange={(e) => updateVariant(index, { quantity: Number(e.target.value) })}
              placeholder={variant.unitType === 'pc' ? 'Count' : 'Custom qty'}
              className="w-24 rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
              aria-label={`Size ${index + 1} quantity`}
            />
          )}

          <input
            type="number"
            value={variant.price || ''}
            onChange={(e) => updateVariant(index, { price: Number(e.target.value) })}
            placeholder="Price"
            className="w-24 flex-1 rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
            aria-label={`Size ${index + 1} price`}
          />

          <input
            type="number"
            value={variant.originalPrice ?? ''}
            onChange={(e) => updateVariant(index, { originalPrice: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="MRP"
            className="w-24 flex-1 rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
            aria-label={`Size ${index + 1} MRP`}
          />

          <button
            type="button"
            onClick={() => removeVariant(index)}
            disabled={variants.length === 1}
            className="ml-auto text-muted hover:text-danger disabled:opacity-30"
            aria-label={`Remove size ${index + 1}`}
          >
            <X size={16} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addVariant}
        className="flex items-center gap-1.5 self-start rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-accent hover:text-ink"
      >
        <Plus size={13} />
        Add another size
      </button>
    </div>
  );
}
