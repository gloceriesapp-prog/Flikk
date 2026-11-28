// The impure side of the grid: reads live, in-stock data for the customer's
// nearby shops and their order history, and reduces it to the summaries the
// pure engine (packages/today-grid) needs. Reuses existing rules instead of
// copying them: storeIsOpen (shop hours), applyCustomerPrices (customer
// prices) and the pre-order cut-off (PREORDER_CUTOFF_MS).
import { supabase } from '../db/supabase.js';
import { storeIsOpen, type EligibilityStore } from '../lib/checkoutEligibility.js';
import { applyCustomerPrices } from '../lib/customerPrice.js';
import { activeMorningSlots, PREORDER_CUTOFF_MS, type PreorderSlot } from '../lib/preorders.js';
import { EMPTY_STAT, istClock, type Availability, type LocalBrands, type Stat, type UserSummary } from '../../../packages/today-grid/index.js';

export interface LiveProduct {
  id: string; store_id: string; category: string | null; sub_category_id: string | null; price: number; original_price: number | null;
  image_url: string | null; bulk_min_kg: number | null; morning_slot: boolean | null; party_enabled: boolean | null; brand_id: string | null;
}
export interface FishArrival { store_id: string; fish_arrived_at: string; fish_product_ids: string[]; expires_at: string }
export interface VillagePick { product_id: string; expires_at: string }
export interface LocalBrand { id: string; logo_url: string | null; local_sort: number | null; name: string }

const VEGETABLES = ['Fresh Vegetables'];
const FRUITS_AND_VEGETABLES = ['Fresh Vegetables', 'Fresh Fruits'];
const FISH_FALLBACK_CATEGORY = 'Non Veg';

// Count, cheapest price (+ its real MRP), best real discount, 2 photos —
// most popular items first.
export function statOf(products: LiveProduct[], ranked: string[] = []): Stat {
  if (!products.length) return EMPTY_STAT;
  const rank = new Map(ranked.map((id, index) => [id, index]));
  const cheapest = products.reduce((low, p) => (p.price < low.price ? p : low));
  const realMrp = (p: LiveProduct) => (p.original_price != null && p.original_price > p.price ? p.original_price : null);
  const pcts = products.flatMap(p => { const mrp = realMrp(p); return mrp ? [Math.floor(((mrp - p.price) / mrp) * 100)] : []; });
  const photos = [...products].filter(p => p.image_url).sort((x, y) => (rank.get(x.id) ?? 1e9) - (rank.get(y.id) ?? 1e9)).map(p => p.image_url!);
  return {
    count: products.length, minPrice: cheapest.price, minPriceMrp: realMrp(cheapest),
    maxDiscountPct: pcts.length && Math.max(...pcts) > 0 ? Math.max(...pcts) : null,
    imageUrls: [...new Set(photos)].slice(0, 2),
  };
}

// Earliest still-bookable morning slot (today or tomorrow), under the same
// cut-off checkout enforces. cutoffMinute = IST minute booking closes.
export function nextMorningSlot(slots: PreorderSlot[], now: Date): { open: boolean; cutoffMinute: number | null } {
  const days = [istClock(now).date, istClock(new Date(now.getTime() + 86_400_000)).date];
  for (const date of days) for (const slot of [...slots].sort((a, b) => a.starts_minute - b.starts_minute)) {
    const startsAt = Date.parse(`${date}T00:00:00+05:30`) + slot.starts_minute * 60_000;
    if (startsAt >= now.getTime() + PREORDER_CUTOFF_MS) return { open: true, cutoffMinute: istClock(new Date(startsAt - PREORDER_CUTOFF_MS)).minute };
  }
  return { open: false, cutoffMinute: null };
}

// Local brands with 1+ in-stock product, in admin order; logos of the top 2.
export function localBrandsInStock(brands: LocalBrand[], products: LiveProduct[]): LocalBrands {
  const stocked = new Set(products.map(p => p.brand_id).filter(Boolean));
  const live = brands.filter(b => stocked.has(b.id)).sort((a, b) => (a.local_sort ?? 1e9) - (b.local_sort ?? 1e9) || a.name.localeCompare(b.name));
  return { count: live.length, brandIds: live.map(b => b.id), logoUrls: live.map(b => b.logo_url).filter((u): u is string => !!u).slice(0, 2) };
}

export function summarizeAvailability(input: {
  now: Date; stores: EligibilityStore[]; products: LiveProduct[]; ranked: string[]; popularWeek: string[];
  morningSlots: PreorderSlot[]; arrivals: FishArrival[]; picks: VillagePick[]; localBrands: LocalBrand[];
}): Availability {
  const { now, products, ranked } = input;
  const live = <T extends { expires_at: string }>(rows: T[]) => rows.filter(row => Date.parse(row.expires_at) > now.getTime());
  const inCategories = (names: string[]) => products.filter(p => p.category && names.includes(p.category));
  const byCategory = new Map<string, LiveProduct[]>();
  for (const p of products) if (p.category) byCategory.set(p.category, [...(byCategory.get(p.category) ?? []), p]);
  // Today's catch: the listed fish products of shops that logged an arrival
  // today (any Non Veg item of that shop when none were listed).
  const arrivals = live(input.arrivals);
  const catchIds = new Set(arrivals.flatMap(a => a.fish_product_ids));
  const catchStores = new Set(arrivals.filter(a => !a.fish_product_ids.length).map(a => a.store_id));
  const fish = products.filter(p => catchIds.has(p.id) || (catchStores.has(p.store_id) && p.category === FISH_FALLBACK_CATEGORY));
  const firstArrival = arrivals.map(a => Date.parse(a.fish_arrived_at)).sort((a, b) => a - b)[0];
  const picked = new Set(live(input.picks).map(p => p.product_id));
  const popular = new Set(input.popularWeek);
  return {
    openStores: input.stores.filter(store => storeIsOpen(store, now)).length,
    categories: Object.fromEntries([...byCategory].map(([name, rows]) => [name, statOf(rows, ranked)])),
    fish: { ...statOf(fish, ranked), arrivedMinute: fish.length && firstArrival != null ? istClock(new Date(firstArrival)).minute : null },
    villagePickedToday: statOf(products.filter(p => picked.has(p.id)), ranked),
    vegetables: statOf(inCategories(VEGETABLES), ranked),
    fruitsAndVegetables: statOf(inCategories(FRUITS_AND_VEGETABLES), ranked),
    preorder: products.some(p => p.morning_slot) ? nextMorningSlot(input.morningSlots, now) : { open: false, cutoffMinute: null },
    bulk: statOf(products.filter(p => Number(p.bulk_min_kg) > 0), ranked),
    party: statOf(products.filter(p => p.party_enabled), ranked),
    popularThisWeek: statOf(products.filter(p => popular.has(p.id)), input.popularWeek),
    localBrands: localBrandsInStock(input.localBrands, products),
    productImages: Object.fromEntries(products.filter(p => p.image_url).map(p => [p.id, p.image_url!])),
  };
}

// Repeat items = bought in 2+ delivered orders; offers = live real discounts
// in categories bought before. Both only from what is in stock right now.
export function summarizeUser(history: { order_id: string; product_id: string; category: string | null }[] | null,
  deliveredOrders: number, products: LiveProduct[], ranked: string[]): UserSummary {
  if (!history) return { kind: 'guest', deliveredOrders: 0, usuals: EMPTY_STAT, offers: EMPTY_STAT, usualIds: [], offerIds: [] };
  const ordersPerProduct = new Map<string, Set<string>>();
  for (const row of history) ordersPerProduct.set(row.product_id, (ordersPerProduct.get(row.product_id) ?? new Set()).add(row.order_id));
  const repeat = new Set([...ordersPerProduct].filter(([, orders]) => orders.size >= 2).map(([id]) => id));
  const pastCategories = new Set(history.map(row => row.category).filter(Boolean));
  const usuals = products.filter(p => repeat.has(p.id));
  const offers = products.filter(p => p.category && pastCategories.has(p.category) && p.original_price != null && p.original_price > p.price);
  return { kind: 'customer', deliveredOrders, usuals: statOf(usuals, ranked), offers: statOf(offers, ranked), usualIds: usuals.map(p => p.id), offerIds: offers.map(p => p.id) };
}

// ---- database reads ----------------------------------------------------------
const PRODUCT_FIELDS = 'id, store_id, category, sub_category_id, price, original_price, image_url, bulk_min_kg, morning_slot, party_enabled, brand_id, product_variants(*)';
const CACHE_MS = 120_000;

async function readAvailability(storeIds: string[], now: Date) {
  const [stores, products, popularMonth, popularWeek, slots, arrivals, picks, brands] = await Promise.all([
    supabase.from('stores').select('id, zone_id, is_active, open_time, close_time, availability_override, availability_override_until, lat, lng, delivery_radius_km').in('id', storeIds),
    supabase.from('products').select(PRODUCT_FIELDS).in('store_id', storeIds).eq('approval_status', 'approved')
      .eq('is_in_stock', true).neq('stock_status', 'out_of_stock').eq('preorder_enabled', false),
    supabase.rpc('popular_customer_product_ids', { p_stores: storeIds, p_days: 30 }),
    supabase.rpc('popular_customer_product_ids', { p_stores: storeIds, p_days: 7 }),
    activeMorningSlots(),
    supabase.from('store_fresh_arrivals').select('store_id, fish_arrived_at, fish_product_ids, expires_at').in('store_id', storeIds).gt('expires_at', now.toISOString()),
    supabase.from('village_picks').select('product_id, expires_at').gt('expires_at', now.toISOString()),
    supabase.from('brands').select('id, name, logo_url, local_sort').eq('is_local', true).eq('is_active', true),
  ]);
  for (const result of [stores, products, popularMonth, popularWeek, arrivals, picks, brands]) if (result.error) throw result.error;
  const live = (applyCustomerPrices(products.data ?? []) as unknown as LiveProduct[])
    .map(p => ({ ...p, price: Number(p.price), original_price: p.original_price == null ? null : Number(p.original_price) }));
  const ranked = ((popularMonth.data ?? []) as { id: string }[]).map(row => row.id);
  const popularWeekIds = ((popularWeek.data ?? []) as { id: string }[]).map(row => row.id);
  const availability = summarizeAvailability({
    now, stores: (stores.data ?? []) as EligibilityStore[], products: live, ranked, popularWeek: popularWeekIds, morningSlots: slots,
    arrivals: (arrivals.data ?? []) as FishArrival[], picks: (picks.data ?? []) as VillagePick[], localBrands: (brands.data ?? []) as LocalBrand[],
  });
  return { availability, products: live, ranked, popularWeek: popularWeekIds };
}
export type NearbyLive = Awaited<ReturnType<typeof readAvailability>>;

const cache = new Map<string, { at: number; value: Promise<NearbyLive> }>();
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
