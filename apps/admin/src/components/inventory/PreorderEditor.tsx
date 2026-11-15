'use client';

import type { Product, ProductVariant } from '@/lib/types';
import { UNIT_TYPE_OPTIONS, type UnitType } from '@/lib/product-options';

type Preorder = Pick<Product, 'preorderEnabled' | 'preorderMinQty' | 'preorderLeadDays'>;

// Pre-order only (idli, dosa batter, chicken in bulk): the product leaves
// every other customer feed and shows in Home → Pre-orders, where the
// customer picks a day and slot. The store accepts it like any order.
export function PreorderEditor({ value, onChange, variants, onVariantsChange }: {
  value: Preorder; onChange: (next: Preorder) => void;
  variants: ProductVariant[]; onVariantsChange: (next: ProductVariant[]) => void;
}) {
  const first = variants[0];
  const updateSize = (patch: Partial<ProductVariant>) => onVariantsChange(variants.map((v, i) => i === 0 ? { ...v, ...patch } : v));
  const whole = (raw: string, max: number) => Math.min(max, Math.max(1, Math.floor(Number(raw) || 1)));
  return (
    <div className="rounded-xl border border-border p-3">
      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input type="checkbox" checked={value.preorderEnabled === true} onChange={(e) => onChange({ ...value, preorderEnabled: e.target.checked })} />
        Pre-order only
      </label>
      <p className="mt-0.5 text-xs text-muted">
        Shown only in Home → Pre-orders. Customers book a day (today to 4 days ahead) and a slot at least 2 hours away; you accept it like a normal order.
      </p>
      {value.preorderEnabled && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {first && <>
            <label className="text-xs font-medium text-muted">
              Order unit
              <select aria-label="Pre-order unit" value={first.unitType}
                onChange={(e) => updateSize({ unitType: e.target.value as UnitType, quantity: 1 })}
                className="mt-1.5 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-ink">
                {UNIT_TYPE_OPTIONS.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-muted">
              Amount per order unit
              <input aria-label="Pre-order amount per unit" type="number" min="0.001" step="any" value={first.quantity || ''}
                onChange={(e) => updateSize({ quantity: Number(e.target.value) })}
                className="mt-1.5 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-ink" />
            </label>
            <p className="col-span-2 text-xs text-muted">
              Chicken: choose kg and 1 (or 0.5). Idli: choose pieces and 1. Customers choose how many units they need.
              Set the price, stock and any extra sizes in Sizes, pricing &amp; stock above. Changing the unit does not change its price.
            </p>
          </>}
          <label className="text-xs font-medium text-muted">
            Minimum order units
            <input type="number" min={1} max={999} value={value.preorderMinQty ?? 1}
              onChange={(e) => onChange({ ...value, preorderMinQty: whole(e.target.value, 999) })}
              className="mt-1.5 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-ink" />
          </label>
          <label className="text-xs font-medium text-muted">
            Notice needed
            <select value={value.preorderLeadDays ?? 0} onChange={(e) => onChange({ ...value, preorderLeadDays: Number(e.target.value) })}
              className="mt-1.5 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-ink">
              {[0, 1, 2, 3, 4].map((days) => <option key={days} value={days}>{days === 0 ? 'Same day' : days === 1 ? '1 day (from tomorrow)' : `${days} days`}</option>)}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
