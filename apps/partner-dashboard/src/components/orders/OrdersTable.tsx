'use client';

import { useEffect, useState } from 'react';
import { Bike, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, Package, PackageCheck, X } from 'lucide-react';
import type { PartnerOrder } from '@/lib/partnerApi';
import { formatDateTime, formatInr, statusLabel } from '@/lib/format';
import { paymentStatus } from '@/lib/orderPayment';
import { avatarColorFor, initialsFor } from '@/lib/avatar';

// Bordered grid table matching the reference: a checkbox column, full cell
// borders (vertical + horizontal), gray header, orange-edge selected rows,
// a per-order Actions cell, and a per-page / numbered / go-to-page footer bar.
// Every fr track is minmax(0,…): a bare `fr` has min-width:auto (min-content),
// so each row — its own grid — would size columns to its own content (long
// names, "Searching for rider…") and the vertical borders would drift out of
// line between rows. minmax(0,…) pins every row to identical track widths.
const COLUMNS = '44px minmax(0,1fr) minmax(0,1.3fr) minmax(0,1.1fr) minmax(0,0.95fr) minmax(0,1fr) minmax(0,0.9fr) minmax(0,1.7fr)';
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

// Per-order action cell. Real backend: owner moves 'placed' → 'packed' (Accept)
// or cancels (Reject); every later transition is rider/system-driven, so those
// rows are display-only. Demo mode passes `accepted`/onMarkPacked to unlock a
// two-step preview — Accept stages the order, then Mark packed sends it to
// dispatch — a step the real state machine doesn't have yet (no 'accepted'
// status). onAccept/onReject absent → buttons render disabled, never firing.
// No View button: the whole row opens the item dialog on click.
function OrderActions({
  order,
  onAccept,
  onReject,
  onMarkPacked,
  accepted,
  busy,
  anyBusy,
}: {
  order: PartnerOrder;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onMarkPacked?: (id: string) => void;
  accepted?: boolean;
  busy: boolean;
  anyBusy: boolean;
}) {
  if (order.status === 'placed') {
    // Accepted but not yet packed (demo two-step): show the next action, Mark packed.
    if (accepted) {
      return (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onMarkPacked?.(order.id); }}
          disabled={anyBusy}
          className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PackageCheck size={13} />
          Mark packed
        </button>
      );
    }
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAccept?.(order.id); }}
          disabled={!onAccept || anyBusy}
          title={onAccept ? undefined : 'No real order to accept yet'}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          Accept
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onReject?.(order.id); }}
          disabled={!onReject || anyBusy}
          title={onReject ? undefined : 'No real order to reject yet'}
          className="inline-flex items-center gap-1 rounded-full border border-hairline-strong px-3 py-1.5 text-xs font-semibold text-neutral-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X size={13} />
          Reject
        </button>
      </div>
    );
  }
  if (order.status === 'packed') {
    // Packed → dispatch is broadcasting to nearby riders; show the search state.
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600">
        <Loader2 size={13} className="animate-spin" />
        Searching for rider…
      </span>
    );
  }
  if (order.status === 'out_for_delivery') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600">
        <Bike size={13} />
        On the way
      </span>
    );
  }
  // delivered / cancelled — terminal; no action, row click still opens the dialog.
  return <span className="text-xs text-neutral-300">—</span>;
}

export function OrdersTable({
  orders,
  onAccept,
  onReject,
  onMarkPacked,
  acceptedIds,
  actioningId,
}: {
  orders: PartnerOrder[];
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onMarkPacked?: (id: string) => void;
  acceptedIds?: Set<string>;
  actioningId?: string | null;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [gotoInput, setGotoInput] = useState('');
  // View → item dialog: the order whose contents are shown in the modal. No
  // new page/file — same order_items already in hand, rendered as a sheet.
  const [viewOrder, setViewOrder] = useState<PartnerOrder | null>(null);

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
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-hairline bg-white py-20">
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
      <div className="overflow-x-auto rounded-xl border border-hairline bg-white">
        <div className="min-w-[960px]">
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
            <span className="border-r border-hairline px-4 py-3">Items</span>
            <span className="border-r border-hairline px-4 py-3">Date</span>
            <span className="border-r border-hairline px-4 py-3">Amount</span>
            <span className="px-4 py-3">Action</span>
          </div>

          {/* Rows */}
          {rows.map((order) => {
            const customerName = order.addresses?.recipient_name ?? order.users?.name ?? 'Customer';
            const tone = STATUS_TONE[order.status];
            const date = orderDate(order.placed_at);
            const isSelected = selected.has(order.id);
            return (
              <div
                key={order.id}
                role="button"
                tabIndex={0}
                onClick={() => setViewOrder(order)}
                onKeyDown={(e) => e.key === 'Enter' && setViewOrder(order)}
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

                <div className="flex min-w-0 items-center border-r border-hairline px-4 py-3.5">
                  <p className="truncate text-sm font-medium text-neutral-900">{customerName}</p>
                </div>

                <div className="flex items-center border-r border-hairline px-4 py-3.5">
                  <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium whitespace-nowrap ${tone.chip} ${tone.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                    {statusLabel(order.status)}
                  </span>
                </div>

                <div className="flex items-center border-r border-hairline px-4 py-3.5">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-neutral-50 px-2.5 py-1.5 text-sm font-medium whitespace-nowrap text-neutral-700">
                    View {order.order_items.length} {order.order_items.length === 1 ? 'item' : 'items'}
                    <ChevronDown size={14} className="text-neutral-400" />
                  </span>
                </div>

                <div className="flex min-w-0 flex-col justify-center border-r border-hairline px-4 py-3.5">
                  <p className="truncate text-[13px] font-medium text-neutral-800">{date.day}</p>
                  <p className="text-xs text-neutral-400">{date.time}</p>
                </div>

                <div className="flex min-w-0 flex-col justify-center border-r border-hairline px-4 py-3.5">
                  <p className="text-[15px] font-semibold whitespace-nowrap text-neutral-900">{formatInr(order.total)}</p>
                  {/* Payment method, not capture status. Schema is online-payment-only
                      (no COD column exists — see provider_payment_id note), so a
                      captured order is "Paid online" and an uncaptured one is "COD"
                      (cash on delivery, settled by the rider at the door). */}
                  <p className={`text-xs font-medium ${order.provider_payment_id ? 'text-emerald-600' : 'text-neutral-500'}`}>
                    {order.provider_payment_id ? 'Paid online' : 'COD'}
                  </p>
                </div>

                <div className="flex items-center px-4 py-3.5">
                  <OrderActions
                    order={order}
                    onAccept={onAccept}
                    onReject={onReject}
                    onMarkPacked={onMarkPacked}
                    accepted={acceptedIds?.has(order.id) ?? false}
                    busy={actioningId === order.id}
                    anyBusy={actioningId != null}
                  />
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

      {viewOrder && <OrderItemsDialog order={viewOrder} onClose={() => setViewOrder(null)} />}
    </div>
  );
}

// Order-contents sheet opened from a row's View button. Shows each line's
// product photo (package icon when none), name + pack size, ordered quantity,
// unit price and line total, then the money summary — item total, delivery
// fee, commission, grand total. Read-only; same order_items already loaded.
function OrderItemsDialog({ order, onClose }: { order: PartnerOrder; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const customerName = order.addresses?.recipient_name ?? order.users?.name ?? 'Customer';
  const phone = order.users?.phone ?? null;
  const pay = paymentStatus(order);
  const timeline = [
    { label: 'Placed', at: order.placed_at },
    { label: 'Packed', at: order.packed_at },
    { label: 'Picked up', at: order.picked_up_at },
    { label: 'Delivered', at: order.delivered_at },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Order ${order.order_number} items`}
    >
      <div
        className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <div>
            <p className="text-[15px] font-semibold text-neutral-900">{order.order_number}</p>
            <p className="text-xs text-neutral-400">
              {order.order_items.length} {order.order_items.length === 1 ? 'item' : 'items'} · {statusLabel(order.status)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 divide-y divide-hairline overflow-y-auto px-5">
          {order.order_items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-3.5">
              {item.products?.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.products.image_url}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg border border-hairline object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-hairline bg-neutral-50 text-neutral-400">
                  <Package size={18} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900">{item.products?.name ?? 'Item'}</p>
                <p className="tnum text-xs text-neutral-400">
                  {item.quantity} × {formatInr(item.unit_price_at_order)}
                  {item.products?.unit ? ` · ${item.products.unit}` : ''}
                </p>
              </div>
              <span className="tnum shrink-0 text-sm font-semibold text-neutral-900">
                {formatInr(item.quantity * item.unit_price_at_order)}
              </span>
            </div>
          ))}

          {/* Customer + payment — name, click-to-call phone, paid/pending.
              No address: rider handles the drop, partner only packs. */}
          <div className="flex items-center gap-3 py-3.5">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarColorFor(customerName)}`}>
              {initialsFor(customerName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-900">{customerName}</p>
              {phone ? (
                <a href={`tel:${phone}`} className="text-xs text-neutral-500 hover:text-black" onClick={(e) => e.stopPropagation()}>
                  {phone}
                </a>
              ) : (
                <p className="text-xs text-neutral-400">No phone</p>
              )}
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${pay.className}`}>
              {pay.label}
            </span>
          </div>

          {/* Order timeline — reached steps get a timestamp, the rest sit muted.
              Cancelled short-circuits to a single red line. */}
          <div className="py-3.5">
            {order.status === 'cancelled' ? (
              <p className="text-sm font-medium text-red-600">Order cancelled</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {timeline.map((step) => (
                  <div key={step.label} className="flex items-center gap-2.5 text-sm">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${step.at ? 'bg-emerald-500' : 'bg-neutral-200'}`} />
                    <span className={step.at ? 'text-neutral-800' : 'text-neutral-400'}>{step.label}</span>
                    {step.at && <span className="tnum ml-auto text-xs text-neutral-400">{formatDateTime(step.at)}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-hairline bg-neutral-50 px-5 py-4">
          <div className="flex justify-between text-base font-semibold text-neutral-900">
            <span>Item total</span>
            <span className="tnum">{formatInr(order.item_total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
