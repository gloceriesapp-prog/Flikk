'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  fetchMyOrders,
  fetchMyPayouts,
  fetchMyProducts,
  fetchMyStore,
  updateMyStore,
  updateOrderStatus,
  type PartnerOrder,
  type PartnerProduct,
  type Payout,
  type Store,
} from '@/lib/partnerApi';
import {
  Activity,
  ArrowLeftRight,
  ArrowRight,
  CreditCard,
  PackageCheck,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { ToggleSwitch } from '@/components/ToggleSwitch';
import { WeeklySalesChart, type DailySales } from '@/components/WeeklySalesChart';
import { InventoryAlertCard } from '@/components/InventoryAlertCard';
import { ItemAvatars, MAX_ITEM_AVATARS } from '@/components/ItemAvatars';
import { DEMO_ORDERS } from '@/lib/demoOrders';
import { formatInr, formatDate, formatDateTime, statusColor, statusLabel } from '@/lib/format';

// Wireframe's "New order" preview card needs an order sitting in 'placed'
// status to be worth showing — this test store has none most of the time.
// Shown only when the real orders list has nothing to preview; its Accept
// button is disabled (never sent to the backend) since there's no real
// order behind it. Delete this the moment real order volume exists.
const DUMMY_PREVIEW_ITEM_COUNT = 3;

// DEMO DATA — this store has zero real orders, so every stat on this page
// would render as 0/—/empty. Shown ONLY when orders.length === 0, purely
// so the layout is visible; the instant a real order lands, isDemo flips
// false and every one of these is replaced by the real computed value
// above it. Delete this block once this store (or any test store used for
// screenshots) has real order history.
const DEMO_WEEKLY_REVENUE = 1243;
const DEMO_TODAYS_ORDERS = 567;
const DEMO_ACTIVE_ORDERS = 42;
const DEMO_IN_STOCK = 124;
const DEMO_OUT_OF_STOCK = 26;
const DEMO_REVENUE_TREND_PERCENT = 12.4;
const DEMO_ORDER_COUNT_TREND_PERCENT = 12.5;
// Rough real-looking shape for the last-7-days chart when there's no real
// order history yet — actual dates are still real (computed below), only
// the revenue numbers here are made up.
const DEMO_DAILY_REVENUE_SHAPE = [120, 340, 210, 480, 260, 610, 390];
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
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [products, setProducts] = useState<PartnerProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  function reloadOrders() {
    return fetchMyOrders().then(setOrders);
  }

  useEffect(() => {
    Promise.all([fetchMyStore(), fetchMyOrders(), fetchMyPayouts(), fetchMyProducts()])
      .then(([storeRes, ordersRes, payoutsRes, productsRes]) => {
        setStore(storeRes);
        setOrders(ordersRes);
        setPayouts(payoutsRes);
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
      window.dispatchEvent(new CustomEvent('flikk:store-updated', { detail: updated }));
    } catch {
      setStore(previous);
    } finally {
      setIsTogglingActive(false);
    }
  }

  async function handleAcceptPreview(orderId: string) {
    if (isAccepting) return;
    setIsAccepting(true);
    try {
      await updateOrderStatus(orderId, 'packed');
      await reloadOrders();
    } finally {
      setIsAccepting(false);
    }
  }

  if (isLoading) return <p className="text-sm text-neutral-400">Loading…</p>;

  const activeOrders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
  const today = new Date().toDateString();
  const todaysOrders = orders.filter((o) => new Date(o.placed_at).toDateString() === today);

  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7)); // Monday
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
  const weeklyRevenue = orders
    .filter((o) => o.status !== 'cancelled' && new Date(o.placed_at) >= startOfWeek)
    .reduce((sum, o) => sum + o.total, 0);
  const lastWeekRevenue = orders
    .filter((o) => o.status !== 'cancelled' && new Date(o.placed_at) >= startOfLastWeek && new Date(o.placed_at) < startOfWeek)
    .reduce((sum, o) => sum + o.total, 0);
  const revenueTrendPercent =
    lastWeekRevenue > 0 ? ((weeklyRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 : weeklyRevenue > 0 ? 100 : 0;

  const thisWeekOrderCount = orders.filter((o) => o.status !== 'cancelled' && new Date(o.placed_at) >= startOfWeek).length;
  const lastWeekOrderCount = orders.filter(
    (o) => o.status !== 'cancelled' && new Date(o.placed_at) >= startOfLastWeek && new Date(o.placed_at) < startOfWeek,
  ).length;
  const orderCountTrendPercent =
    lastWeekOrderCount > 0 ? ((thisWeekOrderCount - lastWeekOrderCount) / lastWeekOrderCount) * 100 : thisWeekOrderCount > 0 ? 100 : 0;

  const dailySales: DailySales[] = Array.from({ length: 7 }, (_, i) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - i));
    const revenue = orders
      .filter((o) => o.status !== 'cancelled' && new Date(o.placed_at).toDateString() === day.toDateString())
      .reduce((sum, o) => sum + o.total, 0);
    return { date: day.toISOString(), revenue };
  });

  const inStockCount = products.filter((p) => p.is_in_stock).length;
  const outOfStockCount = products.length - inStockCount;
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
  const pendingPayout = payouts.find((p) => p.status === 'pending' || p.status === 'processing');
  const previewOrder = orders.find((o) => o.status === 'placed');
  const recentOrders = [...orders].sort((a, b) => +new Date(b.placed_at) - +new Date(a.placed_at)).slice(0, 6);

  const isDemo = orders.length === 0;
  const displayWeeklyRevenue = isDemo ? DEMO_WEEKLY_REVENUE : weeklyRevenue;
  const displayTodaysOrders = isDemo ? DEMO_TODAYS_ORDERS : todaysOrders.length;
  const displayActiveOrders = isDemo ? DEMO_ACTIVE_ORDERS : activeOrders.length;
  const displayInStock = isDemo ? DEMO_IN_STOCK : inStockCount;
  const displayOutOfStock = isDemo ? DEMO_OUT_OF_STOCK : outOfStockCount;
  const displayRevenueTrendPercent = isDemo ? DEMO_REVENUE_TREND_PERCENT : revenueTrendPercent;
  const displayOrderCountTrendPercent = isDemo ? DEMO_ORDER_COUNT_TREND_PERCENT : orderCountTrendPercent;
  const displayDailySales: DailySales[] = isDemo
    ? dailySales.map((d, i) => ({ date: d.date, revenue: DEMO_DAILY_REVENUE_SHAPE[i] }))
    : dailySales;
  const displayOutOfStockItems = isDemo ? DEMO_OUT_OF_STOCK_ITEMS : outOfStockItems;
  const displayTopSelling = isDemo ? DEMO_TOP_SELLING : topSelling;
  const displayRecentOrders = isDemo ? DEMO_ORDERS.slice(0, 4) : recentOrders;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-black">Welcome back, {store?.name ?? 'Store owner'}</h1>
          <p className="mt-1 text-sm text-neutral-500">Here&apos;s what&apos;s happening with your store today.</p>
        </div>
        {store && <ToggleSwitch checked={store.is_active} onChange={handleToggleActive} disabled={isTogglingActive} />}
      </div>

      <div className="grid grid-cols-4 gap-6 md:grid-cols-[1.35fr_1fr_1fr_1fr]">
        <div className="col-span-4 flex flex-col gap-5 rounded-2xl border border-neutral-200 bg-white p-5 md:col-span-1 md:row-span-2">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Wallet size={15} />
                </div>
                <p className="truncate text-[16px] font-medium text-neutral-800">Revenue this week</p>
              </div>
              <ArrowRight size={15} className="-rotate-[40deg] shrink-0 text-neutral-300" />
            </div>
            <p className="mt-4 text-[33px] leading-none font-semibold tracking-tight text-black">{formatInr(displayWeeklyRevenue)}</p>
            <div className="mt-2.5 flex items-center gap-2">
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-1 text-[13px] font-semibold ${
                  displayRevenueTrendPercent >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}
              >
                {displayRevenueTrendPercent >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {Math.abs(displayRevenueTrendPercent).toFixed(1)}%
              </span>
              <span className="text-[13px] text-neutral-400">from last week</span>
            </div>
          </div>

          <div className="rounded-xl bg-[#E8EAED] px-4 py-3 text-sm text-neutral-600">
            Next payout on {pendingPayout ? formatDate(pendingPayout.week_end) : '—'}
          </div>

          <div className="flex flex-1 flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-black">New order</p>
              <Link href="/orders" className="text-xs font-medium text-neutral-500 hover:text-black">
                View
              </Link>
            </div>

            {previewOrder ? (
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
                <span className="text-sm text-neutral-600">{previewOrder.order_items.length} items</span>
                <button
                  type="button"
                  onClick={() => handleAcceptPreview(previewOrder.id)}
                  disabled={isAccepting}
                  className="rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                >
                  {isAccepting ? 'Accepting…' : 'Accept'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-dashed border-neutral-200 px-4 py-3">
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
          </div>
        </div>

        <div className="col-span-4 grid grid-cols-3 gap-4 md:col-span-3">
          <StatCard
            label="Today's orders"
            value={String(displayTodaysOrders)}
            icon={ShoppingBag}
            iconClassName="bg-blue-50 text-blue-600"
            trend={{ percent: displayOrderCountTrendPercent, label: 'from last week' }}
          />
          <StatCard
            label="Active orders"
            value={String(displayActiveOrders)}
            icon={Activity}
            iconClassName="bg-violet-50 text-violet-600"
            trend={{ percent: displayOrderCountTrendPercent, label: 'from last week' }}
          />
          <StatCard
            label="Products available"
            value={String(displayInStock)}
            icon={PackageCheck}
            iconClassName="bg-amber-50 text-amber-600"
            status={
              displayOutOfStock > 0
                ? { text: `${displayOutOfStock} out of stock`, tone: 'negative' }
                : { text: 'All in stock', tone: 'positive' }
            }
          />
        </div>

        <div className="col-span-4 md:col-span-3">
          <WeeklySalesChart data={displayDailySales} trendPercent={displayRevenueTrendPercent} />
        </div>

        <div className="col-span-4 h-full md:col-span-1">
          <InventoryAlertCard topSelling={displayTopSelling} outOfStock={displayOutOfStockItems} />
        </div>

        <div className="col-span-4 h-full overflow-hidden rounded-2xl border border-neutral-200 bg-white md:col-span-3">
          <div className="flex items-center justify-between px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ArrowLeftRight size={18} />
              </div>
              <p className="text-lg font-semibold text-black">Recent orders</p>
            </div>
            <Link
              href="/orders"
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3.5 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
            >
              View all
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-[1.1fr_1.3fr_1.2fr_0.8fr_0.9fr_0.9fr] items-center gap-3 bg-neutral-50 px-5 py-3 text-[15px] text-neutral-400">
            <span>Order</span>
            <span>Customer</span>
            <span>Items</span>
            <span>Amount</span>
            <span>Payment</span>
            <span>Status</span>
          </div>

          {displayRecentOrders.length === 0 ? (
            <p className="px-5 py-6 text-sm text-neutral-400">No orders yet.</p>
          ) : (
            displayRecentOrders.map((order) => {
              const customerName = order.addresses?.recipient_name ?? order.users?.name ?? 'Customer';
              const isPaid = !!order.razorpay_payment_id;
              return (
                <div
                  key={order.id}
                  className="grid grid-cols-[1.1fr_1.3fr_1.2fr_0.8fr_0.9fr_0.9fr] items-center gap-3 border-b border-neutral-100 px-5 py-[18px] last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-neutral-900">{order.order_number}</p>
                    <p className="text-[13px] whitespace-nowrap text-neutral-400">{formatDateTime(order.placed_at)}</p>
                  </div>
                  <p className="truncate text-[15px] font-medium text-neutral-900">{customerName}</p>
                  <ItemAvatars
                    images={order.order_items.slice(0, MAX_ITEM_AVATARS).map((item) => item.products?.image_url ?? null)}
                    count={order.order_items.length}
                  />
                  <span className="text-[15px] font-semibold text-neutral-900">{formatInr(order.total)}</span>
                  <span
                    className={`flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium ${
                      isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    <CreditCard size={13} />
                    {isPaid ? 'Paid' : 'Pending'}
                  </span>
                  <span className={`w-fit whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium ${statusColor(order.status)}`}>
                    {statusLabel(order.status)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
