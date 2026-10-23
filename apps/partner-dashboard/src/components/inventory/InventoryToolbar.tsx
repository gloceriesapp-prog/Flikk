'use client';

import type { ReactNode } from 'react';
import { ChevronDown, Download, Plus } from 'lucide-react';
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
  children: ReactNode;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  onExport: () => void;
  onAddProduct: () => void;
}

export function InventoryToolbar({
  children,
  sort,
  onSortChange,
  onExport,
  onAddProduct,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-0 basis-full grow xl:basis-[640px]">{children}</div>
      <div className="flex min-w-0 grow items-center gap-2 xl:grow-0">
        {/* Sort — native select styled as a pill (real, accessible). */}
        <div className="relative min-w-0 flex-1 sm:flex-none">
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            aria-label="Sort products"
            className="h-10 w-full cursor-pointer appearance-none truncate rounded-full border border-slate-200 bg-white pr-9 pl-4 text-sm font-medium text-slate-700 outline-none transition-colors hover:bg-slate-50 focus-visible:border-black/40"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                Sort: {o.label}
              </option>
            ))}
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-slate-400" />
        </div>

      </div>

      {/* Right cluster — actions */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={onExport} className={clsx(BUTTON.secondary, 'h-10 flex-1 sm:flex-none')}>
          <Download size={16} className="text-slate-500" /> Export
        </button>
        <button type="button" onClick={onAddProduct} className={clsx(BUTTON.secondary, 'h-10 flex-[2] sm:flex-none')}>
          <Plus size={16} /> Add product
        </button>
      </div>
    </div>
  );
}
