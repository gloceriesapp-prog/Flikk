'use client';

// Product category dropdown for Add/EditProductModal. The choices are the
// admin's own categories (Categories page, `categories` table) — there is no
// built-in list. A product saved under a name that is no longer listed keeps
// it as an extra option, so opening and saving it never changes its category.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchCategories } from '@/lib/supabase/categories';

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

export function ProductCategorySelect({ value, onChange }: { value: string; onChange: (category: string) => void }) {
  const [names, setNames] = useState<string[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let live = true;
    fetchCategories()
      .then((rows) => { if (live) setNames([...new Set(rows.map((row) => row.name.trim()).filter(Boolean))]); })
      .catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, []);

  // A new product starts on the first category once the list arrives.
  useEffect(() => {
    if (!value && names?.[0]) onChange(names[0]);
  }, [value, names, onChange]);

  const options = names && value && !names.includes(value) ? [value, ...names] : names ?? (value ? [value] : []);

  return (
    <div className="flex flex-col gap-1">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={FIELD_CLASS} aria-label="Category" disabled={names === null && !error}>
        {options.length === 0 && <option value="">{names === null && !error ? 'Loading categories…' : 'No categories yet'}</option>}
        {options.map((name) => <option key={name} value={name}>{name}</option>)}
      </select>
      <p className="text-[11px] text-muted">
        {error ? 'Could not load categories. ' : names?.length === 0 ? 'Add a category first. ' : ''}
        Add, rename or remove categories on the{' '}
        <Link href="/categories" target="_blank" className="font-medium text-ink underline">Categories page</Link>.
      </p>
    </div>
  );
}
