'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import clsx from 'clsx';
import { CalendarDays, ChevronDown, Download, LayoutGrid, List, Search, X } from 'lucide-react';
import type { OrderStatus } from '@/lib/partnerApi';
import { STATUS_META, type StatusFilter } from './orderMeta';

export const ORDER_FILTERS: Array<OrderStatus | 'all'> = ['all', 'placed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'];

// Date-range presets, applied to `placed_at`. All real, computed client-side
// from timestamps the orders already carry — no new API surface.
export type DateRange = 'all' | 'today' | '7d' | '30d';
const DATE_RANGES: { key: DateRange; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
];

export type OrdersView = 'grid' | 'list';

interface Props {
  filter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onExport: () => void;
  exportDisabled?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  view: OrdersView;
  onViewChange: (view: OrdersView) => void;
  resultCount: number | null;
}

// Mac shows ⌘K, everything else Ctrl K. Read through useSyncExternalStore so
// the server snapshot ("⌘") never mismatches on hydration.
const subscribeNoop = () => () => {};
function useIsMac(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent),
    () => true,
  );
}

export function OrdersFilterBar({
  filter,
  onFilterChange,
  dateRange,
  onDateRangeChange,
  onExport,
  exportDisabled,
  search,
  onSearchChange,
  view,
  onViewChange,
  resultCount,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const isMac = useIsMac();

  // ⌘K / Ctrl+K jumps to search from anywhere on the page — the fastest way
  // to find the order a customer is calling about.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        {/* Status tabs — scroll sideways on a phone instead of wrapping. */}
        <div className="-mx-3 overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:px-0 xl:shrink-0">
          <div role="group" aria-label="Filter by status" className="inline-flex gap-1 rounded-full bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            {ORDER_FILTERS.map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => onFilterChange(f)}
                  aria-pressed={active}
                  className={clsx(
                    'h-9 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    active ? 'bg-accent-soft text-accent' : 'text-slate-600 hover:bg-slate-50 hover:text-ink',
                  )}
                >
                  {f === 'all' ? 'All' : STATUS_META[f].label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Search orders</span>
          <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && search) {
                e.preventDefault();
                onSearchChange('');
              }
            }}
            placeholder="Search order no., customer or phone"
            className="h-11 w-full rounded-full bg-white pl-11 pr-16 text-sm text-ink shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none ring-1 ring-transparent transition placeholder:text-slate-400 focus:ring-2 focus:ring-accent [&::-webkit-search-cancel-button]:hidden"
          />
          {search ? (
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                searchRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-ink"
            >
              <X size={16} />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[11px] font-medium text-slate-500 sm:block">
              {isMac ? '⌘K' : 'Ctrl K'}
            </kbd>
          )}
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <p className="tnum mr-auto text-sm text-slate-500" aria-live="polite">
          {resultCount === null ? ' ' : `${resultCount} ${resultCount === 1 ? 'order' : 'orders'}`}
        </p>

        <label className="relative">
          <span className="sr-only">Date range</span>
          <CalendarDays size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden />
          <select
            value={dateRange}
            onChange={(e) => onDateRangeChange(e.target.value as DateRange)}
            className="h-10 appearance-none rounded-full bg-white pl-10 pr-9 text-sm font-medium text-ink shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {DATE_RANGES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
        </label>

        <button
          type="button"
          onClick={onExport}
          disabled={exportDisabled}
          title="Export CSV"
          className="flex h-10 items-center gap-2 rounded-full bg-white px-3 text-sm sm:px-4 font-medium text-ink shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={16} aria-hidden />
          <span className="sr-only sm:not-sr-only">Export CSV</span>
        </button>

        <div role="group" aria-label="Layout" className="flex rounded-full bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {(
            [
              ['grid', LayoutGrid, 'Grid view'],
              ['list', List, 'List view'],
            ] as const
          ).map(([key, Icon, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onViewChange(key)}
              aria-pressed={view === key}
              aria-label={label}
              title={label}
              className={clsx(
                'flex h-8 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                view === key ? 'bg-accent-soft text-accent' : 'text-slate-500 hover:text-ink',
              )}
            >
              <Icon size={17} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
