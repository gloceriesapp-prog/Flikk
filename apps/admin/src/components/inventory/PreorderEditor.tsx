'use client';

import type { Product } from '@/lib/types';

type Preorder = Pick<Product, 'preorderEnabled' | 'preorderMinQty' | 'preorderLeadDays'>;

// Pre-order only (idli, dosa batter, chicken in bulk): the product leaves
// every other customer feed and shows in Home → Pre-orders, where the
// customer picks a day and slot. The store accepts it like any order.
export function PreorderEditor({ value, onChange }: { value: Preorder; onChange: (next: Preorder) => void }) {
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
          <label className="text-xs font-medium text-muted">
            Minimum quantity (packs)
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
