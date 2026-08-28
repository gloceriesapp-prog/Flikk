'use client';

// "Show in category browse (optional)" — Add/EditProductModal's own picker
// for products.sub_category_id, independent of the Category field above it
// (that's the free-text PRODUCT_CATEGORIES field; see
// lib/productValidation.ts's own note on why the two aren't unified yet).
// Self-fetches the flat "Title / Sub-category" list (fetchAllSubCategoryOptions)
// rather than the parent modal owning that state — same self-contained
// pattern as SubCategoryManager.tsx.

import { useCallback, useEffect, useState } from 'react';
import { fetchAllSubCategoryOptions, type SubCategoryOption } from '@/lib/supabase/subcategories';

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

export function SubCategoryPicker({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (subCategoryId: string | undefined) => void;
}) {
  const [options, setOptions] = useState<SubCategoryOption[]>([]);

  const load = useCallback(async () => {
    try {
      setOptions(await fetchAllSubCategoryOptions());
    } catch {
      // Non-critical — the picker just stays empty; a founder can still
      // save the product without a sub-category and try again later.
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted">Show in category browse (optional)</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className={FIELD_CLASS}
        aria-label="Show in category browse"
      >
        <option value="">Not shown in a category browse grid</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
