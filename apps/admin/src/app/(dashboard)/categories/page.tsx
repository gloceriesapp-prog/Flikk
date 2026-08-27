'use client';

// Categories — title (CategorySection) + name + photo for the customer
// app's own grouped Categories browse grid (apps/customer/src/components/
// CategorySections/): one title heading, several image+name category tiles
// underneath it, per an explicit ask. Real Supabase reads
// (lib/supabase/categories.ts + categorySections.ts, anon key, public RLS)
// — Add/Edit/title writes go through app/api/categories/* and
// app/api/category-sections/* (service-role, see those routes' own notes)
// and this page refetches both lists afterward rather than optimistically
// patching local state.

import { useCallback, useEffect, useState } from 'react';
import { Image as ImageIcon, Pencil, Plus } from 'lucide-react';
import type { Category, CategorySection, NewCategoryInput } from '@/lib/types';
import { fetchCategories } from '@/lib/supabase/categories';
import { fetchCategorySections } from '@/lib/supabase/categorySections';
import { AddCategoryModal } from '@/components/categories/AddCategoryModal';
import { EditCategoryModal } from '@/components/categories/EditCategoryModal';
import { SectionTitlesBar } from '@/components/categories/SectionTitlesBar';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [sections, setSections] = useState<CategorySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const [categoryList, sectionList] = await Promise.all([fetchCategories(), fetchCategorySections()]);
      setCategories(categoryList);
      setSections(sectionList);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load categories from Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred to a microtask — see inventory/page.tsx's own note on why
    // (react-hooks/set-state-in-effect: loadData's first line is a setState
    // call).
    Promise.resolve().then(loadData);
  }, [loadData]);

  async function handleAddSection(name: string) {
    const res = await fetch('/api/category-sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sortOrder: sections.length }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? 'Add failed.');
    }
    await loadData();
  }

  async function handleDeleteSection(id: string) {
    const res = await fetch(`/api/category-sections/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? 'Delete failed.');
    }
    await loadData();
  }

  async function handleAdd(newCategory: NewCategoryInput) {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCategory),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? 'Add failed.');
    }
    await loadData();
    setAdding(false);
  }

  async function handleSave(updated: Category) {
    const res = await fetch(`/api/categories/${updated.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? 'Save failed.');
    }
    await loadData();
    setEditing(null);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? 'Delete failed.');
    }
    await loadData();
    setEditing(null);
  }

  // Grouped the same way categorySectionsRouter groups them for the
  // customer app — one title, then every category under it, in section
  // order. Untitled categories (sectionId unset, e.g. its title was
  // deleted) get their own trailing "No title" group so they're still
  // visible and editable here rather than silently vanishing from the list.
  const untitled = categories.filter((c) => !sections.some((s) => s.id === c.sectionId));
  const groups = [
    ...sections.map((section) => ({ section, items: categories.filter((c) => c.sectionId === section.id) })),
    ...(untitled.length > 0 ? [{ section: null, items: untitled }] : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium text-ink">Categories</h1>
          <p className="text-sm text-muted">
            {loading ? 'Loading…' : `${categories.length} categories across ${sections.length} titles.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={loading}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
        >
          <Plus size={15} />
          Add category
        </button>
      </div>

      {loadError && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">
          {loadError} —{' '}
          <button type="button" onClick={loadData} className="underline">
            retry
          </button>
        </p>
      )}

      <SectionTitlesBar sections={sections} onAdd={handleAddSection} onDelete={handleDeleteSection} />

      {groups.map((group) => (
        <div key={group.section?.id ?? 'untitled'} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-ink-soft">{group.section?.name ?? 'No title'}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {group.items.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setEditing(category)}
                className="group flex flex-col items-center gap-2 rounded-3xl border border-border bg-card p-4 text-center hover:border-ink/15 hover:shadow-sm"
              >
                {category.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={category.imageUrl} alt={category.name} className="h-16 w-16 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
                    <ImageIcon size={22} className="text-muted" />
                  </div>
                )}
                <p className="text-sm font-medium text-ink" title={category.name}>
                  {category.name}
                </p>
                <span className="flex items-center gap-1 text-xs font-medium text-muted opacity-0 group-hover:opacity-100">
                  <Pencil size={11} />
                  Edit
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {!loading && categories.length === 0 && (
        <p className="rounded-3xl border border-border bg-card py-8 text-center text-sm text-muted">
          No categories yet — add a title above, then add the first category.
        </p>
      )}

      {adding && (
        <AddCategoryModal sections={sections} nextSortOrder={categories.length} onClose={() => setAdding(false)} onAdd={handleAdd} />
      )}
      {editing && (
        <EditCategoryModal
          category={editing}
          sections={sections}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
