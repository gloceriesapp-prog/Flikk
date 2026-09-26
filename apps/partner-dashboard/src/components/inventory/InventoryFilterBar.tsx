'use client';

import { Search } from 'lucide-react';
import clsx from 'clsx';

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

export function InventoryFilterBar({ filter, onFilterChange, search, onSearchChange, counts }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        {INVENTORY_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onFilterChange(key)}
            className={clsx(
              'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              filter === key ? 'bg-neutral-900 text-white' : 'border border-hairline-strong bg-white text-neutral-600 hover:bg-neutral-50',
            )}
          >
            {label}
            <span className={clsx('text-xs', filter === key ? 'text-neutral-300' : 'text-neutral-400')}>{counts[key]}</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search product or category"
          className="w-72 rounded-full border border-hairline-strong bg-white py-2 pl-9 pr-4 text-sm text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
        />
      </div>
    </div>
  );
}
