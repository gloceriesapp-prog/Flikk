'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import clsx from 'clsx';
import { CalendarDays, ChevronDown, LayoutGrid, List, Search, X } from 'lucide-react';
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
  search: string;
  onSearchChange: (value: string) => void;
  view: OrdersView;
  onViewChange: (view: OrdersView) => void;
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
  search,
  onSearchChange,
  view,
  onViewChange,
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
    <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      <div role="group" aria-label="Filter by status" className="inline-flex shrink-0 gap-0.5 rounded-full bg-white p-1">
        {ORDER_FILTERS.map(status => <button key={status} type="button" onClick={() => onFilterChange(status)} aria-pressed={filter === status}
          className={clsx('h-9 whitespace-nowrap rounded-full px-3 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-black', filter === status ? 'bg-gray-200 text-black' : 'text-slate-600 hover:bg-gray-100 hover:text-black')}>
          {status === 'all' ? 'All' : STATUS_META[status].label}
        </button>)}
      </div>
      <label className="relative block min-w-[220px] flex-1 basis-[320px]">
        <span className="sr-only">Search orders</span>
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
        <input ref={searchRef} type="search" value={search} onChange={event => onSearchChange(event.target.value)}
          onKeyDown={event => { if (event.key === 'Escape' && search) { event.preventDefault(); onSearchChange(''); } }}
          placeholder="Search orders"
          className="h-11 w-full rounded-full border border-slate-200/70 bg-white pl-9 pr-14 text-[13px] text-ink outline-none placeholder:text-slate-400 focus:border-black/40 [&::-webkit-search-cancel-button]:hidden" />
        {search ? <button type="button" onClick={() => { onSearchChange(''); searchRef.current?.focus(); }} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-gray-100 hover:text-black"><X size={16} /></button>
          : <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[10px] font-medium text-slate-500">{isMac ? '⌘K' : 'Ctrl K'}</kbd>}
      </label>
      <label className="relative shrink-0">
        <span className="sr-only">Date range</span>
        <CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden />
        <select value={dateRange} onChange={event => onDateRangeChange(event.target.value as DateRange)} className="h-11 appearance-none rounded-full border border-slate-200/70 bg-white pl-9 pr-8 text-[13px] font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-black/30">
          {DATE_RANGES.map(range => <option key={range.key} value={range.key}>{range.label}</option>)}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
      </label>
      <div role="group" aria-label="Layout" className="flex h-11 shrink-0 items-center rounded-full bg-white p-1">
        {([['grid', LayoutGrid, 'Grid view'], ['list', List, 'List view']] as const).map(([key, Icon, label]) => <button key={key} type="button" onClick={() => onViewChange(key)} aria-pressed={view === key} aria-label={label} title={label}
          className={clsx('flex h-9 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-black', view === key ? 'bg-gray-200 text-black' : 'text-slate-500 hover:bg-gray-100 hover:text-black')}><Icon size={17} aria-hidden /></button>)}
      </div>
    </div>
  );
}
