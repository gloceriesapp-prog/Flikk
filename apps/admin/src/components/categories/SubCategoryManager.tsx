'use client';

// Sub-category list for one category — EditCategoryModal's own section.
// Self-contained (fetches, adds, updates, deletes on its own via
// app/api/subcategories/*) so EditCategoryModal doesn't need to own this
// state; only meaningful once a category actually has an id (a brand-new
// category from AddCategoryModal has to be created first, then edited,
// before it can carry sub-categories).
//
// Small photo cards, not name-only chips — a sub-category needs a real
// image for CategoryDetailScreen's own sidebar tiles on the customer app
// (SubCategorySidebarItem.tsx), same "add photo for this too" ask that
// drove categories' own image field. Reuses ProductImageUpload with
// bucket="category-images" (same bucket a top-level category's own photo
// uses — a sub-category icon is the same kind of asset, not different
// enough to warrant its own bucket).

import { useCallback, useEffect, useState } from 'react';
import { Image as ImageIcon, Plus, X } from 'lucide-react';
import { fetchSubCategories, type SubCategory } from '@/lib/supabase/subcategories';
import { ProductImageUpload } from '@/components/inventory/ProductImageUpload';

export function SubCategoryManager({ categoryId }: { categoryId: string }) {
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      setSubCategories(await fetchSubCategories(categoryId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load sub-categories.');
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setAdding(true);
    setError(null);
    try {
      const res = await fetch('/api/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId, name: trimmed, sortOrder: subCategories.length }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Add failed.');
      }
      setNewName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add sub-category — try again.');
    } finally {
      setAdding(false);
    }
  }

  async function handleImageChange(sub: SubCategory, imageUrl: string) {
    setBusyId(sub.id);
    setError(null);
    try {
      const res = await fetch(`/api/subcategories/${sub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sub.name, imageUrl }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Could not save photo.');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save photo — try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/subcategories/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Delete failed.');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete sub-category — try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Sub-categories</p>

      {!loading && subCategories.length === 0 && <p className="text-xs text-muted">No sub-categories yet.</p>}

      <div className="flex flex-wrap gap-3">
        {subCategories.map((sub) => (
          <div key={sub.id} className="relative w-20">
            <button
              type="button"
              onClick={() => handleDelete(sub.id)}
              disabled={busyId === sub.id}
              aria-label={`Remove ${sub.name}`}
              className="absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-muted hover:text-danger disabled:opacity-40"
            >
              <X size={11} />
            </button>

            <ProductImageUpload imageUrl={sub.imageUrl} onChange={(imageUrl) => handleImageChange(sub, imageUrl)} bucket="category-images" />
            <p className="mt-1 truncate text-center text-[11px] font-medium text-ink" title={sub.name}>
              {sub.name}
            </p>
            {busyId === sub.id && <ImageIcon className="pointer-events-none absolute inset-0 m-auto animate-pulse text-muted" size={16} />}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="e.g. Fresh Vegetables"
          aria-label="New sub-category name"
          className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newName.trim() || adding}
          className="flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-sm font-medium text-ink-soft hover:bg-accent disabled:opacity-40"
        >
          <Plus size={14} />
          Add
        </button>
      </div>
      <p className="text-[11px] text-muted">Add the sub-category by name first, then tap its photo box above to upload an image.</p>

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
