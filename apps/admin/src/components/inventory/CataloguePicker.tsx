'use client';

// Where a product is filed: one Category › Sub-category choice, from the
// admin's own Categories page. The sub-category puts the product in the
// customer app's category browse; its category is the product's category
// (commission rate, chicken and veg options), which the database also keeps
// in step (migration 20261104140000). Picking a category that has no
// sub-categories yet creates an "All" sub-category under it and files the
// product there.

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
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
  async function pickEmptyCategory(category: CatalogueTreeCategory) {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: category.id, name: 'All' }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.id) throw new Error(body?.error ?? 'Could not add sub-category.');
      const sub = { id: body.id as string, name: body.name as string };
      setTree((rows) => rows?.map((row) => (row.id === category.id ? { ...row, subCategories: [sub] } : row)) ?? rows);
      onChange({ subCategoryId: sub.id, category: category.name });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not add sub-category.');
    } finally {
      setCreating(false);
    }
  }

  const known = subCategoryId != null && parentBySub.has(subCategoryId);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted" htmlFor="catalogue-picker">Category › Sub-category</label>
      <select
        id="catalogue-picker"
        value={known ? subCategoryId : ''}
        onChange={(e) => {
          const empty = (tree ?? []).find((category) => `new:${category.id}` === e.target.value);
          if (empty) { void pickEmptyCategory(empty); return; }
          const parent = parentBySub.get(e.target.value);
          if (parent) onChange({ subCategoryId: e.target.value, category: parent });
        }}
        className={FIELD_CLASS}
        disabled={(tree === null && !error) || creating}
      >
        <option value="" disabled>
          {tree === null && !error ? 'Loading categories…' : legacyCategory ? `${legacyCategory} — pick a sub-category` : 'Pick where this product is listed'}
        </option>
        {(tree ?? []).map((category) =>
          category.subCategories.length ? (
            <optgroup key={category.id} label={category.name}>
              {category.subCategories.map((sub) => (
                <option key={sub.id} value={sub.id}>{category.name} › {sub.name}</option>
              ))}
            </optgroup>
          ) : (
            <option key={category.id} value={`new:${category.id}`}>{category.name}</option>
          ),
        )}
      </select>
      <p className="text-[11px] text-muted">
        {creating ? 'Adding an "All" sub-category… ' : createError ? `${createError} ` : error ? 'Could not load categories. ' : tree && !tree.length ? 'No categories yet. ' : ''}
        Add or rename categories and sub-categories on the{' '}
        <Link href="/categories" target="_blank" className="font-medium text-ink underline">Categories page</Link>
        , then reopen this form.
      </p>
    </div>
  );
}
