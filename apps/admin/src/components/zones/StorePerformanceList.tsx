// "Which store is doing best" for one active zone — every store's slice
// of the zone's own delivered revenue, always summing to 100% since each
// row is a share of the same total (see storeRevenueShares' own note in
// lib/revenue.ts). Sorted best-first; #1 gets the crown, everyone else
// gets a straight rank number.

import { Crown } from 'lucide-react';
import clsx from 'clsx';
import { formatCurrency } from '@/lib/format';
import type { StoreRevenueShare } from '@/lib/revenue';

export function StorePerformanceList({ shares }: { shares: StoreRevenueShare[] }) {
  return (
    <div className="flex flex-col gap-3">
      {shares.map((store, i) => (
        <div key={store.storeId} className="flex items-center gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center">
            {i === 0 ? (
              <Crown size={16} className="text-amber-500" />
            ) : (
              <span className="text-sm font-semibold text-muted">#{i + 1}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-sm font-semibold text-ink">{store.storeName}</p>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">{store.sharePct}%</span>
            </div>
            <p className="text-xs text-muted">
              {store.category} · {formatCurrency(store.revenue)} delivered
            </p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-accent">
              <div
                className={clsx('h-full rounded-full', i === 0 ? 'bg-ink' : 'bg-ink-soft/50')}
                style={{ width: `${store.sharePct}%` }}
              />
            </div>
          </div>
        </div>
      ))}

      {shares.length === 0 && <p className="py-6 text-center text-sm text-muted">No delivered orders yet in this zone.</p>}
    </div>
  );
}
