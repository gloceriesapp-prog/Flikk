'use client';

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
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter payouts by status">
      {PAYOUT_FILTERS.map((f) => (
        <button
          key={f}
          type="button"
          role="tab"
          aria-selected={filter === f}
          onClick={() => onFilterChange(f)}
          className={'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors ' + (filter === f ? 'border-gray-300 bg-gray-100 text-gray-950' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50')}
        >
          {f === 'all' ? 'All' : statusLabel(f)}
          <span className="tnum text-xs text-gray-500">{counts[f]}</span>
        </button>
      ))}
    </div>
  );
}
