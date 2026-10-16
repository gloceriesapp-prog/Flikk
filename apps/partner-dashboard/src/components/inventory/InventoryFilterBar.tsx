'use client';

import { Search, X } from 'lucide-react';
import { chipClass, chipCountClass } from './DataStates';

export type StockFilter = 'all' | 'in_stock' | 'out_of_stock' | 'pending';

export const INVENTORY_FILTERS: { key: StockFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in_stock', label: 'In stock' },
  { key: 'out_of_stock', label: 'Out of stock' },
  { key: 'pending', label: 'Pending approval' },
];

interface Props {
  filter: StockFilter;
  onFilterChange: (filter: StockFilter) => void;
  search: string;
  onSearchChange: (search: string) => void;
  counts: Record<StockFilter, number>;
}

// Header row of the products card: stock filter chips + search.
export function InventoryFilterBar({ filter, onFilterChange, search, onSearchChange, counts }: Props) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by stock">
        {INVENTORY_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => onFilterChange(key)}
            className={chipClass(filter === key)}
          >
            {label}
            <span className={chipCountClass(filter === key)}>{counts[key]}</span>
          </button>
        ))}
      </div>

      <div className="relative w-full lg:w-72">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search product or category"
          aria-label="Search products"
          className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pr-9 pl-10 text-sm text-ink outline-none transition-colors placeholder:text-slate-400 focus:border-accent focus:bg-white"
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
