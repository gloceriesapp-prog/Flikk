// The impure side of the grid: reads live, in-stock data for the customer's
// nearby shops and their order history, and reduces it to the summaries the
// pure builder needs. Reuses the existing rules instead of copying them:
// storeIsOpen (shop hours), applyCustomerPrices (customer prices) and the
// pre-order cut-off (PREORDER_CUTOFF_MS, isMorningSlot).
import { supabase } from '../db/supabase.js';
import { storeIsOpen, type EligibilityStore } from '../lib/checkoutEligibility.js';
import { applyCustomerPrices } from '../lib/customerPrice.js';
import { activeMorningSlots, PREORDER_CUTOFF_MS, type PreorderSlot } from '../lib/preorders.js';
import { istClock } from './istClock.js';
import { EMPTY_STAT, type Availability, type Stat, type UserSummary } from './types.js';

export interface LiveProduct {
  id: string; store_id: string; category: string | null; price: number; original_price: number | null;
  image_url: string | null; bulk_min_kg: number | null; morning_slot: boolean | null;
  picked_at: string | null; party_enabled: boolean | null; brand_id: string | null;
}

const VEGETABLES = ['Fresh Vegetables'];
const FRUITS_AND_VEGETABLES = ['Fresh Vegetables', 'Fresh Fruits'];
const FISH = ['Non Veg'];

// Count, cheapest price (+ its real MRP), best real discount, 2 photos —
// photos from the most popular items first.
export function statOf(products: LiveProduct[], ranked: string[] = []): Stat {
  if (!products.length) return EMPTY_STAT;
  const rank = new Map(ranked.map((id, index) => [id, index]));
  const cheapest = products.reduce((low, p) => (p.price < low.price ? p : low));
  const realMrp = (p: LiveProduct) => (p.original_price != null && p.original_price > p.price ? p.original_price : null);
  const pcts = products.flatMap(p => { const mrp = realMrp(p); return mrp ? [Math.floor(((mrp - p.price) / mrp) * 100)] : []; });
  const photos = [...products].filter(p => p.image_url)
    .sort((x, y) => (rank.get(x.id) ?? 1e9) - (rank.get(y.id) ?? 1e9)).map(p => p.image_url!);
  return {
    count: products.length,
    minPrice: cheapest.price,
    minPriceMrp: realMrp(cheapest),
    maxDiscountPct: pcts.length && Math.max(...pcts) > 0 ? Math.max(...pcts) : null,
    imageUrls: [...new Set(photos)].slice(0, 2),
  };
}

// Earliest still-bookable morning slot (today or tomorrow), under the same
// cut-off checkout enforces. cutoffMinute is the IST minute booking closes.
export function nextMorningSlot(slots: PreorderSlot[], now: Date): { open: boolean; cutoffMinute: number | null } {
  const today = istClock(now).date;
  const tomorrow = istClock(new Date(now.getTime() + 86_400_000)).date;
  for (const date of [today, tomorrow]) {
    for (const slot of [...slots].sort((a, b) => a.starts_minute - b.starts_minute)) {
      const startsAt = Date.parse(`${date}T00:00:00+05:30`) + slot.starts_minute * 60_000;
      if (startsAt >= now.getTime() + PREORDER_CUTOFF_MS) return { open: true, cutoffMinute: istClock(new Date(startsAt - PREORDER_CUTOFF_MS)).minute };
    }
  }
  return { open: false, cutoffMinute: null };
}

export function summarizeAvailability(input: {
  now: Date; stores: EligibilityStore[]; products: LiveProduct[]; ranked: string[]; popularWeek: string[];
  morningSlots: PreorderSlot[]; fishArrivals: string[]; brandIds: string[];
}): Availability {
  const { now, products, ranked } = input;
  const today = istClock(now).date;
  const inCategories = (names: string[]) => products.filter(p => p.category && names.includes(p.category));
  const byCategory = new Map<string, LiveProduct[]>();
  for (const p of products) if (p.category) byCategory.set(p.category, [...(byCategory.get(p.category) ?? []), p]);
  const arrivals = input.fishArrivals.map(at => new Date(at)).filter(at => istClock(at).date === today).sort((a, b) => a.getTime() - b.getTime());
  const fish = inCategories(FISH);
  const popular = new Set(input.popularWeek);
  const brands = new Set(input.brandIds);
  const morning = products.some(p => p.morning_slot);
  return {
    openStores: input.stores.filter(store => storeIsOpen(store, now)).length,
    categories: Object.fromEntries([...byCategory].map(([name, rows]) => [name, statOf(rows, ranked)])),
    fish: { ...statOf(fish, ranked), arrivedMinute: fish.length && arrivals[0] ? istClock(arrivals[0]).minute : null },
    villagePickedToday: statOf(products.filter(p => p.picked_at && istClock(new Date(p.picked_at)).date === today), ranked),
    vegetables: statOf(inCategories(VEGETABLES), ranked),
    fruitsAndVegetables: statOf(inCategories(FRUITS_AND_VEGETABLES), ranked),
    preorder: morning ? nextMorningSlot(input.morningSlots, now) : { open: false, cutoffMinute: null },
    bulk: statOf(products.filter(p => Number(p.bulk_min_kg) > 0), ranked),
    party: statOf(products.filter(p => p.party_enabled), ranked),
    popularThisWeek: statOf(products.filter(p => popular.has(p.id)), input.popularWeek),
    brands: statOf(products.filter(p => p.brand_id && brands.has(p.brand_id)), ranked),
  };
}

// Repeat items = bought in 2+ delivered orders; offers = live real discounts
// in categories bought before. Both only from what is in stock right now.
export function summarizeUser(history: { order_id: string; product_id: string; category: string | null }[] | null,
  deliveredOrders: number, products: LiveProduct[], ranked: string[]): UserSummary {
  if (!history) return { kind: 'guest', deliveredOrders: 0, usuals: EMPTY_STAT, offers: EMPTY_STAT };
  const ordersPerProduct = new Map<string, Set<string>>();
  for (const row of history) ordersPerProduct.set(row.product_id, (ordersPerProduct.get(row.product_id) ?? new Set()).add(row.order_id));
  const repeat = new Set([...ordersPerProduct].filter(([, orders]) => orders.size >= 2).map(([id]) => id));
  const pastCategories = new Set(history.map(row => row.category).filter(Boolean));
  return {
    kind: 'customer', deliveredOrders,
    usuals: statOf(products.filter(p => repeat.has(p.id)), ranked),
    offers: statOf(products.filter(p => p.category && pastCategories.has(p.category) && p.original_price != null && p.original_price > p.price), ranked),
  };
}

// ---- database reads ----------------------------------------------------------
const PRODUCT_FIELDS = 'id, store_id, category, price, original_price, image_url, bulk_min_kg, morning_slot, picked_at, party_enabled, brand_id, product_variants(*)';
const CACHE_MS = 120_000;
const cache = new Map<string, { at: number; value: Promise<{ availability: Availability; products: LiveProduct[]; ranked: string[] }> }>();

async function readAvailability(storeIds: string[], now: Date) {
  const today = istClock(now).date;
  const [stores, products, popularMonth, popularWeek, slots, arrivals, brandCards] = await Promise.all([
    supabase.from('stores').select('id, zone_id, is_active, open_time, close_time, availability_override, availability_override_until, lat, lng, delivery_radius_km').in('id', storeIds),
    supabase.from('products').select(PRODUCT_FIELDS).in('store_id', storeIds).eq('approval_status', 'approved')
      .eq('is_in_stock', true).neq('stock_status', 'out_of_stock').eq('preorder_enabled', false),
    supabase.rpc('popular_customer_product_ids', { p_stores: storeIds, p_days: 30 }),
    supabase.rpc('popular_customer_product_ids', { p_stores: storeIds, p_days: 7 }),
    activeMorningSlots(),
    supabase.from('store_fresh_arrivals').select('fish_arrived_at').in('store_id', storeIds).eq('arrival_date', today),
    supabase.from('home_brand_cards').select('brand_id'),
  ]);
  for (const result of [stores, products, popularMonth, popularWeek, arrivals, brandCards]) if (result.error) throw result.error;
  const live = (applyCustomerPrices(products.data ?? []) as unknown as LiveProduct[]).map(p => ({ ...p, price: Number(p.price), original_price: p.original_price == null ? null : Number(p.original_price) }));
  const ranked = ((popularMonth.data ?? []) as { id: string }[]).map(row => row.id);
  const availability = summarizeAvailability({
    now, stores: (stores.data ?? []) as EligibilityStore[], products: live, ranked,
    popularWeek: ((popularWeek.data ?? []) as { id: string }[]).map(row => row.id),
    morningSlots: slots, fishArrivals: ((arrivals.data ?? []) as { fish_arrived_at: string }[]).map(row => row.fish_arrived_at),
    brandIds: ((brandCards.data ?? []) as { brand_id: string }[]).map(row => row.brand_id),
  });
  return { availability, products: live, ranked };
}

// Cached per store set for 2 minutes; a failed read is not cached.
export function nearbyAvailability(storeIds: string[], now: Date) {
  const key = [...storeIds].sort().join(',');
  const hit = cache.get(key);
  if (hit && now.getTime() - hit.at < CACHE_MS) return hit.value;
  const value = readAvailability(storeIds, now);
  cache.set(key, { at: now.getTime(), value });
  value.catch(() => cache.delete(key));
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  return value;
}

export async function customerSummary(customerId: string | null, products: LiveProduct[], ranked: string[]): Promise<UserSummary> {
  if (!customerId) return summarizeUser(null, 0, products, ranked);
  const { data: orders, error } = await supabase.from('orders').select('id').eq('customer_id', customerId).eq('status', 'delivered')
    .order('placed_at', { ascending: false }).limit(50);
  if (error) throw error;
  const ids = (orders ?? []).map(order => order.id as string);
  if (!ids.length) return summarizeUser([], 0, products, ranked);
  const { data: items, error: itemsError } = await supabase.from('order_items').select('order_id, product_id, products(category)').in('order_id', ids);
  if (itemsError) throw itemsError;
  const history = ((items ?? []) as unknown as { order_id: string; product_id: string; products: { category: string | null } | null }[])
    .map(row => ({ order_id: row.order_id, product_id: row.product_id, category: row.products?.category ?? null }));
  return summarizeUser(history, ids.length, products, ranked);
}
