'use client';

import type { Payout } from '@/lib/partnerApi';
import { statusLabel } from '@/lib/format';
import { chipClass, chipCountClass } from '@/components/inventory/DataStates';

export type PayoutFilter = 'all' | Payout['status'];

export const PAYOUT_FILTERS: PayoutFilter[] = ['all', 'pending', 'processing', 'paid', 'blocked', 'failed'];

interface Props {
  filter: PayoutFilter;
  onFilterChange: (filter: PayoutFilter) => void;
  counts: Record<PayoutFilter, number>;
}

export function PayoutsFilterBar({ filter, onFilterChange, counts }: Props) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter payouts by status">
      {PAYOUT_FILTERS.map((f) => (
        <button
          key={f}
          type="button"
          role="tab"
          aria-selected={filter === f}
          onClick={() => onFilterChange(f)}
          className={chipClass(filter === f)}
        >
          {f === 'all' ? 'All' : statusLabel(f)}
          <span className={chipCountClass(filter === f)}>{counts[f]}</span>
        </button>
      ))}
    </div>
  );
}
