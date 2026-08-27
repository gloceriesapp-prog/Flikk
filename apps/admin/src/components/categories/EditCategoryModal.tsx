'use client';

// Edit surface for one category — name + photo, same fields AddCategoryModal
// collects. Deleting a category lives here too (bottom-left, danger-styled,
// separate from Cancel/Save) rather than a swipe action in the list — this
// dashboard has no swipe-action convention anywhere else.

import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import type { Category, CategorySection } from '@/lib/types';
import { ProductImageUpload } from '@/components/inventory/ProductImageUpload';
import { SubCategoryManager } from './SubCategoryManager';

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

export function EditCategoryModal({
  category,
  sections,
  onClose,
  onSave,
  onDelete,
}: {
  category: Category;
  sections: CategorySection[];
  onClose: () => void;
  onSave: (updated: Category) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Category>(category);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    try {
      await onSave(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes — try again.');
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await onDelete(category.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete category — try again.');
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h3 className="text-lg font-semibold text-ink">Edit category</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <select
            value={draft.sectionId ?? ''}
            onChange={(e) => setDraft({ ...draft, sectionId: e.target.value })}
            className={FIELD_CLASS}
            aria-label="Title"
          >
            {!sections.some((s) => s.id === draft.sectionId) && <option value="">No title selected</option>}
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-3">
            <ProductImageUpload imageUrl={draft.imageUrl} onChange={(imageUrl) => setDraft({ ...draft, imageUrl })} bucket="category-images" />
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Category name"
              aria-label="Category name"
            />
          </div>

          <SubCategoryManager categoryId={category.id} />

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-danger">{error}</p>}
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-danger hover:bg-red-50 disabled:opacity-40"
          >
            <Trash2 size={14} />
            {deleting ? 'Deleting…' : 'Delete'}
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!draft.name.trim() || !draft.sectionId || submitting}
              className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
