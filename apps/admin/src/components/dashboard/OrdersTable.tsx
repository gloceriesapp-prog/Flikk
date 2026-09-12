'use client';

// Matches the reference's Leads table exactly: List/Grid toggle,
// Filter/Export/Add-record button trio, checkbox column, sortable column
// headers, and numbered pagination with a per-page picker — same
// component shape, Flikk's own OrderStatus values instead of lead-warmth
// pills.
//
// Real data now (app/api/orders, service-role Supabase read — orders has
// no public RLS policy admin can use) with a live Supabase Realtime
// subscription (useAdminRealtime -> app/api/realtime's SSE relay) so any
// order write from the customer, partner, or rider app refetches this
// table without a manual page reload.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Download, Grid3x3, List, Plus, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';
import type { Order, OrderStatus } from '@/lib/types';
import { StatusPill } from '@/components/ui/StatusPill';

const FILTERS: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'All Orders', value: 'all' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'In transit', value: 'out_for_delivery' },
  { label: 'Pending', value: 'placed' },
  { label: 'Packed', value: 'packed' },
];

const COLUMNS: { key: keyof Order; label: string }[] = [
  { key: 'id', label: 'Order' },
  { key: 'storeName', label: 'Store' },
  { key: 'zone', label: 'Zone' },
  { key: 'placedAt', label: 'Placed at' },
  { key: 'amount', label: 'Amount' },
];

const PAGE_SIZE_OPTIONS = [5, 10, 20];

export function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<keyof Order>('placedAt');
  const [sortAsc, setSortAsc] = useState(true);
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);

  const loadOrders = useCallback(async () => {
    const res = await fetch('/api/orders');
    if (res.ok) setOrders(await res.json());
  }, []);

  useEffect(() => {
    // Deferred to a microtask — same react-hooks/set-state-in-effect
    // pattern as inventory/page.tsx and stores/page.tsx.
    Promise.resolve().then(loadOrders);
  }, [loadOrders]);

  useAdminRealtime(loadOrders);

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortAsc]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const rows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function toggleSort(key: keyof Order) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
    setPage(1);
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-full border border-border bg-canvas p-1">
          <button className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-white">
            <List size={13} />
            List
          </button>
          <button className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-ink-soft hover:text-ink">
            <Grid3x3 size={13} />
            Grid
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs font-semibold text-ink-soft hover:text-ink"
          >
            <SlidersHorizontal size={13} />
            Filter
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs font-semibold text-ink-soft hover:text-ink"
          >
            <Download size={13} />
            Export
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            <Plus size={13} />
            Add New Order
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-1 overflow-x-auto rounded-full border border-border bg-canvas p-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => {
              setFilter(f.value);
              setPage(1);
            }}
            className={clsx(
              'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
              filter === f.value ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="w-8 pb-3">
                <input type="checkbox" className="h-4 w-4 rounded border-border" aria-label="Select all" />
              </th>
              {COLUMNS.map((col) => (
                <th key={col.key} className="pb-3 pr-4 font-medium">
                  <button type="button" onClick={() => toggleSort(col.key)} className="flex items-center gap-1 hover:text-ink">
                    {col.label}
                    <ChevronDown
                      size={12}
                      className={clsx(
                        'transition-transform',
                        sortKey === col.key ? 'text-ink' : 'text-muted/60',
                        sortKey === col.key && !sortAsc && 'rotate-180'
                      )}
                    />
                  </button>
                </th>
              ))}
              <th className="pb-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((order) => (
              <tr key={order.id} className="border-b border-border last:border-0">
                <td className="py-3">
                  <input type="checkbox" className="h-4 w-4 rounded border-border" aria-label={`Select ${order.id}`} />
                </td>
                <td className="py-3 pr-4 font-medium text-ink">#{order.id.slice(0, 6).toUpperCase()}</td>
                <td className="py-3 pr-4 text-ink-soft">{order.storeName}</td>
                <td className="py-3 pr-4 text-ink-soft">{order.zone}</td>
                <td className="py-3 pr-4 text-ink-soft">{formatDateTime(order.placedAt)}</td>
                <td className="py-3 pr-4 font-medium tabular-nums text-ink">{formatCurrency(order.amount)}</td>
                <td className="py-3">
                  <StatusPill status={order.status} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-muted">
                  No orders match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex items-center gap-2 text-xs text-muted">
          Show
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="appearance-none rounded-lg border border-border bg-canvas py-1 pl-2.5 pr-6 text-xs font-semibold text-ink focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <ChevronDown size={11} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-muted" />
          </div>
          orders per page
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous page"
            disabled={currentPage === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-ink-soft disabled:opacity-30"
          >
            <ChevronLeft size={13} />
          </button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              className={clsx(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                n === currentPage ? 'bg-ink text-white' : 'text-ink-soft hover:bg-canvas'
              )}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            aria-label="Next page"
            disabled={currentPage === pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-ink-soft disabled:opacity-30"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
