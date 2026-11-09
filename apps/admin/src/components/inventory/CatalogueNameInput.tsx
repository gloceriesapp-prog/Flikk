'use client';

// Product name with suggestions from the master item list: type 2+ letters
// and matching items appear (items not added yet first, each with its
// Section › Tile › Sub-category). Picking one fills the name and files the
// product under that sub-category; typing freely still works for an item
// that isn't on the list.

import { useEffect, useId, useRef, useState } from 'react';
import type { CatalogueItem } from '@/lib/catalogueItems';

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';
const DEBOUNCE_MS = 200;

export function CatalogueNameInput({ value, onChange, onPick }: {
  value: string;
  onChange: (name: string) => void;
  onPick: (item: CatalogueItem) => void;
}) {
  const [suggestions, setSuggestions] = useState<CatalogueItem[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // Skip the search right after a pick (the name changed, but on purpose).
  const picked = useRef(false);
  const listId = useId();
  const query = value.trim();

  useEffect(() => {
    if (picked.current) { picked.current = false; return; }
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/catalogue-items/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : []))
        .then((rows: CatalogueItem[]) => { setSuggestions(rows); setActive(-1); })
        .catch(() => {});
    }, DEBOUNCE_MS);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  function pick(item: CatalogueItem) {
    picked.current = true;
    setOpen(false);
    setSuggestions([]);
    onPick(item);
  }

  // Under two letters there is nothing to suggest (no request is made).
  const showList = open && query.length >= 2 && suggestions.length > 0;
  return (
    <div className="relative w-full">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, suggestions.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
          else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(suggestions[active]!); }
          else if (e.key === 'Escape') setOpen(false);
        }}
        className={FIELD_CLASS}
        placeholder="Product name"
        aria-label="Product name"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
      />
      {showList && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-lg">
          {suggestions.map((item, i) => (
            <li key={item.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(item)}
                className={`flex w-full flex-col items-start px-3 py-2 text-left hover:bg-accent ${i === active ? 'bg-accent' : ''}`}
              >
                <span className="flex w-full items-center justify-between gap-2 text-sm text-ink">
                  {item.name}
                  {item.added && <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-muted">Already added</span>}
                </span>
                <span className="text-xs text-muted">
                  {item.subCategoryName ? `${item.sectionName} › ${item.categoryName} › ${item.subCategoryName}` : 'Needs category'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
