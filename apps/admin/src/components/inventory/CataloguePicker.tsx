'use client';

// Where a product is filed: one Category › Sub-category choice, from the
// admin's own Categories page. The sub-category puts the product in the
// customer app's category browse; its category is the product's category
// (commission rate, chicken and veg options), which the database also keeps
// in step (migration 20261104140000). Picking a category that has no
// sub-categories yet creates a "General" sub-category under it and files the
// product there. "Add sub-category" creates a new one by name (pick its
// category, type the name) and selects it; its photo is added later on the
// Categories page.

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
  // Creates a sub-category by name under a category, adds it to the list and
  // selects it. Returns false when it failed (the message is shown).
  async function createSubCategory(category: CatalogueTreeCategory, name: string): Promise<boolean> {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: category.id, name }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.id) throw new Error(body?.error ?? 'Could not add sub-category.');
      const sub = { id: body.id as string, name: body.name as string };
      setTree((rows) => rows?.map((row) => (row.id === category.id ? { ...row, subCategories: [...row.subCategories, sub] } : row)) ?? rows);
      onChange({ subCategoryId: sub.id, category: category.name });
      return true;
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not add sub-category.');
      return false;
    } finally {
      setCreating(false);
    }
  }

  const pickEmptyCategory = (category: CatalogueTreeCategory) => createSubCategory(category, 'General');

  // Inline "Add sub-category" form; defaults to the selected product's category.
  const [adding, setAdding] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubCategoryId, setNewSubCategoryId] = useState('');
  function openAdd() {
    const current = (tree ?? []).find((category) => category.subCategories.some((sub) => sub.id === subCategoryId));
    setNewSubCategoryId(current?.id ?? tree?.[0]?.id ?? '');
    setNewSubName('');
    setCreateError(null);
    setAdding(true);
  }
  async function addSubCategory() {
    const category = (tree ?? []).find((c) => c.id === newSubCategoryId);
    const name = newSubName.trim().replace(/\s+/g, ' ');
    if (!category || !name) return;
    if (await createSubCategory(category, name)) setAdding(false);
  }

  const known = subCategoryId != null && parentBySub.has(subCategoryId);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted" htmlFor="catalogue-picker">Category › Sub-category</label>
        {!adding && tree && tree.length > 0 && (
          <button type="button" onClick={openAdd} className="text-xs font-semibold text-brand hover:underline">
            Add sub-category
          </button>
        )}
      </div>
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
      {adding && (
        <div className="mt-1 flex flex-col gap-2 rounded-xl border border-border bg-accent p-3">
          <select value={newSubCategoryId} onChange={(e) => setNewSubCategoryId(e.target.value)} className={FIELD_CLASS} aria-label="Category for the new sub-category">
            {(tree ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <input
            value={newSubName}
            onChange={(e) => setNewSubName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addSubCategory(); } }}
            maxLength={60}
            className={FIELD_CLASS}
            placeholder="Sub-category name (e.g. Paneer)"
            aria-label="New sub-category name"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setAdding(false); setCreateError(null); }} className="rounded-[10px] px-3 py-1.5 text-xs text-muted hover:text-ink">
              Cancel
            </button>
            <button type="button" onClick={() => void addSubCategory()} disabled={creating || !newSubName.trim() || !newSubCategoryId}
              className="rounded-[10px] bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 hover:bg-brand-strong">
              {creating ? 'Adding…' : 'Add and select'}
            </button>
          </div>
        </div>
      )}
      <p className="text-[11px] text-muted">
        {creating && !adding ? 'Adding a "General" sub-category… ' : createError ? `${createError} ` : error ? 'Could not load categories. ' : tree && !tree.length ? 'No categories yet. ' : ''}
        Sub-category photos and renaming are on the{' '}
        <Link href="/categories" target="_blank" className="font-medium text-ink underline">Categories page</Link>.
      </p>
    </div>
  );
}
