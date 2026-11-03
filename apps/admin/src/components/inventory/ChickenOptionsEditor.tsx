'use client';

// Chicken-only options (products.cut_options_enabled / bulk_min_kg): the
// customer app then asks for small/medium/large pieces, and an order with at
// least bulkMinKg kg of this product becomes a bulk order the store confirms
// within the bulk response window (Settings). Shown only in the meat category.

import { CUT_OPTIONS_CATEGORY, MAX_BULK_MIN_KG } from '@/lib/productValidation';

const FIELD_CLASS =
  'w-28 rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

export function ChickenOptionsEditor({
  category,
  enabled,
  bulkMinKg,
  onChange,
}: {
  category: string;
  enabled: boolean;
  bulkMinKg: number | null;
  onChange: (next: { cutOptionsEnabled: boolean; bulkMinKg: number | null }) => void;
}) {
  if (category !== CUT_OPTIONS_CATEGORY) return null;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border px-3 py-3">
      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange({ cutOptionsEnabled: e.target.checked, bulkMinKg: e.target.checked ? bulkMinKg ?? 5 : null })}
        />
        Chicken: offer cut sizes (small / medium / large) and bulk orders
      </label>
      {enabled && (
        <label className="flex flex-wrap items-center gap-2 text-xs text-muted">
          Bulk order from
          <input
            type="number"
            min={0.5}
            max={MAX_BULK_MIN_KG}
            step={0.5}
            value={bulkMinKg ?? ''}
            onChange={(e) => onChange({ cutOptionsEnabled: true, bulkMinKg: e.target.value === '' ? null : Number(e.target.value) })}
            className={FIELD_CLASS}
            aria-label="Bulk order from (kg)"
            placeholder="No bulk"
          />
          kg in one order. Leave empty to turn off bulk orders for this product.
        </label>
      )}
    </div>
  );
}
