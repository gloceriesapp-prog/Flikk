'use client';

import { Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Inbox, RotateCw, Sparkles } from 'lucide-react';
import { fetchMyOrders, updateOrderStatus, type OrderStatus, type PartnerOrder } from '@/lib/partnerApi';
import { useLiveData } from '@/lib/useLiveData';
import { DEMO_ORDERS } from '@/lib/demoOrders';
import { DEMO_DATA_ENABLED } from '@/lib/demoMode';
import { toast } from '@/components/ui/Toast';
import { OrdersFilterBar, type DateRange, type OrdersView } from '@/components/orders/OrdersFilterBar';
import { OrdersSummaryStrip } from '@/components/orders/OrdersSummaryStrip';
import { OrderCard, OrderCardSkeleton } from '@/components/orders/OrderCard';
import { OrdersTable, OrdersTableSkeleton } from '@/components/orders/OrdersTable';
import { OrderDetailsPanel } from '@/components/orders/OrderDetailsPanel';
import { RejectReasonDialog } from '@/components/orders/RejectReasonDialog';
import { customerName, useNow, type StatusFilter } from '@/components/orders/orderMeta';

const RANGE_MS: Record<Exclude<DateRange, 'all' | 'today'>, number> = {
  '7d': 7 * 86400e3,
  '30d': 30 * 86400e3,
};

// Web poll cadence — an order accepted/cancelled on the phone shows here within
// this window instead of staying "new to review" until a manual reload. Lighter
// than the RN app's 3.5s; the hook pauses it entirely while the tab is hidden.
const ORDERS_POLL_MS = 12_000;

// Grid cards are heavier than table rows, so the grid renders in pages of
// this size behind a "Show more" instead of mounting a whole year of orders.
const GRID_PAGE = 24;

const VIEW_KEY = 'gloceries_orders_view';

function inRange(iso: string, range: DateRange): boolean {
  if (range === 'all') return true;
  const t = new Date(iso).getTime();
  if (range === 'today') return new Date(iso).toDateString() === new Date().toDateString();
  return Date.now() - t <= RANGE_MS[range];
}

// Remembered per browser — an owner who prefers the dense list shouldn't
// have to re-pick it every visit. Storage can throw (private mode, blocked
// site data), so every access is guarded and falls back to grid.
function readView(): OrdersView {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

// useSearchParams (for the linkable ?order=<id>) must sit under a Suspense
// boundary, or a production build bails the whole route out of prerendering.
export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersScreen />
    </Suspense>
  );
}

function OrdersScreen() {
  // Live: fetch on mount, re-poll every ORDERS_POLL_MS while the tab is visible,
  // and refetch on demand after a mutation (D1 — the page used to freeze on its
  // mount fetch and never see phone-side status changes).
  const { data: orders = [], isLoading, error, refetch } = useLiveData(fetchMyOrders, ORDERS_POLL_MS);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<OrdersView>(readView);
  const [gridLimit, setGridLimit] = useState(GRID_PAGE);
  const now = useNow();
  // The order currently mid-mutation, so its buttons show a busy state and
  // every other order's actions lock out — no double-accept, no accept-while-rejecting.
  const [actioningId, setActioningId] = useState<string | null>(null);
  // Local, backend-free copy of the demo orders so Accept/Reject are clickable
  // in demo mode (store has no real orders yet) — the flip lives only in state,
  // never a PATCH. Replaced by real orders the instant one lands.
  const [demoOrders, setDemoOrders] = useState<PartnerOrder[]>(DEMO_ORDERS);

  // DEMO DATA — same isDemo convention as the Overview page: shown only while
  // the store has zero real orders, replaced the instant a real one lands.
  // DEMO_DATA_ENABLED is hard-off in production builds. A failed fetch is not
  // "zero orders", so it shows the error state instead of sample data.
  const isDemo = DEMO_DATA_ENABLED && !isLoading && !error && orders.length === 0;
  const sourceOrders = isDemo ? demoOrders : orders;

  function changeView(next: OrdersView) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Storage blocked — the choice just lasts for this visit.
    }
  }

  // ── Details panel, driven by ?order=<id> so a specific order is linkable
  // and the browser Back button closes the panel it opened.
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('order');
  const pushedRef = useRef(false);
  const openOrder = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('order', id);
      window.history.pushState(null, '', `?${params.toString()}`);
      pushedRef.current = true;
    },
    [searchParams],
  );
  const closeOrder = useCallback(() => {
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
      return;
    }
    // Arrived via a shared link: drop the param without leaving the page.
    const params = new URLSearchParams(searchParams.toString());
    params.delete('order');
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [searchParams]);

  // Accept = the sole owner-side transition the backend allows (placed→packed);
  // Reject = cancel it with a reason. Both are real PATCH /orders/:id/status
  // calls, then a refetch so the status (and every count derived from it) is
  // the server's truth, not an optimistic guess.
  async function mutate(id: string, status: OrderStatus, reason?: string) {
    if (actioningId) return;
    setActioningId(id);
    try {
      await updateOrderStatus(id, status, reason);
      await refetch();
      toast.success(status === 'packed' ? 'Order accepted. Start packing.' : 'Order rejected.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the order. Try again.');
    } finally {
      setActioningId(null);
    }
  }
  const handleAccept = (id: string) => void mutate(id, 'packed');
  // Reject opens the reason picker; the chosen code goes out as the reason.
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const handleReject = (id: string) => setRejectingId(id);

  // Demo-only staged lifecycle (no backend, no confirm): Accept stages the
  // order (still 'placed', now in acceptedIds → shows Mark packed), Mark
  // packed flips it to 'packed' and dispatch begins, then it auto-advances
  // out_for_delivery → delivered on timers so the owner sees the whole arc.
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const demoAccept = (id: string) => setAcceptedIds((s) => new Set(s).add(id));
  const demoReject = (id: string) => {
    setAcceptedIds((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    setDemoOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'cancelled' } : o)));
  };
  const demoMarkPacked = (id: string) => {
    setAcceptedIds((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    const stamp = new Date().toISOString();
    const set = (status: OrderStatus, patch: Partial<PartnerOrder>) =>
      setDemoOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status, ...patch } : o)));
    set('packed', { packed_at: stamp });
    setTimeout(() => set('out_for_delivery', { picked_up_at: new Date().toISOString() }), 2600);
    setTimeout(() => set('delivered', { delivered_at: new Date().toISOString() }), 5200);
  };

  const sorted = useMemo(
    () => [...sourceOrders].sort((a, b) => +new Date(b.placed_at) - +new Date(a.placed_at)),
    [sourceOrders],
  );

  // Date range + search narrow everything (strip counts included); the status
  // filter is applied last, so the strip still shows what each tab holds.
  const scoped = useMemo(() => {
    const byRange = sorted.filter((o) => inRange(o.placed_at, dateRange));
    const q = search.trim().toLowerCase();
    if (!q) return byRange;
    return byRange.filter((o) => {
      const customer = customerName(o).toLowerCase();
      const phone = (o.users?.phone ?? '').toLowerCase().replace(/\s+/g, '');
      return customer.includes(q) || phone.includes(q.replace(/\s+/g, '')) || o.order_number.toLowerCase().includes(q);
    });
  }, [sorted, dateRange, search]);

  const filtered = useMemo(() => (filter === 'all' ? scoped : scoped.filter((o) => o.status === filter)), [scoped, filter]);

  // Changes only on owner-driven filter changes, never on a background poll.
  const resetKey = `${filter}|${dateRange}|${search}`;
  const [prevKey, setPrevKey] = useState(resetKey);
  if (prevKey !== resetKey) {
    setPrevKey(resetKey);
    setGridLimit(GRID_PAGE);
  }

  const onAccept = isDemo ? demoAccept : handleAccept;
  const onReject = isDemo ? demoReject : handleReject;
  const handlers = {
    onOpen: openOrder,
    onAccept,
    onReject,
    onMarkPacked: isDemo ? demoMarkPacked : undefined,
    acceptedIds: isDemo ? acceptedIds : undefined,
    actioningId,
  };

  // Error with nothing to show → full error state. Error on a later poll →
  // keep the last good list and say so quietly.
  const hardError = Boolean(error) && orders.length === 0 && !isLoading;
  const softError = Boolean(error) && orders.length > 0;
  const selectedOrder = selectedId ? (sorted.find((o) => o.id === selectedId) ?? null) : null;
  const rejectingOrder = rejectingId ? sorted.find((o) => o.id === rejectingId) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <OrdersSummaryStrip orders={sourceOrders} now={now} active={filter} onSelect={setFilter} loading={isLoading} />

      <OrdersFilterBar
        filter={filter}
        onFilterChange={setFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        search={search}
        onSearchChange={setSearch}
        view={view}
        onViewChange={changeView}
      />

      {isDemo && (
        <p className="flex items-center gap-2 rounded-2xl bg-accent-soft px-4 py-2.5 text-sm text-accent">
          <Sparkles size={15} aria-hidden />
          Sample orders. Your real orders replace these as soon as the first one arrives.
        </p>
      )}

      {softError && (
        <div className="flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <AlertCircle size={16} className="shrink-0" aria-hidden />
          <span className="flex-1">Couldn&apos;t refresh. Showing the last orders we loaded.</span>
          <button type="button" onClick={() => void refetch()} className="rounded-full px-2 py-1 font-semibold hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        view === 'grid' ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <OrderCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <OrdersTableSkeleton />
        )
      ) : hardError ? (
        <StateCard
          icon={<AlertCircle size={22} />}
          tone="error"
          title="We couldn't load your orders"
          body="Check your internet connection and try again. New orders are still safe on our side."
          action={
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <RotateCw size={15} aria-hidden />
              Try again
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          filter={filter}
          searching={search.trim() !== '' || dateRange !== 'all'}
          onClear={() => {
            setSearch('');
            setDateRange('all');
            setFilter('all');
          }}
        />
      ) : view === 'grid' ? (
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 lg:grid-cols-2">
            {filtered.slice(0, gridLimit).map((o) => (
              <OrderCard key={o.id} order={o} now={now} {...handlers} />
            ))}
          </div>
          {filtered.length > gridLimit && (
            <button
              type="button"
              onClick={() => setGridLimit((n) => n + GRID_PAGE)}
              className="tnum mx-auto h-10 rounded-full bg-white px-5 text-sm font-medium text-ink shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Show more ({filtered.length - gridLimit} left)
            </button>
          )}
        </div>
      ) : (
        <OrdersTable orders={filtered} now={now} resetKey={resetKey} {...handlers} />
      )}

      {selectedId && !isLoading && (
        <OrderDetailsPanel
          key={selectedId}
          order={selectedOrder}
          now={now}
          onClose={closeOrder}
          onAccept={onAccept}
          onReject={onReject}
          onMarkPacked={handlers.onMarkPacked}
          acceptedIds={handlers.acceptedIds}
          actioningId={actioningId}
        />
      )}

      {rejectingId && (
        <RejectReasonDialog
          orderNumber={rejectingOrder?.order_number}
          onClose={() => setRejectingId(null)}
          onConfirm={(reason) => {
            const id = rejectingId;
            setRejectingId(null);
            void mutate(id, 'cancelled', reason);
          }}
        />
      )}
    </div>
  );
}

const EMPTY_COPY: Record<StatusFilter, { title: string; body: string }> = {
  all: { title: 'No orders yet', body: 'When a customer orders from your store it shows up here instantly. Keep your store online.' },
  placed: { title: 'No new orders', body: "You're all caught up. New orders appear here and ring the bell." },
  packed: { title: 'Nothing waiting for a rider', body: 'Orders you accept and pack wait here until a rider picks them up.' },
  out_for_delivery: { title: 'Nothing on the road', body: 'Orders a rider has picked up show here until they are delivered.' },
  delivered: { title: 'No delivered orders', body: 'Completed orders land here once the rider hands them over.' },
  cancelled: { title: 'No cancelled orders', body: 'Orders you reject or the customer cancels show here.' },
};

function EmptyState({ filter, searching, onClear }: { filter: StatusFilter; searching: boolean; onClear: () => void }) {
  const copy = searching
    ? { title: 'No orders match', body: 'Try another name, phone number or order number, or widen the date range.' }
    : EMPTY_COPY[filter];
  return (
    <StateCard
      icon={<Inbox size={22} />}
      tone={filter === 'all' ? 'accent' : 'neutral'}
      title={copy.title}
      body={copy.body}
      action={
        searching ? (
          <button
            type="button"
            onClick={onClear}
            className="h-10 rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Clear filters
          </button>
        ) : undefined
      }
    />
  );
}

function StateCard({
  icon,
  tone,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  tone: 'accent' | 'neutral' | 'error';
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  const iconTone = tone === 'error' ? 'bg-red-50 text-red-600' : tone === 'accent' ? 'bg-accent-soft text-accent' : 'bg-slate-100 text-slate-500';
  return (
    <div role={tone === 'error' ? 'alert' : undefined} className="flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-16 text-center">
      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconTone}`} aria-hidden>
        {icon}
      </span>
      <div className="max-w-sm">
        <p className="text-base font-semibold text-ink">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{body}</p>
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
