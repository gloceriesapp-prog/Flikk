// Stands in for the reference's "Tracking Delivery" map widget — Flikk has
// no live GPS tracking in scope (CLAUDE.md: status-only 4-stage tracking
// is the v1 spec, no live map), so a map here would show nothing real.
// A recent-orders timeline is the equivalent "what's happening right now"
// signal this dashboard actually has data for.

import { Package } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/StatusPill';
import { PLACEHOLDER_ORDERS } from '@/lib/mock-data';

export function RecentOrdersWidget() {
  const recent = PLACEHOLDER_ORDERS.slice(-4).reverse();

  return (
    <Card title="Recent Orders" subtitle="Latest activity across the zone" showMenu>
      <div className="flex flex-col gap-3">
        {recent.map((order) => (
          <div key={order.id} className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent">
              <Package size={15} className="text-ink-soft" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{order.storeName}</p>
              <p className="text-xs text-muted">
                {order.id} · {order.placedAt}
              </p>
            </div>
            <StatusPill status={order.status} />
          </div>
        ))}
      </div>
    </Card>
  );
}
