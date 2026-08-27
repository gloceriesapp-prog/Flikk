'use client';

// Sub-category list for one category — EditCategoryModal's own section.
// Self-contained (fetches, adds, deletes on its own via app/api/subcategories/*)
// so EditCategoryModal doesn't need to own this state; only meaningful once
// a category actually has an id (a brand-new category from AddCategoryModal
// has to be created first, then edited, before it can carry sub-categories).

import { useCallback, useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { fetchSubCategories, type SubCategory } from '@/lib/supabase/subcategories';

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

      <div className="flex flex-wrap gap-2">
        {subCategories.map((sub) => (
          <span
            key={sub.id}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-ink"
          >
            {sub.name}
            <button
              type="button"
              onClick={() => handleDelete(sub.id)}
              disabled={busyId === sub.id}
              aria-label={`Remove ${sub.name}`}
              className="text-muted hover:text-danger disabled:opacity-40"
            >
              <X size={12} />
            </button>
          </span>
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

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
