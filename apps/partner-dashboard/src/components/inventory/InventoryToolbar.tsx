'use client';

// The inventory page's action row — replaces the old big "Inventory" title
// block (the top header already names the page). Modelled on the reference
// toolbar: a left cluster of view controls and a right cluster of actions,
// split by a divider. Every control here does something real — no inert
// chrome. Table View is a static indicator (table is the only view that
// exists); reinstate a real switcher only when a second view does.

import { BarChart3, Download, Plus, SlidersHorizontal, Table2 } from 'lucide-react';
import clsx from 'clsx';

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

const pill = 'flex items-center gap-2 rounded-xl border border-hairline bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50';

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
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Left cluster — view controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className={clsx(pill, 'cursor-default text-neutral-900')}>
          <Table2 size={16} className="text-neutral-500" /> Table View
        </span>

        <div className="h-6 w-px bg-neutral-200" />

        <button type="button" onClick={onToggleFilter} className={clsx(pill, showFilter && 'border-neutral-900 bg-neutral-900 text-white')}>
          <SlidersHorizontal size={16} className={showFilter ? 'text-white' : 'text-neutral-500'} /> Filter
        </button>

        {/* Sort — native select styled to match the pills (real, accessible). */}
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            aria-label="Sort products"
            className={clsx(pill, 'cursor-pointer appearance-none pr-8')}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                Sort: {o.label}
              </option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>

        <button
          type="button"
          onClick={onToggleStats}
          className="flex items-center gap-2.5 rounded-xl border border-hairline bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <BarChart3 size={16} className="text-neutral-500" /> Show statistics
          <span className={clsx('relative h-5 w-9 rounded-full transition-colors', showStats ? 'bg-coral' : 'bg-neutral-300')} style={{ ['--tw-bg-opacity' as string]: '1' }}>
            <span className={clsx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', showStats ? 'left-4' : 'left-0.5')} />
          </span>
        </button>
      </div>

      {/* Right cluster — actions */}
      <div className="flex items-center gap-2.5">
        <button type="button" onClick={onExport} className={pill}>
          <Download size={16} className="text-neutral-500" /> Export
        </button>
        <button
          type="button"
          onClick={onAddProduct}
          className="flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          <Plus size={16} /> Add New Product
        </button>
      </div>
    </div>
  );
}
