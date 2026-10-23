'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PartnerOrder } from '@/lib/partnerApi';
import { formatInr } from '@/lib/format';
import { customerName, orderWhen, waitInfo } from './orderMeta';
import { ItemStack, OrderActions, PaymentBadge, StatusPill } from './OrderBits';
import { StatusHint, type OrderRowHandlers } from './OrderCard';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// Windowed page list: 1 … around-current … last, so a store with many
// orders never renders 30 page buttons.
function pageList(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('gap');
    out.push(sorted[i]);
  }
  return out;
}

// List view: a boxed table with clear column and row dividers on desktop (row click opens details,
// the order number is the keyboard entry) and stacked rows below lg, where
// eight columns can't fit a phone. Paginated so a long history stays fast.
export function OrdersTable({
  orders,
  now,
  resetKey,
  ...h
}: {
  orders: PartnerOrder[];
  now: number;
  // Changes only when the owner changes filters/search — NOT on every 12s
  // poll — so a background refresh never yanks them back to page 1.
  resetKey: string;
} & OrderRowHandlers) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  // Render-phase reset when the filter set changes — the React-blessed
  // alternative to a setState effect.
  const [prevKey, setPrevKey] = useState(resetKey);
  if (resetKey !== prevKey) {
    setPrevKey(resetKey);
    setPage(1);
  }

  const pageCount = Math.max(1, Math.ceil(orders.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  const rows = orders.slice(start, start + pageSize);
  const actionProps = (o: PartnerOrder) => ({
    order: o,
    onAccept: h.onAccept,
    onReject: h.onReject,
    onMarkPacked: h.onMarkPacked,
    accepted: h.acceptedIds?.has(o.id),
    busy: h.actioningId === o.id,
    anyBusy: h.actioningId != null,
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {/* Desktop table */}
        <table className="hidden w-full border-collapse text-left lg:table">
          <caption className="sr-only">Store orders with customer, items, status, amount and actions</caption>
          <thead className="bg-slate-50">
            <tr className="divide-x divide-slate-200 border-b border-slate-200 text-[14px] font-semibold text-black">
              <th scope="col" className="px-4 py-3.5 font-semibold">Order</th>
              <th scope="col" className="px-4 py-3.5 font-semibold">Customer</th>
              <th scope="col" className="hidden px-4 py-3.5 font-semibold xl:table-cell">Items</th>
              <th scope="col" className="px-4 py-3.5 font-semibold">Status</th>
              <th scope="col" className="px-4 py-3.5 text-right font-semibold">Amount</th>
              <th scope="col" className="px-4 py-3.5 text-right font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => {
              const wait = o.status === 'placed' ? waitInfo(o.placed_at, now) : null;
              return (
                <tr
                  key={o.id}
                  onClick={() => h.onOpen(o.id)}
                  className="cursor-pointer divide-x divide-slate-200 border-b border-slate-200 align-middle transition-colors last:border-b-0 hover:bg-slate-50/70"
                >
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        h.onOpen(o.id);
                      }}
                      aria-label={`Open order ${o.order_number}`}
                      className="tnum rounded text-[15px] font-semibold text-ink hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      #{o.order_number}
                    </button>
                    <p className="tnum mt-0.5 whitespace-nowrap text-xs text-slate-500">{orderWhen(o.placed_at, now)}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="max-w-[200px] truncate text-[14px] font-medium text-ink">{customerName(o)}</p>
                    <p className="tnum truncate text-xs text-slate-500">{o.users?.phone ?? '—'}</p>
                  </td>
                  <td className="hidden px-4 py-4 xl:table-cell">
                    <ItemStack order={o} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col items-start gap-1">
                      <StatusPill status={o.status} />
                      {wait && <span className={clsx('tnum rounded-full px-2 py-0.5 text-[11px] font-medium', wait.className)}>{wait.label}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <p className="tnum text-[15px] font-semibold text-ink">{formatInr(o.total)}</p>
                    <div className="mt-1 flex justify-end">
                      <PaymentBadge order={o} />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end">
                      {o.status === 'placed' ? (
                        <OrderActions {...actionProps(o)} />
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <StatusHint status={o.status} />
                          <ChevronRight size={16} className="text-slate-300" aria-hidden />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Phone rows */}
        <ul className="divide-y divide-slate-100 lg:hidden">
          {rows.map((o) => {
            const wait = o.status === 'placed' ? waitInfo(o.placed_at, now) : null;
            return (
              <li key={o.id} onClick={() => h.onOpen(o.id)} className="flex cursor-pointer flex-col gap-2.5 px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        h.onOpen(o.id);
                      }}
                      aria-label={`Open order ${o.order_number}`}
                      className="tnum rounded text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      #{o.order_number}
                    </button>
                    <p className="truncate text-[13px] text-slate-500">
                      {customerName(o)} · <span className="tnum">{orderWhen(o.placed_at, now)}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tnum text-[15px] font-semibold text-ink">{formatInr(o.total)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusPill status={o.status} />
                  <PaymentBadge order={o} />
                  {wait && <span className={clsx('tnum rounded-full px-2 py-0.5 text-xs font-medium', wait.className)}>{wait.label}</span>}
                </div>
                {o.status === 'placed' && (
                  <div className="pt-1">
                    <OrderActions {...actionProps(o)} stretch />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer: per-page select · windowed pages */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-slate-500">
        <label className="flex items-center gap-2">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="tnum h-8 rounded-full border border-slate-200 bg-white px-2.5 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <span className="tnum hidden sm:inline">
          {start + 1}–{Math.min(start + pageSize, orders.length)} of {orders.length}
        </span>

        {pageCount > 1 && (
          <nav aria-label="Pages" className="flex items-center gap-1">
            <PageButton onClick={() => setPage(safePage - 1)} disabled={safePage === 1} label="Previous page">
              <ChevronLeft size={16} />
            </PageButton>
            {pageList(safePage, pageCount).map((p, i) =>
              p === 'gap' ? (
                <span key={`gap-${i}`} className="px-1 text-slate-400">
                  …
                </span>
              ) : (
                <PageButton key={p} onClick={() => setPage(p)} active={p === safePage} label={`Page ${p}`}>
                  {p}
                </PageButton>
              ),
            )}
            <PageButton onClick={() => setPage(safePage + 1)} disabled={safePage === pageCount} label="Next page">
              <ChevronRight size={16} />
            </PageButton>
          </nav>
        )}
      </div>
    </div>
  );
}

function PageButton({
  onClick,
  disabled,
  active,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'tnum flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40',
        active ? 'bg-accent text-white' : 'text-slate-600 hover:bg-white',
      )}
    >
      {children}
    </button>
  );
}

export function OrdersTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0">
          <div className="h-4 w-28 rounded-full bg-slate-100" />
          <div className="hidden h-4 w-32 rounded-full bg-slate-100 sm:block" />
          <div className="hidden h-8 w-24 rounded-xl bg-slate-100 md:block" />
          <div className="h-6 w-20 rounded-full bg-slate-100" />
          <div className="ml-auto h-4 w-16 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
