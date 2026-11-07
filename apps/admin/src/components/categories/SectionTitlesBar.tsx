'use client';

// "Titles" strip at the top of the Categories page — manages
// category_sections (the group heading, e.g. "Groceries & Staples", that
// several categories show under on the customer app's grid). A title is a
// peer of categories, not a child of one, so it gets its own strip rather
// than living inside a category's own edit modal. Each title can be renamed
// in place (pencil; Enter saves, Esc cancels) or deleted after a confirm that
// says how many categories move to Untitled. Names are checked on the server
// (lib/categorySectionName.ts): required, 40 characters, no duplicates.

import { useState } from 'react';
import { Check, Pencil, Plus, X } from '@/components/icons';
import { MAX_SECTION_NAME } from '@/lib/categorySectionName';
import type { CategorySection } from '@/lib/types';

const CHIP = 'flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-ink-soft';
const ICON_BUTTON = 'text-muted disabled:opacity-40';

export function SectionTitlesBar({
  sections,
  categoryCounts,
  onAdd,
  onRename,
  onDelete,
}: {
  sections: CategorySection[];
  // Categories under each title id, for the delete confirm.
  categoryCounts: Record<string, number>;
  onAdd: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>, fallback: string) {
    setError(null);
    try {
      await action();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
      return false;
    }
  }

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    if (await run(() => onAdd(trimmed), 'Could not add title — try again.')) setNewName('');
    setAdding(false);
  }

  async function handleRename() {
    if (!editing) return;
    const section = sections.find((s) => s.id === editing.id);
    if (!section || editing.name.trim() === section.name) {
      setEditing(null);
      return;
    }
    setBusyId(editing.id);
    if (await run(() => onRename(editing.id, editing.name), 'Could not rename title — try again.')) setEditing(null);
    setBusyId(null);
  }

  async function handleDelete(section: CategorySection) {
    const count = categoryCounts[section.id] ?? 0;
    const detail = count === 0
      ? 'No categories use it.'
      : `Its ${count} ${count === 1 ? 'category stays but moves' : 'categories stay but move'} to Untitled until you assign a new title.`;
    if (!window.confirm(`Delete the title "${section.name}"? ${detail}`)) return;
    setBusyId(section.id);
    await run(() => onDelete(section.id), 'Could not delete title — try again.');
    setBusyId(null);
  }

  return (
    <div className="card p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        Titles — the headings categories show under on the customer app
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {sections.map((section) => {
          const busy = busyId === section.id;
          if (editing?.id === section.id) {
            return (
              <span key={section.id} className={`${CHIP} ring-2 ring-ink/10`}>
                <input
                  autoFocus
                  value={editing.name}
                  maxLength={MAX_SECTION_NAME}
                  onChange={(e) => setEditing({ id: section.id, name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleRename();
                    } else if (e.key === 'Escape') {
                      setEditing(null);
                    }
                  }}
                  aria-label={`Rename ${section.name}`}
                  className="w-44 bg-transparent text-xs font-semibold text-ink focus:outline-none"
                />
                <button type="button" onClick={handleRename} disabled={busy || !editing.name.trim()}
                  aria-label="Save title" className={`${ICON_BUTTON} hover:text-ink`}>
                  <Check size={14} />
                </button>
                <button type="button" onClick={() => setEditing(null)} disabled={busy}
                  aria-label="Cancel rename" className={`${ICON_BUTTON} hover:text-ink`}>
                  <X size={12} />
                </button>
              </span>
            );
          }
          return (
            <span key={section.id} className={CHIP}>
              {section.name}
              <button type="button" onClick={() => setEditing({ id: section.id, name: section.name })} disabled={busy}
                aria-label={`Rename ${section.name}`} className={`${ICON_BUTTON} hover:text-ink`}>
                <Pencil size={12} />
              </button>
              <button type="button" onClick={() => handleDelete(section)} disabled={busy}
                aria-label={`Delete ${section.name}`} className={`${ICON_BUTTON} hover:text-danger`}>
                <X size={12} />
              </button>
            </span>
          );
        })}

        <input
          value={newName}
          maxLength={MAX_SECTION_NAME}
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
          className="flex items-center gap-1 rounded-[10px] border border-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-accent disabled:opacity-40"
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      {error && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
