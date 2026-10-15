'use client';

import clsx from 'clsx';
import { ReceiptText } from 'lucide-react';
import type { OrderStatus } from '@/lib/partnerApi';
import { STATUS_META, type StatusFilter } from './orderMeta';

const TILES: OrderStatus[] = ['placed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'];

// Count-per-status strip. Each tile is also a filter, so "3 New" is one
// click from being the only thing on screen. The filled accent tile is the
// "All orders" reset. Counts follow the date range + search, not the status
// tab, so the tiles always add up to the All tile.
export function OrdersSummaryStrip({
  counts,
  active,
  onSelect,
  loading,
}: {
  counts: Record<StatusFilter, number>;
  active: StatusFilter;
  onSelect: (f: StatusFilter) => void;
  loading: boolean;
}) {
  return (
    // Phones: one swipeable row instead of three stacked rows of tiles, so
    // the orders themselves start above the fold.
    <div className="-mx-3 flex gap-2.5 -my-1 overflow-x-auto px-3 py-1 [scrollbar-width:none] sm:mx-0 sm:my-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:p-0 xl:grid-cols-[1.35fr_repeat(5,minmax(0,1fr))]">
      <button
        type="button"
        onClick={() => onSelect('all')}
        aria-pressed={active === 'all'}
        className={clsx(
          'relative flex min-h-[84px] w-[168px] shrink-0 flex-col sm:min-h-[92px] sm:w-auto justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#2f6dff] to-accent-strong p-4 text-left text-white shadow-[0_8px_24px_-12px_rgba(21,93,252,0.7)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:p-5',
          active !== 'all' && 'opacity-90 hover:opacity-100',
        )}
      >
        {/* Soft highlight so the gradient reads as a surface, not a flat fill. */}
        <span className="pointer-events-none absolute -top-10 -right-8 h-28 w-28 rounded-full bg-white/10" aria-hidden />
        <span className="flex items-center justify-between gap-2">
          <span className="text-[15px] font-medium text-white/90">All orders</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <ReceiptText size={18} aria-hidden />
          </span>
        </span>
        <span className="tnum text-[28px] font-semibold leading-none tracking-tight sm:text-3xl">{loading ? '–' : counts.all}</span>
      </button>

      {TILES.map((status) => {
        const meta = STATUS_META[status];
        const isActive = active === status;
        return (
          <button
            key={status}
            type="button"
            onClick={() => onSelect(isActive ? 'all' : status)}
            aria-pressed={isActive}
            className={clsx(
              'flex min-h-[84px] w-[136px] shrink-0 flex-col sm:min-h-[92px] sm:w-auto justify-between rounded-2xl bg-white p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:p-5',
              isActive ? 'ring-accent' : 'ring-transparent hover:ring-slate-200',
            )}
          >
            <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <span className={clsx('h-2 w-2 rounded-full', meta.dot)} aria-hidden />
              {meta.label}
            </span>
            <span className={clsx('tnum text-[28px] font-semibold leading-none tracking-tight sm:text-3xl', meta.count)}>
              {loading ? '–' : counts[status]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
