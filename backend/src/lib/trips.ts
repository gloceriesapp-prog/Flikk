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

export interface TripLegItem {
  product_id: string;
  quantity: number;
  unit_price_at_order: number;
}

export interface TripLeg {
  storeId: string;
  items: TripLegItem[];
  itemTotal: number;
  commissionAmount: number;
}

export interface TripTotals {
  itemTotal: number;
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
// a trip over N independent single-store orders.
export function calcTripTotal(legs: TripLeg[], deliveryFee: number): TripTotals {
  const itemTotal = round2(legs.reduce((sum, leg) => sum + leg.itemTotal, 0));
  return { itemTotal, total: calcOrderTotal(itemTotal, deliveryFee) };
}
