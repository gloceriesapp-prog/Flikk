// "Tracking which stores is doing great" — ranks stores by revenue this
// month (delivered orders only, cancelled/pending don't count as earned).
// New addition, not in the original A1-A4 spec, but genuinely useful: a
// founder watching store performance shouldn't have to cross-reference
// Orders + Stores manually to see who's actually driving sales.

import { Store as StoreIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/format';
import { PLACEHOLDER_ORDERS, PLACEHOLDER_STORES } from '@/lib/mock-data';

const RANK_STYLES = ['bg-amber-100 text-amber-700', 'bg-gray-200 text-gray-700', 'bg-orange-100 text-orange-700'];

export function TopStoresCard() {
  const revenueByStore = new Map<string, { orders: number; revenue: number }>();
  for (const order of PLACEHOLDER_ORDERS) {
    if (order.status !== 'delivered') continue;
    const entry = revenueByStore.get(order.storeId) ?? { orders: 0, revenue: 0 };
    entry.orders += 1;
    entry.revenue += order.amount;
    revenueByStore.set(order.storeId, entry);
  }

  const ranked = PLACEHOLDER_STORES.map((store) => ({
    store,
    ...(revenueByStore.get(store.id) ?? { orders: 0, revenue: 0 }),
  }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const topRevenue = ranked[0]?.revenue || 1;

  return (
    <Card title="Top Performing Stores" subtitle="Tracking which stores are doing great this month" showMenu>
      <div className="flex flex-col gap-3">
        {ranked.map((row, i) => (
          <div key={row.store.id} className="flex items-center gap-3">
            <div
              className={
                i < 3
                  ? `flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${RANK_STYLES[i]}`
                  : 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-ink-soft'
              }
            >
              {i + 1}
            </div>

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent">
              <StoreIcon size={14} className="text-ink-soft" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{row.store.name}</p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-accent">
                <div
                  className="h-full rounded-full bg-ink"
                  style={{ width: `${Math.max(4, (row.revenue / topRevenue) * 100)}%` }}
                />
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums text-ink">{formatCurrency(row.revenue)}</p>
              <p className="text-[11px] text-muted">{row.orders} orders</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
