'use client';

import { SERVINGS, SERVING_LABEL, type Serving } from '@/lib/types';

// Drinks: tick how the store can hand it over. Both ticked = the customer
// picks one on the product page; one ticked = shown as info, no choice.
export function ServingOptionsEditor({ value, onChange }: { value: Serving[]; onChange: (next: Serving[]) => void }) {
  const toggle = (serving: Serving, on: boolean) =>
    onChange(SERVINGS.filter((s) => (s === serving ? on : value.includes(s))));
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-sm font-medium text-ink">Serving (drinks)</p>
      <p className="mt-0.5 text-xs text-muted">Tick both to let customers choose. Same price either way.</p>
      <div className="mt-2 flex flex-wrap gap-4">
        {SERVINGS.map((serving) => (
          <label key={serving} className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={value.includes(serving)} onChange={(e) => toggle(serving, e.target.checked)} />
            {SERVING_LABEL[serving]}
          </label>
        ))}
      </div>
    </div>
  );
}
