'use client';

import { Search, X } from 'lucide-react';

export type StockFilter = 'all' | 'in_stock' | 'out_of_stock' | 'pending' | 'low_stock';

export const INVENTORY_FILTERS: { key: StockFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in_stock', label: 'In stock' },
  { key: 'out_of_stock', label: 'Out of stock' },
  { key: 'low_stock', label: 'Running low' },
  { key: 'pending', label: 'Pending approval' },
];

interface Props {
  filter: StockFilter;
  onFilterChange: (filter: StockFilter) => void;
  search: string;
  onSearchChange: (search: string) => void;
  counts: Record<StockFilter, number>;
}

// Always-visible stock tabs and search, shared by the inventory toolbar.
export function InventoryFilterBar({ filter, onFilterChange, search, onSearchChange, counts }: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
      <div className="flex shrink-0 flex-wrap gap-1.5" role="tablist" aria-label="Filter by stock">
        {INVENTORY_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => onFilterChange(key)}
            className={'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white h-10 px-2.5 text-sm font-medium ' + (filter === key ? 'text-black ring-1 ring-black/20' : 'text-slate-600')}
          >
            {label}
            <span className={"tnum text-xs text-slate-500"}>{counts[key]}</span>
          </button>
        ))}
      </div>

      <div className="relative w-full min-w-[160px] lg:w-auto lg:flex-1">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search products"
          aria-label="Search products"
          className="h-10 w-full rounded-full border border-slate-200 bg-white pr-9 pl-10 text-sm text-ink outline-none transition-colors placeholder:text-slate-400 focus:border-black/40 focus:bg-white"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
