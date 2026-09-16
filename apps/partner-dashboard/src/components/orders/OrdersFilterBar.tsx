'use client';

import { Search } from 'lucide-react';
import clsx from 'clsx';
import type { OrderStatus } from '@/lib/partnerApi';
import { statusLabel } from '@/lib/format';

export const ORDER_FILTERS: Array<OrderStatus | 'all'> = ['all', 'placed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'];

interface Props {
  filter: OrderStatus | 'all';
  onFilterChange: (filter: OrderStatus | 'all') => void;
  search: string;
  onSearchChange: (search: string) => void;
  counts: Record<OrderStatus | 'all', number>;
}

export function OrdersFilterBar({ filter, onFilterChange, search, onSearchChange, counts }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        {ORDER_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onFilterChange(f)}
            className={clsx(
              'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              filter === f ? 'bg-neutral-900 text-white' : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50',
            )}
          >
            {f === 'all' ? 'All' : statusLabel(f)}
            <span className={clsx('text-xs', filter === f ? 'text-neutral-300' : 'text-neutral-400')}>{counts[f]}</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search customer or order ID"
          className="w-72 rounded-full border border-neutral-200 bg-white py-2 pl-9 pr-4 text-sm text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-neutral-300"
        />
      </div>
    </div>
  );
}
