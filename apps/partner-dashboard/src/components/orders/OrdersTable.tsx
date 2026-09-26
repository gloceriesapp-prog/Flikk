'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import type { PartnerOrder } from '@/lib/partnerApi';
import { formatInr, statusLabel } from '@/lib/format';
import { paymentStatus } from '@/lib/orderPayment';
import { avatarColorFor, initialsFor } from '@/lib/avatar';

// Bordered grid table matching the reference: a checkbox column, full cell
// borders (vertical + horizontal), gray header, orange-edge selected rows,
// and a per-page / numbered / go-to-page footer bar.
const COLUMNS = '44px 1.1fr 1.8fr 1.2fr 1.3fr 1.1fr 1fr';
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const STATUS_TONE: Record<PartnerOrder['status'], { text: string; dot: string; chip: string }> = {
  placed: { text: 'text-amber-600', dot: 'bg-amber-500', chip: 'bg-amber-50' },
  packed: { text: 'text-blue-600', dot: 'bg-blue-500', chip: 'bg-blue-50' },
  out_for_delivery: { text: 'text-blue-600', dot: 'bg-blue-500', chip: 'bg-blue-50' },
  delivered: { text: 'text-emerald-600', dot: 'bg-emerald-500', chip: 'bg-emerald-50' },
  cancelled: { text: 'text-red-600', dot: 'bg-red-500', chip: 'bg-red-50' },
};

function orderDate(iso: string): { day: string; time: string } {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  };
}

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

export function OrdersTable({ orders }: { orders: PartnerOrder[] }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [gotoInput, setGotoInput] = useState('');

  // Reset page + selection whenever the filtered set changes underneath us —
  // render-phase adjustment, the React-blessed alternative to a setState effect.
  const [prevOrders, setPrevOrders] = useState(orders);
  if (orders !== prevOrders) {
    setPrevOrders(orders);
    setPage(1);
    setSelected(new Set());
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-hairline py-20">
        <p className="text-sm font-medium text-neutral-700">No orders match this view.</p>
        <p className="text-sm text-neutral-400">Try a different filter or search term.</p>
      </div>
    );
  }

  const pageCount = Math.ceil(orders.length / pageSize);
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  const rows = orders.slice(start, start + pageSize);

  const allOnPageSelected = rows.length > 0 && rows.every((o) => selected.has(o.id));

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) rows.forEach((o) => next.delete(o.id));
      else rows.forEach((o) => next.add(o.id));
      return next;
    });
  }

  function goToPage() {
    const n = parseInt(gotoInput, 10);
    if (!Number.isNaN(n)) setPage(Math.min(pageCount, Math.max(1, n)));
    setGotoInput('');
  }

  return (
    <div className="relative flex flex-col gap-4">
      <div className="overflow-x-auto rounded-xl border border-hairline">
        <div className="min-w-[720px]">
          {/* Header */}
          <div
            className="grid items-center border-b border-hairline bg-neutral-50 text-[13px] font-medium text-neutral-500"
            style={{ gridTemplateColumns: COLUMNS }}
          >
            <label className="flex h-full items-center justify-center border-r border-hairline px-3 py-3">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                onChange={togglePage}
                className="h-4 w-4 rounded accent-orange-500"
                aria-label="Select all on this page"
              />
            </label>
            <span className="border-r border-hairline px-4 py-3">Order ID</span>
            <span className="border-r border-hairline px-4 py-3">Customer</span>
            <span className="border-r border-hairline px-4 py-3">Status</span>
            <span className="border-r border-hairline px-4 py-3">Location</span>
            <span className="border-r border-hairline px-4 py-3">Date</span>
            <span className="px-4 py-3">Amount</span>
          </div>

          {/* Rows */}
          {rows.map((order) => {
            const customerName = order.addresses?.recipient_name ?? order.users?.name ?? 'Customer';
            const tone = STATUS_TONE[order.status];
            const location = order.addresses?.landmark ?? order.addresses?.line1 ?? '—';
            const payment = paymentStatus(order);
            const date = orderDate(order.placed_at);
            const isSelected = selected.has(order.id);
            return (
              <div
                key={order.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/orders/${order.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && router.push(`/orders/${order.id}`)}
                className={`relative grid cursor-pointer items-stretch border-b border-hairline transition-colors last:border-b-0 ${
                  isSelected ? 'bg-orange-50/60' : 'hover:bg-neutral-50/70'
                }`}
                style={{ gridTemplateColumns: COLUMNS }}
              >
                {/* Orange edge bar on selected rows (reference cue) */}
                {isSelected && <span className="absolute inset-y-0 left-0 w-[3px] bg-orange-500" />}

                <label
                  className="flex items-center justify-center border-r border-hairline px-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleRow(order.id)}
                    className="h-4 w-4 rounded accent-orange-500"
                    aria-label={`Select order ${order.order_number}`}
                  />
                </label>

                <span className="flex items-center border-r border-hairline px-4 py-3.5 text-[15px] font-semibold text-neutral-900">
                  {order.order_number}
                </span>

                <div className="flex min-w-0 items-center gap-3 border-r border-hairline px-4 py-3.5">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarColorFor(customerName)}`}>
                    {initialsFor(customerName)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-900">{customerName}</p>
                    <p className="truncate text-xs text-neutral-400">{order.users?.phone}</p>
                  </div>
                </div>

                <div className="flex items-center border-r border-hairline px-4 py-3.5">
                  <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium whitespace-nowrap ${tone.chip} ${tone.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                    {statusLabel(order.status)}
                  </span>
                </div>

                <span className="flex items-center truncate border-r border-hairline px-4 py-3.5 text-sm text-neutral-500">
                  {location}
                </span>

                <div className="flex min-w-0 flex-col justify-center border-r border-hairline px-4 py-3.5">
                  <p className="truncate text-[13px] font-medium text-neutral-800">{date.day}</p>
                  <p className="text-xs text-neutral-400">{date.time}</p>
                </div>

                <div className="flex min-w-0 flex-col justify-center px-4 py-3.5">
                  <p className="text-[15px] font-semibold whitespace-nowrap text-neutral-900">{formatInr(order.total)}</p>
                  <p className={`text-xs font-medium ${payment.className.includes('emerald') ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {payment.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer: per-page select · numbered pages · go-to-page */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-neutral-500">
        <div className="flex items-center gap-2">
          <span>Showing per page</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-hairline-strong bg-white px-2.5 py-1.5 text-sm text-neutral-800 outline-none focus:border-neutral-400"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {pageCount > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={safePage === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-hairline text-neutral-500 hover:bg-neutral-50 disabled:opacity-40"
            >
              <ChevronsLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-hairline text-neutral-500 hover:bg-neutral-50 disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            {pageList(safePage, pageCount).map((p, i) =>
              p === 'gap' ? (
                <span key={`gap-${i}`} className="px-1 text-neutral-400">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`h-8 min-w-8 rounded-lg px-2 text-sm font-medium ${
                    p === safePage ? 'bg-orange-500 text-white' : 'border border-hairline text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={safePage === pageCount}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-hairline text-neutral-500 hover:bg-neutral-50 disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
            <button
              type="button"
              onClick={() => setPage(pageCount)}
              disabled={safePage === pageCount}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-hairline text-neutral-500 hover:bg-neutral-50 disabled:opacity-40"
            >
              <ChevronsRight size={15} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span>Go to page</span>
          <input
            value={gotoInput}
            onChange={(e) => setGotoInput(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && goToPage()}
            className="h-8 w-14 rounded-lg border border-hairline-strong bg-white px-2 text-center text-sm text-neutral-800 outline-none focus:border-neutral-400"
            aria-label="Go to page number"
          />
          <button
            type="button"
            onClick={goToPage}
            className="flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-neutral-700 hover:text-black"
          >
            Go <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Floating selection toolbar (reference cue) */}
      {selected.size > 0 && (
        <div className="pointer-events-none sticky bottom-4 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-hairline bg-white px-3 py-2 shadow-lg">
            <span className="text-sm text-neutral-500">
              <span className="font-semibold text-neutral-900">{selected.size}</span> Selected
            </span>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              aria-label="Clear selection"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
