// Pure grouping/pricing logic for a multi-store checkout — extracted so
// it's testable without a live Supabase connection, same reasoning as
// lib/orderValidation.ts and lib/pricing.ts. A "trip" is one checkout that
// spans more than one store: each store still gets its own real order (own
// item_total, own commission), but there's exactly ONE delivery fee and
// ONE combined total for the whole trip — see migrations/014_trips.sql's
// own note on why (a single rider does one multi-stop pickup, the customer
// pays once).

import type { CartItem, CartProduct } from './orderValidation.js';
import { calcItemTotal, calcCommission, calcOrderTotal, round2 } from './pricing.js';
import type { PricedCheckoutItem } from './checkoutItems.js';

export interface TripLegItem {
  product_id: string;
  variant_id?: string | null;
  unit_at_order?: string;
  variant_mrp_at_order?: number;
  quantity: number;
  unit_price_at_order: number;
}

export function groupPricedCartByStore(items: PricedCheckoutItem[], commissionRate: number): TripLeg[] {
  const groups = new Map<string, TripLeg>();
  for (const item of items) {
    const leg = groups.get(item.store_id) ?? { storeId: item.store_id, items: [], itemTotal: 0, commissionAmount: 0 };
    leg.items.push(item);
    groups.set(item.store_id, leg);
  }
  for (const leg of groups.values()) {
    leg.itemTotal = calcItemTotal(leg.items.map((item) => ({ unitPrice: item.unit_price_at_order, quantity: item.quantity })));
    leg.commissionAmount = calcCommission(leg.itemTotal, commissionRate);
  }
  return [...groups.values()];
}

export interface TripLeg {
  storeId: string;
  items: TripLegItem[];
  itemTotal: number;
  commissionAmount: number;
}

export interface TripTotals {
  itemTotal: number;
  deliveryFee: number;
  total: number;
}

// Splits a flat, possibly-multi-store cart into one leg per store, each
// with its own locked-in unit prices and item total — the same "lock the
// price at order time, never re-derive from current product prices" rule
// routes/orders.ts's own single-store path already follows.
export function groupCartByStore(items: CartItem[], products: CartProduct[], commissionRate: number): TripLeg[] {
  const priceByProduct = new Map(products.map((p) => [p.id, p.price]));
  const storeByProduct = new Map(products.map((p) => [p.id, p.store_id]));

  const legsByStore = new Map<string, TripLeg>();
  for (const item of items) {
    const storeId = storeByProduct.get(item.product_id);
    const unitPrice = priceByProduct.get(item.product_id);
    if (!storeId || unitPrice === undefined) continue; // validateMultiStoreCart already rejects this case before this runs

    let leg = legsByStore.get(storeId);
    if (!leg) {
      leg = { storeId, items: [], itemTotal: 0, commissionAmount: 0 };
      legsByStore.set(storeId, leg);
    }
    leg.items.push({ product_id: item.product_id, quantity: item.quantity, unit_price_at_order: unitPrice });
  }

  for (const leg of legsByStore.values()) {
    leg.itemTotal = calcItemTotal(leg.items.map((i) => ({ unitPrice: i.unit_price_at_order, quantity: i.quantity })));
    leg.commissionAmount = calcCommission(leg.itemTotal, commissionRate);
  }

  return [...legsByStore.values()];
}

// One delivery fee for the whole trip, added once to the sum of every
// leg's own item total — not once per store, which is the entire point of
// a trip over N independent single-store orders. The fee itself still
// scales with leg count: a 3-store trip means three separate pickups, not
// one, so it's baseFee plus extraStopFee for every store beyond the
// first. This computed deliveryFee becomes the rider's own trip-level
// earning once delivered (routes/orders.ts's trip-aware rider_earnings
// logic reads trips.delivery_fee, not a flat per-order rate) — the
// multi-stop surcharge customers pay is exactly what a rider is paid
// extra for doing the extra pickups.
export function calcTripTotal(legs: TripLeg[], baseFee: number, extraStopFee: number): TripTotals {
  const itemTotal = round2(legs.reduce((sum, leg) => sum + leg.itemTotal, 0));
  const deliveryFee = round2(baseFee + extraStopFee * Math.max(0, legs.length - 1));
  return { itemTotal, deliveryFee, total: calcOrderTotal(itemTotal, deliveryFee) };
}
