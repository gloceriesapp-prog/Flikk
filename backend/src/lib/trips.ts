// Pure grouping/pricing logic for a multi-store checkout — extracted so
// it's testable without a live Supabase connection, same reasoning as
// lib/orderValidation.ts and lib/pricing.ts. A "trip" is one checkout that
// spans more than one store: each store still gets its own real order (own
// item_total, own commission), but there's exactly ONE delivery fee and
// ONE combined total for the whole trip — see migrations/014_trips.sql's
// own note on why (a single rider does one multi-stop pickup, the customer
// pays once). The live trip total/fee is computed by calculateCheckoutBill
// (lib/checkoutBill.ts) and routes/trips.ts, not here.

import { calcItemTotal } from './pricing.js';
import type { PricedCheckoutItem } from './checkoutItems.js';

export interface TripLegItem {
  product_id: string;
  variant_id?: string | null;
  unit_at_order?: string;
  variant_mrp_at_order?: number;
  quantity: number;
  unit_price_at_order: number;
}

export interface TripLeg {
  storeId: string;
  items: TripLegItem[];
  itemTotal: number;
  commissionAmount: number;
}

// commissions: what each store pays for its leg, from lib/commission.ts
// (category rates, store overrides and the per-order cap).
export function groupPricedCartByStore(items: PricedCheckoutItem[], commissions: Map<string, number>): TripLeg[] {
  const groups = new Map<string, TripLeg>();
  for (const item of items) {
    const leg = groups.get(item.store_id) ?? { storeId: item.store_id, items: [], itemTotal: 0, commissionAmount: 0 };
    leg.items.push(item);
    groups.set(item.store_id, leg);
  }
  for (const leg of groups.values()) {
    leg.itemTotal = calcItemTotal(leg.items.map((item) => ({ unitPrice: item.unit_price_at_order, quantity: item.quantity })));
    leg.commissionAmount = commissions.get(leg.storeId) ?? 0;
  }
  return [...groups.values()];
}
