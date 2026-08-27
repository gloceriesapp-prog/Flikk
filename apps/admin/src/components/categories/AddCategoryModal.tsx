'use client';

// Add-category surface — title (which CategorySection group it shows
// under), name, and photo, the fields the customer app's grouped
// Categories browse grid actually reads (CategorySections.tsx ->
// CategoryTile.tsx — a title with a row of image-only category tiles
// underneath, per an explicit ask). Photo uploads to its own
// "category-images" Storage bucket (ProductImageUpload's `bucket` prop —
// see that component's own note on why product/store/category photos each
// get a separate bucket) — no bg_color extraction runs for it, that logic
// is product-photo specific.

import { useState } from 'react';
import { X } from 'lucide-react';
import type { CategorySection, NewCategoryInput } from '@/lib/types';
import { ProductImageUpload } from '@/components/inventory/ProductImageUpload';

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

export function AddCategoryModal({
  sections,
  nextSortOrder,
  onClose,
  onAdd,
}: {
  sections: CategorySection[];
  nextSortOrder: number;
  onClose: () => void;
  onAdd: (category: NewCategoryInput) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? '');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed || !sectionId) return;

    setSubmitting(true);
    setError(null);
    try {
      await onAdd({ name: trimmed, imageUrl, sortOrder: nextSortOrder, isActive: true, sectionId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add category — try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h3 className="text-lg font-semibold text-ink">Add category</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          {sections.length === 0 ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-danger">
              Add a title first (above) — every category needs one to show up on the customer app.
            </p>
          ) : (
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className={FIELD_CLASS}
              aria-label="Title"
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-3">
            <ProductImageUpload imageUrl={imageUrl} onChange={(url) => setImageUrl(url)} bucket="category-images" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={FIELD_CLASS}
              placeholder="Category name (e.g. Vegetables & Fruits)"
              aria-label="Category name"
            />
          </div>

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-danger">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!name.trim() || !sectionId || submitting}
            className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            {submitting ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
