'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Bell, Check, CheckCircle2, ChevronDown, Clock, ShoppingBag, Truck, X } from 'lucide-react';
import { fetchMyOrders, updateOrderStatus, type OrderStatus, type PartnerOrder } from '@/lib/partnerApi';
import { DEMO_ORDERS } from '@/lib/demoOrders';
import { OrdersFilterBar, ORDER_FILTERS, type DateRange } from '@/components/orders/OrdersFilterBar';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { StatTile } from '@/components/ui/StatTile';
import { formatInr, statusLabel } from '@/lib/format';

const RANGE_MS: Record<Exclude<DateRange, 'all' | 'today'>, number> = {
  '7d': 7 * 86400e3,
  '30d': 30 * 86400e3,
};

// DEMO DATA — the demo orders are all placed this month, so the real
// month-over-month trend() has no prior month to compare and returns
// undefined, hiding every delta pill. These stand in only while isDemo, so
// the "vs last month" pills render like the rest of the dashboard; the real
// trends replace them the instant a real order lands. Delete with DEMO_ORDERS.
const DEMO_TRENDS = { total: 6.2, pending: 12.5, inTransit: 4.1, delivered: 8.3, failed: 2.1 };

function inRange(iso: string, range: DateRange): boolean {
  if (range === 'all') return true;
  const t = new Date(iso).getTime();
  if (range === 'today') return new Date(iso).toDateString() === new Date().toDateString();
  return Date.now() - t <= RANGE_MS[range];
}

// Client-side CSV of whatever the filters currently show. No server round-trip.
function exportCsv(orders: PartnerOrder[]) {
  const head = ['Order', 'Customer', 'Phone', 'Status', 'Amount', 'Placed'];
  const rows = orders.map((o) => [
    o.order_number,
    o.addresses?.recipient_name ?? o.users?.name ?? 'Customer',
    o.users?.phone ?? '',
    statusLabel(o.status),
    formatInr(o.total),
    new Date(o.placed_at).toLocaleString('en-IN'),
  ]);
  const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [search, setSearch] = useState('');
  // The order currently mid-mutation, so its row buttons show a busy state and
  // every other row's actions lock out — no double-accept, no accept-while-rejecting.
  const [actioningId, setActioningId] = useState<string | null>(null);
  // Local, backend-free copy of the demo orders so Accept/Reject are clickable
  // in demo mode (store has no real orders yet) — the flip lives only in state,
  // never a PATCH. Replaced by real orders the instant one lands.
  const [demoOrders, setDemoOrders] = useState<PartnerOrder[]>(DEMO_ORDERS);
  // New-order banner expand: down-chevron reveals the placed orders with
  // inline Accept/Reject, so the owner acts without leaving the banner.
  const [alertOpen, setAlertOpen] = useState(false);

  useEffect(() => {
    fetchMyOrders()
      .then(setOrders)
      .finally(() => setIsLoading(false));
  }, []);

  // DEMO DATA — same isDemo convention as the Overview page: shown only while
  // the store has zero real orders, replaced the instant a real one lands.
  const isDemo = !isLoading && orders.length === 0;
  const sourceOrders = isDemo ? demoOrders : orders;

  // Accept = the sole owner-side transition the backend allows (placed→packed);
  // Reject = cancel it. Both are real PATCH /orders/:id/status calls, then a
  // refetch so the row's status (and every stat/trend derived from it) is the
  // server's truth, not an optimistic guess. Undefined in demo mode → the table
  // renders the buttons disabled, so no fake write ever fires.
  async function mutate(id: string, status: OrderStatus, reason?: string) {
    if (actioningId) return;
    setActioningId(id);
    try {
      await updateOrderStatus(id, status, reason);
      setOrders(await fetchMyOrders());
    } finally {
      setActioningId(null);
    }
  }
  const handleAccept = (id: string) => mutate(id, 'packed');
  const handleReject = (id: string) => {
    if (window.confirm('Reject this order? This cancels it for the customer and refunds their payment. This cannot be undone.')) {
      mutate(id, 'cancelled');
    }
  };

  // Demo-only staged lifecycle (no backend, no confirm): Accept stages the
  // order (still 'placed', now in acceptedIds → row shows Mark packed), Mark
  // packed flips it to 'packed' and dispatch begins, then it auto-advances
  // out_for_delivery → delivered on timers so the owner sees the whole arc.
  // View the "All" filter to watch it move past the placed stage.
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const demoAccept = (id: string) => setAcceptedIds((s) => new Set(s).add(id));
  const demoReject = (id: string) => {
    setAcceptedIds((s) => { const n = new Set(s); n.delete(id); return n; });
    setDemoOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'cancelled' } : o)));
  };
  const demoMarkPacked = (id: string) => {
    setAcceptedIds((s) => { const n = new Set(s); n.delete(id); return n; });
    const set = (status: OrderStatus) =>
      setDemoOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    set('packed');
    setTimeout(() => set('out_for_delivery'), 2600);
    setTimeout(() => set('delivered'), 5200);
  };

  const sorted = useMemo(
    () => [...sourceOrders].sort((a, b) => +new Date(b.placed_at) - +new Date(a.placed_at)),
    [sourceOrders],
  );

  const counts = useMemo(() => {
    const result = { all: sorted.length } as Record<OrderStatus | 'all', number>;
    for (const f of ORDER_FILTERS) {
      if (f !== 'all') result[f] = sorted.filter((o) => o.status === f).length;
    }
    return result;
  }, [sorted]);

  // Month-over-month count trend per metric — undefined when there's no prior
  // month to compare against, so the delta pill is hidden rather than printing
  // a meaningless +100%.
  const trends = useMemo(() => {
    const now = new Date();
    const startThis = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    function trend(pred: (o: PartnerOrder) => boolean): number | undefined {
      let tm = 0;
      let lm = 0;
      for (const o of sorted) {
        if (!pred(o)) continue;
        const t = new Date(o.placed_at).getTime();
        if (t >= startThis) tm++;
        else if (t >= startLast) lm++;
      }
      return lm > 0 ? ((tm - lm) / lm) * 100 : undefined;
    }
    const inTransit = (o: PartnerOrder) => o.status === 'packed' || o.status === 'out_for_delivery';
    return {
      total: trend(() => true),
      pending: trend((o) => o.status === 'placed'),
      inTransit: trend(inTransit),
      delivered: trend((o) => o.status === 'delivered'),
      failed: trend((o) => o.status === 'cancelled'),
    };
  }, [sorted]);

  const filtered = useMemo(() => {
    const byRange = sorted.filter((o) => inRange(o.placed_at, dateRange));
    const byStatus = filter === 'all' ? byRange : byRange.filter((o) => o.status === filter);
    const q = search.trim().toLowerCase();
    if (!q) return byStatus;
    return byStatus.filter((o) => {
      const customer = (o.addresses?.recipient_name ?? o.users?.name ?? '').toLowerCase();
      const phone = (o.users?.phone ?? '').toLowerCase();
      return customer.includes(q) || phone.includes(q) || o.order_number.toLowerCase().includes(q);
    });
  }, [sorted, filter, dateRange, search]);

  const inTransitCount = counts.packed + counts.out_for_delivery;
  const placedOrders = sorted.filter((o) => o.status === 'placed');
  const onAccept = isDemo ? demoAccept : handleAccept;
  const onReject = isDemo ? demoReject : handleReject;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 divide-x divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-white sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
        <StatTile label="Total orders" value={String(sorted.length)} icon={ShoppingBag} deltaPercent={isDemo ? DEMO_TRENDS.total : trends.total} />
        <StatTile label="Pending" value={String(counts.placed)} icon={Clock} deltaPercent={isDemo ? DEMO_TRENDS.pending : trends.pending} invertTone />
        <StatTile label="In transit" value={String(inTransitCount)} icon={Truck} deltaPercent={isDemo ? DEMO_TRENDS.inTransit : trends.inTransit} />
        <StatTile label="Delivered" value={String(counts.delivered)} icon={CheckCircle2} deltaPercent={isDemo ? DEMO_TRENDS.delivered : trends.delivered} />
        <StatTile label="Failed" value={String(counts.cancelled)} icon={AlertCircle} deltaPercent={isDemo ? DEMO_TRENDS.failed : trends.failed} invertTone />
      </div>

      {/* New-order alert — green success surface. The right-end chevron toggles
          an inline list of the placed orders with Accept/Reject, so they can be
          actioned without scrolling to the table. */}
      {counts.placed > 0 && (
        <div className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50">
          <button
            type="button"
            onClick={() => setAlertOpen((v) => !v)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-emerald-100/60"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Bell size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-900">
                {counts.placed} new {counts.placed === 1 ? 'order' : 'orders'} to review
              </p>
              <p className="text-[13px] text-emerald-700">Accept to start packing, or reject to cancel and refund.</p>
            </div>
            <ChevronDown
              size={20}
              className={`ml-auto shrink-0 text-emerald-700 transition-transform ${alertOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {alertOpen && (
            <ul className="divide-y divide-emerald-200 border-t border-emerald-200">
              {placedOrders.map((o) => {
                const name = o.addresses?.recipient_name ?? o.users?.name ?? 'Customer';
                const busy = actioningId === o.id;
                return (
                  <li key={o.id} className="flex items-center gap-3 bg-white px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-900">
                        {o.order_number} · {name}
                      </p>
                      <p className="text-xs text-neutral-500">{formatInr(o.total)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAccept(o.id)}
                      disabled={!!actioningId}
                      className="flex items-center gap-1 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
                    >
                      <Check size={14} /> {busy ? 'Accepting…' : 'Accept'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onReject(o.id)}
                      disabled={!!actioningId}
                      className="flex items-center gap-1 rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    >
                      <X size={14} /> Reject
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <OrdersFilterBar
        filter={filter}
        onFilterChange={setFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={() => exportCsv(filtered)}
        search={search}
        onSearchChange={setSearch}
      />

      {isLoading ? (
        <div className="py-20 text-center text-sm text-neutral-400">Loading orders…</div>
      ) : (
        <OrdersTable
          orders={filtered}
          onAccept={onAccept}
          onReject={onReject}
          onMarkPacked={isDemo ? demoMarkPacked : undefined}
          acceptedIds={isDemo ? acceptedIds : undefined}
          actioningId={actioningId}
        />
      )}
    </div>
  );
}
