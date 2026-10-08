'use client';

// Admin order list. Server-side filtering and pagination (GET /api/orders?paged=1,
// lib/orders/orderQuery.ts): status pills incl. cancelled and failed, a filter
// panel (placed-at date range, store, search by order number / order or trip id
// / customer name or phone), and CSV export of exactly the current filter
// (GET /api/orders?format=csv). Each row opens the order detail page, where
// the admin actions live. A live Supabase Realtime subscription
// (useAdminRealtime) refetches the current page on any order write.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronLeft, ChevronRight, Download, SlidersHorizontal, X } from 'lucide-react';
import clsx from 'clsx';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';
import type { OrderPage, OrderStatus } from '@/lib/types';
import { StatusPill } from '@/components/ui/StatusPill';
import { fetchStoreOptions, type StoreOption } from '@/lib/supabase/products';
import { CANCELLED_BY_LABELS, orderReasonLabel } from '@/lib/orders/cancelReasons';

type StatusFilter = OrderStatus | 'all' | 'active';

const FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All orders', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Placed', value: 'placed' },
  { label: 'Packed', value: 'packed' },
  { label: 'In transit', value: 'out_for_delivery' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Failed', value: 'failed' },
];

const PAGE_SIZE_OPTIONS = [20, 50, 100];

interface Filters {
  status: StatusFilter;
  from: string;
  to: string;
  storeId: string;
  q: string;
}

const EMPTY_FILTERS: Filters = { status: 'all', from: '', to: '', storeId: '', q: '' };

function filterParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.storeId) params.set('storeId', filters.storeId);
  if (filters.q.trim()) params.set('q', filters.q.trim());
  return params;
}

// Compact page list: first, last and the pages around the current one.
function pageWindow(current: number, count: number): (number | 'gap')[] {
  const pages = new Set([1, count, current - 1, current, current + 1].filter((n) => n >= 1 && n <= count));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('gap');
    out.push(n);
  });
  return out;
}

export function OrdersTable() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [searchDraft, setSearchDraft] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<OrderPage | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const query = useMemo(() => filterParams(filters), [filters]);

  const loadOrders = useCallback(async () => {
    const params = new URLSearchParams(query);
    params.set('paged', '1');
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    try {
      const res = await fetch(`/api/orders?${params}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not load orders.');
      setData(body as OrderPage);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load orders.');
    } finally {
      setLoading(false);
    }
  }, [query, page, pageSize]);

  useEffect(() => {
    // Deferred to a microtask — same react-hooks/set-state-in-effect
    // pattern as inventory/page.tsx and stores/page.tsx.
    Promise.resolve().then(loadOrders);
  }, [loadOrders]);
  useAdminRealtime(loadOrders);

  useEffect(() => {
    fetchStoreOptions().then(setStores).catch(() => setStores([]));
  }, []);

  function update(next: Partial<Filters>) {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  }

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const rows = data?.orders ?? [];
  const activePanelFilters = [filters.from, filters.to, filters.storeId, filters.q].filter(Boolean).length;
  const exportParams = new URLSearchParams(query);
  exportParams.set('format', 'csv');

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <form
          className="flex min-w-[220px] flex-1 items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: searchDraft });
          }}
        >
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search order no., order/trip id, customer name or phone"
            aria-label="Search orders"
            className="w-full max-w-md rounded-full border border-border bg-canvas px-4 py-2 text-sm text-ink focus:outline-none"
          />
          <button type="submit" className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white">Search</button>
        </form>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPanel((v) => !v)}
            aria-expanded={showPanel}
            className={clsx(
              'flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs font-semibold',
              showPanel || activePanelFilters ? 'text-ink' : 'text-ink-soft hover:text-ink',
            )}
          >
            <SlidersHorizontal size={13} />
            Filter{activePanelFilters ? ` (${activePanelFilters})` : ''}
          </button>
          <a
            href={`/api/orders?${exportParams}`}
            className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs font-semibold text-ink-soft hover:text-ink"
          >
            <Download size={13} />
            Export CSV
          </a>
        </div>
      </div>

      {showPanel && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-canvas p-4">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Placed from
            <input type="date" value={filters.from} onChange={(e) => update({ from: e.target.value })}
              className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-ink" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Placed to
            <input type="date" value={filters.to} onChange={(e) => update({ to: e.target.value })}
              className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-ink" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Store
            <select value={filters.storeId} onChange={(e) => update({ storeId: e.target.value })}
              className="min-w-[180px] rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-ink">
              <option value="">All stores</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              setSearchDraft('');
              setPage(1);
            }}
            className="flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-ink-soft hover:text-ink"
          >
            <X size={12} />
            Clear all
          </button>
        </div>
      )}

      <div className="mb-4 flex items-center gap-1 overflow-x-auto rounded-full border border-border bg-canvas p-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => update({ status: f.value })}
            className={clsx(
              'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
              filters.status === f.value ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loadError && <p className="mb-3 text-sm text-danger">{loadError}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="pb-3 pr-4 font-medium">Order</th>
              <th className="pb-3 pr-4 font-medium">Customer</th>
              <th className="pb-3 pr-4 font-medium">Store</th>
              <th className="pb-3 pr-4 font-medium">Placed at</th>
              <th className="pb-3 pr-4 font-medium">Amount</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((order) => (
              <tr key={order.id} className="border-b border-border last:border-0 hover:bg-canvas">
                <td className="py-3 pr-4">
                  <Link href={`/orders/${order.id}`} className="font-medium text-ink hover:underline">
                    {order.orderNumber}
                  </Link>
                  {order.tripId && (
                    <span title={`Trip ${order.tripId}`} className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      Trip {order.tripId.slice(0, 6).toUpperCase()}
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4 text-ink-soft">
                  {order.customerName ?? '—'}
                  {order.customerPhone && <span className="block text-xs text-muted">{order.customerPhone}</span>}
                </td>
                <td className="py-3 pr-4 text-ink-soft">{order.storeName}</td>
                <td className="py-3 pr-4 text-ink-soft">{formatDateTime(order.placedAt)}</td>
                <td className="py-3 pr-4 font-medium tabular-nums text-ink">
                  {formatCurrency(order.amount)}
                  <span className="block text-xs font-normal uppercase text-muted">{order.paymentMethod ?? ''}</span>
                </td>
                <td className="py-3 pr-4">
                  <StatusPill status={order.status} />
                </td>
                <td className="max-w-[220px] py-3 text-xs text-muted">
                  {order.status === 'cancelled' || order.status === 'failed' ? (
                    <>
                      <span className="block truncate text-ink-soft" title={order.cancelReason ?? undefined}>
                        {orderReasonLabel(order.status, order.cancelReason)}
                      </span>
                      {order.cancelledBy && <span>by {CANCELLED_BY_LABELS[order.cancelledBy] ?? order.cancelledBy}</span>}
                    </>
                  ) : '—'}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-muted">
                  No orders match this filter.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-muted">Loading…</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex items-center gap-2 text-xs text-muted">
          {total} order{total === 1 ? '' : 's'} · Show
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Orders per page"
              className="appearance-none rounded-lg border border-border bg-canvas py-1 pl-2.5 pr-6 text-xs font-semibold text-ink focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <ChevronDown size={11} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-muted" />
          </div>
          per page
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous page"
            disabled={currentPage === 1}
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-ink-soft disabled:opacity-30"
          >
            <ChevronLeft size={13} />
          </button>
          {pageWindow(currentPage, pageCount).map((n, i) =>
            n === 'gap' ? (
              <span key={`gap-${i}`} className="px-1 text-xs text-muted">…</span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={clsx(
                  'flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                  n === currentPage ? 'bg-ink text-white' : 'text-ink-soft hover:bg-canvas',
                )}
              >
                {n}
              </button>
            ),
          )}
          <button
            type="button"
            aria-label="Next page"
            disabled={currentPage === pageCount}
            onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-ink-soft disabled:opacity-30"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
