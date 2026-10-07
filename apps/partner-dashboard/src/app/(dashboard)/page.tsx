'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  fetchMyOrders,
  fetchMyProducts,
  fetchMyStore,
  updateMyStore,
  updateOrderStatus,
  type PartnerOrder,
  type PartnerProduct,
  type Store,
} from '@/lib/partnerApi';
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  CreditCard,
  ListChecks,
  Package,
  XCircle,
} from 'lucide-react';
import { WelcomeBanner } from '@/components/WelcomeBanner';
import { SalesReportChart } from '@/components/SalesReportChart';
import { OrderAlertsPanel } from '@/components/OrderAlertsPanel';
import { InventoryAlertCard } from '@/components/InventoryAlertCard';
import { ItemAvatars, MAX_ITEM_AVATARS } from '@/components/ItemAvatars';
import { Card, SectionCard } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { Badge } from '@/components/ui/Badge';
import { DEMO_ORDERS } from '@/lib/demoOrders';
import { formatInr, formatDateTime, statusColor, statusLabel } from '@/lib/format';
import { DEMO_DATA_ENABLED } from '@/lib/demoMode';

// Wireframe's "New order" preview card needs an order sitting in 'placed'
// status to be worth showing — this test store has none most of the time.
// Shown only when the real orders list has nothing to preview; its Accept
// button is disabled (never sent to the backend) since there's no real
// order behind it. Delete this the moment real order volume exists.
const DUMMY_PREVIEW_ITEM_COUNT = 3;

// Column widths for the Recent orders bordered-grid table (Order/Customer/
// Items/Amount/Payment/Status) — same bordered-grid pattern as OrdersTable.
// Each row is its own grid, so every track is minmax(0,…): without the 0 min,
// a bare `fr` track sizes to its content (a 3-avatar Items cell vs a 1-avatar
// one) and the columns drift out of line between header and rows.
const RECENT_COLUMNS = 'minmax(0,1.2fr) minmax(0,1.4fr) minmax(0,1.2fr) minmax(0,0.9fr) minmax(0,1fr) minmax(0,1fr)';

// DEMO DATA — this store has zero real orders, so every stat on this page
// would render as 0/—/empty. Shown ONLY when orders.length === 0, purely so
// the layout is visible; the instant a real order lands, isDemo flips false
// and every one of these is replaced by the real computed value. Delete this
// block once a test store has real order history.
const DEMO_TOTAL_PRODUCTS = 250;
const DEMO_COMPLETED_ORDERS = 124;
const DEMO_CANCELLED_ORDERS = 14;
const DEMO_ACTIVE_ORDERS = 42;
const DEMO_PENDING_ORDERS = 8;
const DEMO_IN_STOCK = 124;
const DEMO_COMPLETED_TREND = 2.5;
const DEMO_CANCELLED_TREND = 1.5;
const DEMO_ACTIVE_TREND = 2.5;
const DEMO_PENDING_TREND = 3.2;
const DEMO_TOP_SELLING = [
  { name: 'Amul Fresh Milk 500ml', unitsSold: 84, imageUrl: null },
  { name: 'Britannia Bread', unitsSold: 61, imageUrl: null },
  { name: 'Tata Salt 1kg', unitsSold: 47, imageUrl: null },
  { name: 'Maggi Noodles 2-pack', unitsSold: 39, imageUrl: null },
  { name: 'Red Label Tea 250g', unitsSold: 28, imageUrl: null },
];
const DEMO_OUT_OF_STOCK_ITEMS = [
  { name: 'Aashirvaad Atta 5kg', imageUrl: null },
  { name: 'Fortune Sunflower Oil 1L', imageUrl: null },
];
export default function OverviewPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [products, setProducts] = useState<PartnerProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  function reloadOrders() {
    return fetchMyOrders().then(setOrders);
  }

  useEffect(() => {
    Promise.all([fetchMyStore(), fetchMyOrders(), fetchMyProducts()])
      .then(([storeRes, ordersRes, productsRes]) => {
        setStore(storeRes);
        setOrders(ordersRes);
        setProducts(productsRes);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleToggleActive(nextActive: boolean) {
    if (!store || isTogglingActive) return;
    setIsTogglingActive(true);
    const previous = store;
    setStore({ ...store, is_active: nextActive });
    try {
      const updated = await updateMyStore({ is_active: nextActive });
      setStore(updated);
      window.dispatchEvent(new CustomEvent('gloceries:store-updated', { detail: updated }));
    } catch {
      setStore(previous);
    } finally {
      setIsTogglingActive(false);
    }
  }

  async function handleAcceptOrder(orderId: string) {
    if (acceptingId) return;
    setAcceptingId(orderId);
    try {
      await updateOrderStatus(orderId, 'packed');
      await reloadOrders();
    } finally {
      setAcceptingId(null);
    }
  }

  if (isLoading) return <p className="text-sm text-neutral-400">Loading…</p>;

  const activeOrders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
  const completedOrders = orders.filter((o) => o.status === 'delivered');
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled');

  // This-week vs last-week window, for the metric-card delta pills.
  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7)); // Monday
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  // % change in the count of orders matching `pred`, this week vs last.
  function weekTrend(pred: (o: PartnerOrder) => boolean): number {
    const tw = orders.filter((o) => pred(o) && new Date(o.placed_at) >= startOfWeek).length;
    const lw = orders.filter((o) => pred(o) && new Date(o.placed_at) >= startOfLastWeek && new Date(o.placed_at) < startOfWeek).length;
    return lw > 0 ? ((tw - lw) / lw) * 100 : tw > 0 ? 100 : 0;
  }
  const completedTrend = weekTrend((o) => o.status === 'delivered');
  const cancelledTrend = weekTrend((o) => o.status === 'cancelled');
  const activeTrend = weekTrend((o) => o.status !== 'delivered' && o.status !== 'cancelled');

  // "Pending": orders placed but not yet packed — the ones the owner still
  // has to act on (same 'placed' set the sidebar/notification badge counts).
  const pendingOrders = orders.filter((o) => o.status === 'placed');
  const pendingTrend = weekTrend((o) => o.status === 'placed');

  const inStockCount = products.filter((p) => p.is_in_stock).length;
  const outOfStockItems = products.filter((p) => !p.is_in_stock).map((p) => ({ name: p.name, imageUrl: p.image_url }));

  const unitsSoldByProduct = new Map<string, { name: string; unitsSold: number; imageUrl: string | null }>();
  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    for (const item of order.order_items) {
      const name = item.products?.name ?? 'Item';
      const existing = unitsSoldByProduct.get(item.product_id) ?? { name, unitsSold: 0, imageUrl: item.products?.image_url ?? null };
      existing.unitsSold += item.quantity;
      unitsSoldByProduct.set(item.product_id, existing);
    }
  }
  const topSelling = [...unitsSoldByProduct.values()].sort((a, b) => b.unitsSold - a.unitsSold);
  const previewOrder = orders.find((o) => o.status === 'placed');
  const recentOrders = [...orders].sort((a, b) => +new Date(b.placed_at) - +new Date(a.placed_at)).slice(0, 6);

  const isDemo = DEMO_DATA_ENABLED && orders.length === 0;
  const displayTotalProducts = isDemo ? DEMO_TOTAL_PRODUCTS : products.length;
  const displayInStock = isDemo ? DEMO_IN_STOCK : inStockCount;
  const displayCompleted = isDemo ? DEMO_COMPLETED_ORDERS : completedOrders.length;
  const displayCancelled = isDemo ? DEMO_CANCELLED_ORDERS : cancelledOrders.length;
  const displayActive = isDemo ? DEMO_ACTIVE_ORDERS : activeOrders.length;
  const displayCompletedTrend = isDemo ? DEMO_COMPLETED_TREND : completedTrend;
  const displayCancelledTrend = isDemo ? DEMO_CANCELLED_TREND : cancelledTrend;
  const displayActiveTrend = isDemo ? DEMO_ACTIVE_TREND : activeTrend;
  const displayPending = isDemo ? DEMO_PENDING_ORDERS : pendingOrders.length;
  const displayPendingTrend = isDemo ? DEMO_PENDING_TREND : pendingTrend;
  const displayChartOrders = isDemo ? DEMO_ORDERS : orders;
  const displayOutOfStockItems = isDemo ? DEMO_OUT_OF_STOCK_ITEMS : outOfStockItems;
  const displayTopSelling = isDemo ? DEMO_TOP_SELLING : topSelling;
  const displayRecentOrders = isDemo ? DEMO_ORDERS.slice(0, 4) : recentOrders;

  return (
    <div className="flex flex-col gap-4">
      {store && (
        <WelcomeBanner
          storeName={store.name}
          isActive={store.is_active}
          onToggle={handleToggleActive}
          toggling={isTogglingActive}
        />
      )}

      <div className="grid grid-cols-2 divide-x divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-white sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
        <StatTile label="Total products" value={String(displayTotalProducts)} icon={Boxes} sublabel={`${displayInStock} in stock`} />
        <StatTile label="Completed orders" value={String(displayCompleted)} icon={CheckCircle2} deltaPercent={displayCompletedTrend} />
        <StatTile label="Cancelled" value={String(displayCancelled)} icon={XCircle} deltaPercent={displayCancelledTrend} invertTone />
        <StatTile label="Active orders" value={String(displayActive)} icon={ListChecks} deltaPercent={displayActiveTrend} />
        <StatTile label="Pending" value={String(displayPending)} icon={Package} deltaPercent={displayPendingTrend} invertTone />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <SalesReportChart orders={displayChartOrders} />
        </Card>
        <Card className="overflow-hidden p-0">
          <OrderAlertsPanel
            orders={displayChartOrders}
            onAccept={isDemo ? undefined : handleAcceptOrder}
            acceptingId={acceptingId}
          />
        </Card>
      </div>

      <SectionCard
        title="New order"
        action={
          <Link href="/orders" className="text-xs font-medium text-neutral-500 hover:text-black">
            View
          </Link>
        }
      >
        {previewOrder ? (
          <div className="flex items-center justify-between rounded-xl border border-hairline px-4 py-3">
            <span className="text-sm text-neutral-600">{previewOrder.order_items.length} items</span>
            <button
              type="button"
              onClick={() => handleAcceptOrder(previewOrder.id)}
              disabled={acceptingId !== null}
              className="rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            >
              {acceptingId === previewOrder.id ? 'Accepting…' : 'Accept'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-dashed border-hairline px-4 py-3">
            <span className="text-sm text-neutral-400">{DUMMY_PREVIEW_ITEM_COUNT} items (example)</span>
            <button
              type="button"
              disabled
              title="No real order to accept yet"
              className="cursor-not-allowed rounded-full bg-neutral-200 px-4 py-1.5 text-xs font-medium text-neutral-400"
            >
              Accept
            </button>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <SectionCard
          title="Recent orders"
          action={
            <Link
              href="/orders"
              className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-black"
            >
              View all
              <ArrowRight size={14} />
            </Link>
          }
          bodyClassName="p-0"
        >
          {displayRecentOrders.length === 0 ? (
            <p className="px-5 py-6 text-sm text-neutral-400">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                {/* Header */}
                <div
                  className="grid items-center border-b border-hairline bg-neutral-50 text-[13px] font-medium text-neutral-500"
                  style={{ gridTemplateColumns: RECENT_COLUMNS }}
                >
                  <span className="border-r border-hairline px-4 py-3">Order</span>
                  <span className="border-r border-hairline px-4 py-3">Customer</span>
                  <span className="border-r border-hairline px-4 py-3">Items</span>
                  <span className="border-r border-hairline px-4 py-3">Amount</span>
                  <span className="border-r border-hairline px-4 py-3">Payment</span>
                  <span className="px-4 py-3">Status</span>
                </div>

                {/* Rows */}
                {displayRecentOrders.map((order) => {
                  const customerName = order.addresses?.recipient_name ?? order.users?.name ?? 'Customer';
                  const isPaid = !!order.razorpay_payment_id;
                  return (
                    <div
                      key={order.id}
                      className="grid items-stretch border-b border-hairline transition-colors last:border-b-0 hover:bg-neutral-50/70"
                      style={{ gridTemplateColumns: RECENT_COLUMNS }}
                    >
                      <div className="flex min-w-0 flex-col justify-center border-r border-hairline px-4 py-3.5">
                        <p className="truncate text-sm font-semibold text-neutral-900">{order.order_number}</p>
                        <p className="whitespace-nowrap text-xs text-neutral-400">{formatDateTime(order.placed_at)}</p>
                      </div>
                      <p className="flex items-center truncate border-r border-hairline px-4 py-3.5 text-sm font-medium text-neutral-900">
                        {customerName}
                      </p>
                      <div className="flex items-center border-r border-hairline px-4 py-3.5">
                        <ItemAvatars
                          images={order.order_items.slice(0, MAX_ITEM_AVATARS).map((item) => item.products?.image_url ?? null)}
                          count={order.order_items.length}
                        />
                      </div>
                      <span className="tnum flex items-center border-r border-hairline px-4 py-3.5 text-sm font-semibold text-neutral-900">
                        {formatInr(order.total)}
                      </span>
                      <div className="flex items-center border-r border-hairline px-4 py-3.5">
                        <Badge tone={isPaid ? 'success' : 'warning'} icon={<CreditCard size={12} />}>
                          {isPaid ? 'Paid' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="flex items-center px-4 py-3.5">
                        <span className={`w-fit whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${statusColor(order.status)}`}>
                          {statusLabel(order.status)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </SectionCard>

        <InventoryAlertCard topSelling={displayTopSelling} outOfStock={displayOutOfStockItems} />
      </div>
    </div>
  );
}
