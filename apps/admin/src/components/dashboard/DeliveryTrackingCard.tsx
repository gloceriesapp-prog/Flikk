// Mirrors the reference's "Tracking Delivery" card exactly in structure —
// a route visual, a tracking ID + status pill, a checkpoint timeline, and
// a courier row. The map is deliberately decorative (a static gradient +
// route line, not a real embed): Flikk's v1 tracking is status-only, no
// live GPS (CLAUDE.md — out of scope until MVP validates), so a real map
// here would either show nothing or overclaim tracking this app doesn't
// have. The timeline itself IS real: it's the same 4-stage
// placed→packed→out_for_delivery→delivered status progression every
// other screen already reads, just visualized as checkpoints instead of a
// single pill.

import { Bike, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PLACEHOLDER_ACTIVE_RIDERS, PLACEHOLDER_ORDERS } from '@/lib/mock-data';

const CHECKPOINTS = [
  { label: 'Order placed', time: '10:24 AM', done: true },
  { label: 'Packed by store', time: '10:31 AM', done: true },
  { label: 'Out for delivery', time: '10:36 AM', done: true },
  { label: 'Delivered', time: '—', done: false },
];

export function DeliveryTrackingCard() {
  const order = PLACEHOLDER_ORDERS.find((o) => o.status === 'out_for_delivery') ?? PLACEHOLDER_ORDERS[0];
  const rider = PLACEHOLDER_ACTIVE_RIDERS.find((r) => r.id === order.riderId) ?? PLACEHOLDER_ACTIVE_RIDERS[0];

  return (
    <Card title="Live Delivery" subtitle="Most recent in-progress order" showMenu className="flex h-full flex-col">
      {/* Decorative route visual — not a real map, see file note. */}
      <div className="relative h-28 w-full overflow-hidden rounded-2xl bg-accent">
        <svg viewBox="0 0 300 110" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <path
            d="M0,90 C60,20 90,95 150,45 C200,5 230,70 300,20"
            fill="none"
            stroke="#101214"
            strokeWidth="3"
            strokeDasharray="1 10"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute left-3 top-3 h-2.5 w-2.5 rounded-full bg-ink" />
        <div className="absolute bottom-3 right-3 h-2.5 w-2.5 rounded-full bg-success" />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted">Tracking ID</p>
          <p className="text-sm font-semibold text-ink">{order.id}</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">In transit</span>
      </div>

      <div className="mt-4 flex flex-1 flex-col gap-3 border-t border-border pt-4">
        {CHECKPOINTS.map((cp) => (
          <div key={cp.label} className="flex items-center gap-3">
            <span className={cp.done ? 'h-2 w-2 rounded-full bg-ink' : 'h-2 w-2 rounded-full bg-border'} />
            <span className={cp.done ? 'flex-1 text-xs font-medium text-ink' : 'flex-1 text-xs font-medium text-muted'}>
              {cp.label}
            </span>
            <span className="text-xs text-muted">{cp.time}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink">
          <Bike size={15} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-muted">Rider</p>
          <p className="truncate text-sm font-semibold text-ink">{rider.name}</p>
        </div>
        <ChevronRight size={15} className="text-muted" />
      </div>
    </Card>
  );
}
