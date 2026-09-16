'use client';

import clsx from 'clsx';
import type { Payout } from '@/lib/partnerApi';
import { statusLabel } from '@/lib/format';

export type PayoutFilter = 'all' | Payout['status'];

export const PAYOUT_FILTERS: PayoutFilter[] = ['all', 'pending', 'processing', 'paid', 'blocked', 'failed'];

interface Props {
  filter: PayoutFilter;
  onFilterChange: (filter: PayoutFilter) => void;
  counts: Record<PayoutFilter, number>;
}

export function PayoutsFilterBar({ filter, onFilterChange, counts }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {PAYOUT_FILTERS.map((f) => (
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
  );
}
