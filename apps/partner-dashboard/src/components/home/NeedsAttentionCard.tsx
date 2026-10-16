'use client';

// The most important card on Home: every order still in 'placed', oldest
// first, each with a one-tap Accept (placed -> packed, the only move a store
// owner can make here). Waiting time ticks live and turns amber after 5 min
// and red after 10, so the order at risk is obvious at a glance.

import Link from 'next/link';
import clsx from 'clsx';
import { BellRing, Check, Clock, Loader2, MoonStar, ShieldAlert } from 'lucide-react';
import type { PartnerOrder } from '@/lib/partnerApi';
import { formatInr } from '@/lib/format';
import { Card } from '@/components/ui/Card';
import { CardLabel, CornerLink, FOCUS_RING, Thumb } from './parts';
import { firstItemImage, itemCount, itemSummary, minutesSince, waitUrgency, type Urgency } from './dashboardData';

// Beyond this the card would push the rest of Home off screen; the rest are a
// click away in Orders.
const MAX_ROWS = 5;

const URGENCY_CHIP: Record<Urgency, string> = {
  ok: 'bg-slate-100 text-slate-600',
  warn: 'bg-amber-50 text-amber-700',
  late: 'bg-red-50 text-red-700',
};

export function NeedsAttentionCard({
  orders,
  now,
  storeState,
  onAccept,
  acceptingId,
}: {
  // 'placed' orders only.
  orders: PartnerOrder[];
  now: number;
  storeState: 'online' | 'offline' | 'suspended' | 'unknown';
  // Absent for demo orders, which have nothing real to accept.
  onAccept?: (order: PartnerOrder) => void;
  acceptingId: string | null;
}) {
  const queue = [...orders].sort((a, b) => +new Date(a.placed_at) - +new Date(b.placed_at));
  const shown = queue.slice(0, MAX_ROWS);
  const hidden = queue.length - shown.length;

  return (
    <Card className={clsx('p-5 sm:p-6', queue.length > 0 && 'ring-1 ring-accent/25')}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <CardLabel icon={BellRing} className="text-lg text-ink">
            Needs your attention
          </CardLabel>
          {queue.length > 0 && (
            <span className="tnum flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-2 text-xs font-semibold text-white">
              {queue.length}
            </span>
          )}
        </div>
        <CornerLink href="/orders" label="Open all orders" />
      </div>

      {queue.length === 0 ? (
        <EmptyState storeState={storeState} />
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {shown.map((order) => (
            <AttentionRow
              key={order.id}
              order={order}
              now={now}
              onAccept={onAccept}
              accepting={acceptingId === order.id}
              busy={acceptingId !== null}
            />
          ))}
          {hidden > 0 && (
            <li>
              <Link
                href="/orders"
                className={clsx('block rounded-xl py-2 text-center text-sm font-medium text-accent hover:text-accent-strong', FOCUS_RING)}
              >
                {hidden} more waiting in Orders
              </Link>
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}

function AttentionRow({
  order,
  now,
  onAccept,
  accepting,
  busy,
}: {
  order: PartnerOrder;
  now: number;
  onAccept?: (order: PartnerOrder) => void;
  accepting: boolean;
  busy: boolean;
}) {
  const waited = minutesSince(order.placed_at, now);
  const urgency = waitUrgency(waited);
  const units = itemCount(order);

  return (
    <li
      className={clsx(
        'flex flex-col gap-3 rounded-2xl border px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4',
        urgency === 'late' ? 'border-red-100 bg-red-50/30' : 'border-slate-100 bg-slate-50/60',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <Thumb src={firstItemImage(order)} name={order.order_items[0]?.products?.name ?? order.order_number} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <p className="text-[15px] font-semibold text-ink">#{order.order_number}</p>
            <span
              className={clsx('tnum inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', URGENCY_CHIP[urgency])}
            >
              <Clock size={12} aria-hidden />
              {waited < 1 ? 'Just now' : `Waiting ${waited} min`}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-slate-500">
            <span className="tnum">
              {units} {units === 1 ? 'item' : 'items'}
            </span>
            {' · '}
            {itemSummary(order)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <p className="tnum text-lg font-semibold text-ink">{formatInr(order.total)}</p>
        <button
          type="button"
          onClick={() => onAccept?.(order)}
          disabled={!onAccept || busy}
          title={onAccept ? undefined : 'Demo order: nothing to accept'}
          aria-label={`Accept order ${order.order_number}`}
          className={clsx(
            'inline-flex h-10 min-w-[108px] items-center justify-center gap-1.5 rounded-full bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50',
            FOCUS_RING,
          )}
        >
          {accepting ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Check size={16} aria-hidden />}
          {accepting ? 'Accepting' : 'Accept'}
        </button>
      </div>
    </li>
  );
}

function EmptyState({ storeState }: { storeState: 'online' | 'offline' | 'suspended' | 'unknown' }) {
  const copy =
    storeState === 'offline'
      ? { icon: MoonStar, tint: 'bg-slate-100 text-slate-500', title: "You're offline", body: 'Go online from the top bar to start getting orders.' }
      : storeState === 'suspended'
        ? { icon: ShieldAlert, tint: 'bg-red-50 text-red-600', title: 'Your store is paused by Gloceries', body: 'Contact support from Help to get back online.' }
        : {
            icon: Check,
            tint: 'bg-emerald-50 text-emerald-600',
            title: 'No new orders',
            body: storeState === 'online' ? "You're online and ready. New orders will show up here." : 'New orders will show up here.',
          };
  const Icon = copy.icon;
  return (
    <div className="mt-4 flex items-center gap-4 rounded-2xl border border-dashed border-slate-200 px-5 py-6">
      <div className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', copy.tint)}>
        <Icon size={20} aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-ink">{copy.title}</p>
        <p className="mt-0.5 text-sm text-slate-500">{copy.body}</p>
      </div>
    </div>
  );
}
