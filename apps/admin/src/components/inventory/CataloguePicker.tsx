'use client';

// Where a product is filed: one Category › Sub-category choice, from the
// admin's own Categories page. The sub-category puts the product in the
// customer app's category browse; its category is the product's category
// (commission rate, chicken and veg options), which the database also keeps
// in step (migration 20261104140000). Categories without sub-categories are
// listed but cannot be picked until one is added.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchCatalogueTree, type CatalogueTreeCategory } from '@/lib/supabase/subcategories';

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

export interface CataloguePlacement {
  subCategoryId: string;
  category: string;
}

export function CataloguePicker({
  subCategoryId,
  legacyCategory,
  onChange,
}: {
  subCategoryId: string | undefined;
  // A product saved before the tree existed: its old label, shown until a
  // sub-category is picked.
  legacyCategory?: string;
  onChange: (placement: CataloguePlacement) => void;
}) {
  const [tree, setTree] = useState<CatalogueTreeCategory[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let live = true;
    fetchCatalogueTree()
      .then((rows) => { if (live) setTree(rows); })
      .catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, []);

  const parentBySub = useMemo(
    () => new Map((tree ?? []).flatMap((category) => category.subCategories.map((sub) => [sub.id, category.name] as const))),
    [tree],
  );
  const known = subCategoryId != null && parentBySub.has(subCategoryId);
  const hasAnySub = parentBySub.size > 0;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted" htmlFor="catalogue-picker">Category › Sub-category</label>
      <select
        id="catalogue-picker"
        value={known ? subCategoryId : ''}
        onChange={(e) => {
          const parent = parentBySub.get(e.target.value);
          if (parent) onChange({ subCategoryId: e.target.value, category: parent });
        }}
        className={FIELD_CLASS}
        disabled={tree === null && !error}
      >
        <option value="" disabled>
          {tree === null && !error ? 'Loading categories…' : legacyCategory ? `${legacyCategory} — pick a sub-category` : 'Pick where this product is listed'}
        </option>
        {(tree ?? []).map((category) => (
          <optgroup key={category.id} label={category.subCategories.length ? category.name : `${category.name} (add a sub-category first)`}>
            {category.subCategories.map((sub) => (
              <option key={sub.id} value={sub.id}>{category.name} › {sub.name}</option>
            ))}
          </optgroup>
        ))}
      </select>
      <p className="text-[11px] text-muted">
        {error ? 'Could not load categories. ' : tree && !hasAnySub ? 'No sub-categories yet. ' : ''}
        Add or rename categories and sub-categories on the{' '}
        <Link href="/categories" target="_blank" className="font-medium text-ink underline">Categories page</Link>
        , then reopen this form.
      </p>
    </div>
  );
}
