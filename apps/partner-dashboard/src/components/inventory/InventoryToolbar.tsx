'use client';

// The inventory page's action row — the page title lives in the shell's
// header, so this is just controls: view toggles + sort on the left, Export
// and the primary "Add product" on the right. Every control does something
// real — no inert chrome (the old static "Table View" label and its
// divider are gone; reinstate a real switcher only when a second view exists).

import { BarChart3, ChevronDown, Download, Plus, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';
import { BUTTON } from './DataStates';

export type SortKey = 'name' | 'stock' | 'price_high' | 'price_low';

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name (A–Z)' },
  { key: 'stock', label: 'In stock first' },
  { key: 'price_high', label: 'Price (high → low)' },
  { key: 'price_low', label: 'Price (low → high)' },
];

interface Props {
  showStats: boolean;
  onToggleStats: () => void;
  showFilter: boolean;
  onToggleFilter: () => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  onExport: () => void;
  onAddProduct: () => void;
}

// Toggle pills: active = soft brand tint, inactive = white with a border.
function togglePill(active: boolean) {
  return clsx(
    'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors',
    active ? 'border-transparent bg-accent-soft text-accent' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  );
}

export function InventoryToolbar({
  showStats,
  onToggleStats,
  showFilter,
  onToggleFilter,
  sort,
  onSortChange,
  onExport,
  onAddProduct,
}: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
      {/* Left cluster — view controls (one row on a phone; sort flexes) */}
      <div className="flex min-w-0 items-center gap-2">
        <button type="button" onClick={onToggleFilter} aria-pressed={showFilter} className={clsx(togglePill(showFilter), 'shrink-0')}>
          <SlidersHorizontal size={16} /> Filters
        </button>

        {/* Sort — native select styled as a pill (real, accessible). */}
        <div className="relative min-w-0 flex-1 sm:flex-none">
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            aria-label="Sort products"
            className="h-10 w-full cursor-pointer appearance-none truncate rounded-full border border-slate-200 bg-white pr-9 pl-4 text-sm font-medium text-slate-700 outline-none transition-colors hover:bg-slate-50 focus-visible:border-accent"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                Sort: {o.label}
              </option>
            ))}
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-slate-400" />
        </div>

        <button
          type="button"
          onClick={onToggleStats}
          aria-pressed={showStats}
          aria-label="Show statistics"
          className={clsx(togglePill(false), 'shrink-0 px-3 sm:px-4')}
        >
          <BarChart3 size={16} className="text-slate-500" />
          <span className="hidden sm:inline">Statistics</span>
          <span
            aria-hidden
            className={clsx('relative h-5 w-9 shrink-0 rounded-full transition-colors', showStats ? 'bg-accent' : 'bg-slate-300')}
          >
            <span
              className={clsx(
                'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all',
                showStats ? 'left-[18px]' : 'left-0.5',
              )}
            />
          </span>
        </button>
      </div>

      {/* Right cluster — actions */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={onExport} className={clsx(BUTTON.secondary, 'h-10 flex-1 sm:flex-none')}>
          <Download size={16} className="text-slate-500" /> Export
        </button>
        <button type="button" onClick={onAddProduct} className={clsx(BUTTON.primary, 'h-10 flex-[2] sm:flex-none')}>
          <Plus size={16} /> Add product
        </button>
      </div>
    </div>
  );
}
