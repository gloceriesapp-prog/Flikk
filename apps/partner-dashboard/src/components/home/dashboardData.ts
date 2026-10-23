import type { PartnerOrder, PartnerProduct, TodayStats } from '@/lib/partnerApi';
import { orderNetRevenue } from '../../lib/orderRevenue';

// Pure derivations for the Home page, kept out of the components so every
// card reads the same numbers from the same order list.

// Every store is in India and the backend scopes "today" to IST
// (todayIstRange in backend/src/routes/partner.ts), so day buckets use IST too
// rather than whatever timezone the owner's laptop happens to be set to.
const STORE_TIME_ZONE = 'Asia/Kolkata';
const DAY_MS = 24 * 60 * 60 * 1000;

const dayKeyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: STORE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const weekdayFormat = new Intl.DateTimeFormat('en-IN', { timeZone: STORE_TIME_ZONE, weekday: 'short' });
const shortDateFormat = new Intl.DateTimeFormat('en-IN', { timeZone: STORE_TIME_ZONE, day: 'numeric', month: 'short' });

// "2026-10-15" for the store-local calendar day an instant falls on.
export function storeDayKey(at: Date | number | string): string {
  return dayKeyFormat.format(new Date(at));
}

export function isStoreToday(iso: string | null, now: number): boolean {
  return iso !== null && storeDayKey(iso) === storeDayKey(now);
}

export function minutesSince(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
}

// "now" / "4 min" / "2 h" / "3 d" — short enough for a row's meta line.
export function timeAgo(iso: string, now: number): string {
  const m = minutesSince(iso, now);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

// Waiting time on a new order is the page's urgency signal: a customer
// starts to worry after ~5 minutes and the order is at risk after 10.
export type Urgency = 'ok' | 'warn' | 'late';
export function waitUrgency(minutes: number): Urgency {
  if (minutes > 10) return 'late';
  if (minutes > 5) return 'warn';
  return 'ok';
}

export function itemCount(order: PartnerOrder): number {
  return order.order_items.reduce((sum, item) => sum + item.quantity, 0);
}

// "6× Maggi, 2× Tomato +2 more": quantities up front, since that's what the
// owner reaches for on the shelf.
export function itemSummary(order: PartnerOrder, max = 2): string {
  const names = order.order_items.map((item) => `${item.quantity}× ${item.products?.name ?? 'Item'}`);
  const shown = names.slice(0, max).join(', ');
  return names.length > max ? `${shown} +${names.length - max} more` : shown;
}

export function firstItemImage(order: PartnerOrder): string | null {
  return order.order_items.find((item) => item.products?.image_url)?.products?.image_url ?? null;
}

// The most recent thing that happened to an order, for the activity feed's
// ordering and its "x min ago".
export function lastActivityAt(order: PartnerOrder): string {
  return order.delivered_at ?? order.picked_up_at ?? order.packed_at ?? order.placed_at;
}

export function sumTotals(orders: PartnerOrder[]): number {
  return orders.reduce((sum, o) => sum + o.total, 0);
}

export interface RevenueBucket {
  key: string;
  label: string;
  fullLabel: string;
  net: number;
  orders: number;
  isToday: boolean;
}

// Net earnings per store-local day over the last `days` days, oldest first.
// Same definition as the server's earningToday: delivered orders only,
// item_total − commission, bucketed by the day they were delivered. That keeps
// today's bar equal to the "Earnings today" tile.
export function revenueByDay(orders: PartnerOrder[], days: number, now: number): RevenueBucket[] {
  const todayKey = storeDayKey(now);
  const buckets: RevenueBucket[] = [];
  const index = new Map<string, RevenueBucket>();
  for (let i = days - 1; i >= 0; i--) {
    // Noon-ish offsets would be safer across DST, but IST has none.
    const at = now - i * DAY_MS;
    const key = storeDayKey(at);
    const bucket: RevenueBucket = {
      key,
      label: days <= 7 ? weekdayFormat.format(at) : shortDateFormat.format(at),
      fullLabel: `${weekdayFormat.format(at)}, ${shortDateFormat.format(at)}`,
      net: 0,
      orders: 0,
      isToday: key === todayKey,
    };
    buckets.push(bucket);
    index.set(key, bucket);
  }
  for (const order of orders) {
    if (order.status !== 'delivered' || !order.delivered_at) continue;
    const bucket = index.get(storeDayKey(order.delivered_at));
    if (!bucket) continue;
    bucket.net += orderNetRevenue(order);
    bucket.orders += 1;
  }
  return buckets;
}

// Client-side twin of GET /partner/stats/today, used only for demo data (the
// real page shows the server's figures so they match the phone app).
export function todayStatsFrom(orders: PartnerOrder[], now: number): TodayStats {
  const placedToday = orders.filter((o) => isStoreToday(o.placed_at, now));
  return {
    ordersToday: placedToday.length,
    pendingToday: placedToday.filter((o) => ['placed', 'packed', 'out_for_delivery'].includes(o.status)).length,
    earningToday: orders
      .filter((o) => o.status === 'delivered' && isStoreToday(o.delivered_at, now))
      .reduce((sum, o) => sum + orderNetRevenue(o), 0),
  };
}

// Average customer bill over today's orders that weren't cancelled. Null when
// there are none, so the tile shows a dash instead of dividing by zero.
export function averageOrderValueToday(orders: PartnerOrder[], now: number): number | null {
  const billed = orders.filter((o) => o.status !== 'cancelled' && isStoreToday(o.placed_at, now));
  return billed.length > 0 ? sumTotals(billed) / billed.length : null;
}

export interface TopProduct {
  id: string;
  name: string;
  imageUrl: string | null;
  unitsSold: number;
}

// Units sold per product across non-cancelled orders placed in the last
// `days` days, best sellers first.
export function topProducts(orders: PartnerOrder[], days: number, now: number, limit = 5): TopProduct[] {
  const since = now - days * DAY_MS;
  const byProduct = new Map<string, TopProduct>();
  for (const order of orders) {
    if (order.status === 'cancelled' || new Date(order.placed_at).getTime() < since) continue;
    for (const item of order.order_items) {
      const entry = byProduct.get(item.product_id) ?? {
        id: item.product_id,
        name: item.products?.name ?? 'Item',
        imageUrl: item.products?.image_url ?? null,
        unitsSold: 0,
      };
      entry.unitsSold += item.quantity;
      byProduct.set(item.product_id, entry);
    }
  }
  return [...byProduct.values()].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, limit);
}

export function outOfStockCount(products: PartnerProduct[]): number {
  return products.filter((p) => !p.is_in_stock || p.stock_status === 'out_of_stock').length;
}
