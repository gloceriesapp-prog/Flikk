'use client';

// Mirrors the reference's "Tracking Delivery" card in structure — a route
// visual, a tracking ID + status pill, a checkpoint timeline, and a
// courier row — extended to handle more than one thing in flight at once,
// which the original single-order version couldn't.
//
// The map (DeliveryMap) is a real OSM tile image behind deterministic
// pins, deliberately not a live GPS feed: Flikk's v1 tracking is
// status-only (CLAUDE.md — out of scope until MVP validates), so a real
// coordinate-tracking map here would overclaim tracking this app doesn't
// have. Pin positions are a stable hash of rider id, not telemetry — see
// DeliveryMap's own note.
//
// Multiple active orders: a chip row above the detail panel lets the
// founder switch which order's timeline/rider they're looking at, instead
// of only ever showing "the most recent one" and hiding the rest.
// Multiple riders: the map shows one pin per rider, not per order — a
// rider carrying 2 orders gets a "×2" badge on their single pin rather
// than two overlapping pins, and orders still queued for pickup
// (placed/packed, no rider yet) show as "Awaiting rider" chips instead of
// phantom pins with nowhere real to sit on the map.

import { useEffect, useState } from 'react';
import { Bike, ChevronRight, Phone } from 'lucide-react';
import clsx from 'clsx';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/StatusPill';
import { DeliveryMap, type RiderPin } from '@/components/dashboard/DeliveryMap';
import { PLACEHOLDER_ACTIVE_RIDERS, PLACEHOLDER_ORDERS } from '@/lib/mock-data';

type DeliveryStage = 'placed' | 'packed' | 'out_for_delivery' | 'delivered';

const STAGE_ORDER: DeliveryStage[] = ['placed', 'packed', 'out_for_delivery', 'delivered'];

const CHECKPOINT_LABELS: Record<DeliveryStage, string> = {
  placed: 'Order placed',
  packed: 'Packed by store',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
};

// Same demo-timestamp convention as before, kept only for stages the
// order has actually reached — a real backend would carry one timestamp
// per status transition instead of this fixed placeholder ladder.
const CHECKPOINT_TIMES: Record<DeliveryStage, string> = {
  placed: '10:24 AM',
  packed: '10:31 AM',
  out_for_delivery: '10:36 AM',
  delivered: '10:52 AM',
};

// Owns its own elapsed-seconds counter, remounted (via `key`) whenever
// the tracked order changes — that's what resets the display to 0
// without calling setState synchronously inside the effect body.
function LiveTicker() {
  const [secondsAgo, setSecondsAgo] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecondsAgo((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="text-[10px] text-muted">Updated {secondsAgo}s ago</span>;
}

const ACTIVE_STATUSES: DeliveryStage[] = ['placed', 'packed', 'out_for_delivery'];

export function DeliveryTrackingCard() {
  const activeOrders = PLACEHOLDER_ORDERS.filter((o) => ACTIVE_STATUSES.includes(o.status as DeliveryStage));

  const [selectedOrderId, setSelectedOrderId] = useState(
    () => activeOrders.find((o) => o.status === 'out_for_delivery')?.id ?? activeOrders[0]?.id ?? PLACEHOLDER_ORDERS[0].id,
  );

  const order = activeOrders.find((o) => o.id === selectedOrderId) ?? activeOrders[0] ?? PLACEHOLDER_ORDERS[0];
  const rider = PLACEHOLDER_ACTIVE_RIDERS.find((r) => r.id === order.riderId) ?? null;
  const currentStageIndex = STAGE_ORDER.indexOf(order.status as DeliveryStage);

  // One pin per rider currently on the road, not per order.
  const riderIdsEnRoute = new Set(
    activeOrders.filter((o) => o.status === 'out_for_delivery' && o.riderId).map((o) => o.riderId as string),
  );
  const pins: RiderPin[] = PLACEHOLDER_ACTIVE_RIDERS.filter((r) => riderIdsEnRoute.has(r.id)).map((r) => ({
    rider: r,
    orderCount: r.activeOrders,
  }));

  return (
    <Card
      title="Live Delivery"
      subtitle={activeOrders.length > 1 ? `${activeOrders.length} orders in progress` : 'Most recent in-progress order'}
      action={
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-success">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Live
        </span>
      }
      className="flex h-full min-w-0 flex-col"
    >
      <DeliveryMap pins={pins} />

      {/* Order switcher — only shows up when there's actually more than
          one active order to switch between. */}
      {activeOrders.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {activeOrders.map((o) => {
            const orderRider = PLACEHOLDER_ACTIVE_RIDERS.find((r) => r.id === o.riderId);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setSelectedOrderId(o.id)}
                className={clsx(
                  'flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-left transition-colors',
                  o.id === selectedOrderId ? 'border-ink bg-ink text-white' : 'border-border bg-card text-ink hover:bg-accent',
                )}
              >
                <span className="text-xs font-semibold">{o.id}</span>
                <span className={clsx('text-[10px]', o.id === selectedOrderId ? 'text-white/70' : 'text-muted')}>
                  {orderRider ? orderRider.name.split(' ')[0] : 'Awaiting rider'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted">Tracking ID</p>
          <p className="text-sm font-semibold text-ink">{order.id}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusPill status={order.status} />
          <LiveTicker key={`${order.id}-${order.status}`} />
        </div>
      </div>

      <div className="mt-4 flex flex-1 flex-col gap-3 border-t border-border pt-4">
        {STAGE_ORDER.map((stage, i) => {
          const done = currentStageIndex >= 0 && i <= currentStageIndex;
          return (
            <div key={stage} className="flex items-center gap-3">
              <span className={done ? 'h-2 w-2 rounded-full bg-ink' : 'h-2 w-2 rounded-full bg-border'} />
              <span className={done ? 'flex-1 text-xs font-medium text-ink' : 'flex-1 text-xs font-medium text-muted'}>
                {CHECKPOINT_LABELS[stage]}
              </span>
              <span className="text-xs text-muted">{done ? CHECKPOINT_TIMES[stage] : '—'}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink">
          <Bike size={15} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-muted">Rider on duty</p>
          {rider ? (
            <>
              <p className="truncate text-sm font-semibold text-ink">{rider.name}</p>
              <p className="flex items-center gap-1 truncate text-[11px] text-muted">
                <Phone size={10} />
                {rider.phone}
              </p>
            </>
          ) : (
            <p className="truncate text-sm font-semibold text-muted">Awaiting rider assignment</p>
          )}
        </div>
        <ChevronRight size={15} className="shrink-0 text-muted" />
      </div>
    </Card>
  );
}
