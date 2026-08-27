'use client';

// "Titles" strip at the top of the Categories page — manages
// category_sections (the group heading, e.g. "Groceries & Staples", that
// several categories show under on the customer app's grid). A title is a
// peer of categories, not a child of one, so it gets its own strip rather
// than living inside a category's own edit modal.

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { CategorySection } from '@/lib/types';

export function SectionTitlesBar({
  sections,
  onAdd,
  onDelete,
}: {
  sections: CategorySection[];
  onAdd: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setAdding(true);
    setError(null);
    try {
      await onAdd(trimmed);
      setNewName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add title — try again.');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await onDelete(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete title — try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        Titles — the headings categories show under on the customer app
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {sections.map((section) => (
          <span
            key={section.id}
            className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-ink-soft"
          >
            {section.name}
            <button
              type="button"
              onClick={() => handleDelete(section.id)}
              disabled={busyId === section.id}
              aria-label={`Remove ${section.name}`}
              className="text-muted hover:text-danger disabled:opacity-40"
            >
              <X size={12} />
            </button>
          </span>
        ))}

        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="New title (e.g. Snacks & Drinks)"
          aria-label="New title"
          className="w-56 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newName.trim() || adding}
          className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-accent disabled:opacity-40"
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      {error && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
