'use client';

import clsx from 'clsx';
import { Bike, ChevronRight, Clock, Loader2 } from 'lucide-react';
import type { PartnerOrder } from '@/lib/partnerApi';
import { formatInr } from '@/lib/format';
import { customerName, orderWhen, waitInfo } from './orderMeta';
import { ItemStack, OrderActions, PaymentBadge, StatusPill } from './OrderBits';

export interface OrderRowHandlers {
  onOpen: (id: string) => void;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onMarkPacked?: (id: string) => void;
  acceptedIds?: Set<string>;
  actioningId?: string | null;
}

// Grid-view order card. Top: who and when; middle: what (item stack); bottom:
// how much and the one next action. New orders get Accept/Reject right on the
// card so the commonest job never needs the details panel. The order number
// is the keyboard entry to details; the whole card is a pointer shortcut.
export function OrderCard({ order, now, ...h }: { order: PartnerOrder; now: number } & OrderRowHandlers) {
  const isNew = order.status === 'placed';
  const wait = isNew ? waitInfo(order.placed_at, now) : null;

  return (
    <article
      onClick={() => h.onOpen(order.id)}
      className={clsx(
        'group flex cursor-pointer flex-col gap-4 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 transition-shadow hover:shadow-[0_6px_20px_-8px_rgba(15,23,42,0.18)] sm:p-5',
        isNew ? 'ring-accent/25' : 'ring-transparent',
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex min-w-0 items-baseline gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                h.onOpen(order.id);
              }}
              aria-label={`Open order ${order.order_number}`}
              className="tnum shrink-0 rounded text-[15px] font-semibold text-ink hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              #{order.order_number}
            </button>
            <span className="truncate text-sm text-slate-500">{customerName(order)}</span>
          </h3>
          <p className="tnum mt-1 text-[13px] text-slate-500">{orderWhen(order.placed_at, now)}</p>
        </div>
        <StatusPill status={order.status} />
      </header>

      <div className="flex min-w-0 items-center justify-between gap-3">
        <ItemStack order={order} />
        {wait && (
          <span className={clsx('tnum inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', wait.className)}>
            <Clock size={12} aria-hidden />
            {wait.label}
          </span>
        )}
      </div>

      <footer className="flex flex-wrap items-end justify-between gap-x-3 gap-y-3 border-t border-slate-100 pt-4">
        <div className="min-w-0">
          <p className="tnum text-2xl font-semibold leading-none tracking-tight text-ink">{formatInr(order.total)}</p>
          <div className="mt-2">
            <PaymentBadge order={order} />
          </div>
        </div>

        {isNew ? (
          <OrderActions
            order={order}
            onAccept={h.onAccept}
            onReject={h.onReject}
            onMarkPacked={h.onMarkPacked}
            accepted={h.acceptedIds?.has(order.id)}
            busy={h.actioningId === order.id}
            anyBusy={h.actioningId != null}
            size="md"
          />
        ) : (
          <div className="flex items-center gap-3">
            <StatusHint status={order.status} />
            <span className="inline-flex items-center gap-0.5 text-sm font-medium text-slate-700 group-hover:text-accent">
              View details
              <ChevronRight size={16} aria-hidden />
            </span>
          </div>
        )}
      </footer>
    </article>
  );
}

// What's happening after the hand-off, so a packed order doesn't look stuck.
export function StatusHint({ status }: { status: PartnerOrder['status'] }) {
  if (status === 'packed') {
    return (
      <span className="hidden items-center gap-1.5 text-xs font-medium text-amber-700 min-[420px]:inline-flex">
        <Loader2 size={13} className="animate-spin" aria-hidden />
        Finding rider
      </span>
    );
  }
  if (status === 'out_for_delivery') {
    return (
      <span className="hidden items-center gap-1.5 text-xs font-medium text-violet-700 min-[420px]:inline-flex">
        <Bike size={13} aria-hidden />
        On the way
      </span>
    );
  }
  return null;
}

export function OrderCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4 rounded-2xl bg-white p-5" aria-hidden>
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-4 w-40 rounded-full bg-slate-100" />
          <div className="h-3 w-24 rounded-full bg-slate-100" />
        </div>
        <div className="h-6 w-20 rounded-full bg-slate-100" />
      </div>
      <div className="flex gap-1">
        <div className="h-8 w-8 rounded-xl bg-slate-100" />
        <div className="h-8 w-8 rounded-xl bg-slate-100" />
        <div className="h-8 w-8 rounded-xl bg-slate-100" />
      </div>
      <div className="flex items-end justify-between border-t border-slate-100 pt-4">
        <div className="h-7 w-24 rounded-full bg-slate-100" />
        <div className="h-10 w-36 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}
