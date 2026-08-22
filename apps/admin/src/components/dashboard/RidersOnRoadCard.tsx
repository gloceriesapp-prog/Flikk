// Mirrors the reference's "Delivery Vehicles" card — Flikk is rider-owned
// two-wheelers, not a branded van fleet, so a bike icon + on-shift count
// stands in for the reference's truck illustration + fleet count.

import { Bike, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PLACEHOLDER_ACTIVE_RIDERS } from '@/lib/mock-data';

export function RidersOnRoadCard() {
  const online = PLACEHOLDER_ACTIVE_RIDERS.filter((r) => r.isOnline);

  return (
    <Card title="Riders on the road" subtitle="Active in the zone right now" showMenu>
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ink">
          <Bike size={24} className="text-white" />
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums text-ink">{online.length}</span>
            <span className="flex items-center gap-0.5 text-xs font-semibold text-success">
              <TrendingUp size={11} />
              +2.2%
            </span>
          </div>
          <p className="text-xs text-muted">from last week</p>
        </div>
      </div>
    </Card>
  );
}
