// Cart-level promo code validation + discount math. Pure and testable
// (same reasoning as lib/orderValidation.ts/lib/trips.ts) — the actual DB
// reads (promo_codes lookup, promo_redemptions existence check) happen in
// routes/promos.ts and routes/orders.ts/routes/trips.ts; this file only
// ever receives already-fetched rows so it never touches Supabase itself.
//
// Shared between POST /orders and POST /trips (routes/promos.ts's own
// applyPromoCode is the one entry point both call) — a promo code doesn't
// care whether the cart happens to span one store or several, only what
// the cart's own item_total is.

import { round2 } from './pricing.js';

export interface PromoCodeRow {
  id: string;
  code: string;
  discount_type: 'flat' | 'percent';
  discount_value: number;
  max_discount_amount: number | null;
  min_order_value: number;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
  expires_at: string | null;
}

export class PromoValidationError extends Error {
  constructor(
    public code: 'PROMO_NOT_FOUND' | 'PROMO_INACTIVE' | 'PROMO_EXPIRED' | 'PROMO_USAGE_LIMIT_REACHED' | 'PROMO_BELOW_MIN_ORDER' | 'PROMO_ALREADY_USED',
    message: string,
  ) {
    super(message);
  }
}

// Never discounts below ₹0 remaining and never discounts more than the
// cart's own item_total (a flat-₹500-off code on a ₹100 cart shouldn't
// produce a negative total upstream — calcOrderTotal floors at 0 too, but
// the discount NUMBER itself should already be honest about what it's
// actually worth against this specific cart).
//
// Integer paise with one half-up rounding, identical to migration 096's
// guard_promo_redemption — float `x * pct / 100` rounding disagreed with
// SQL numeric on half-paisa boundaries and rejected valid checkouts.
// Inputs are numeric(10,2) money/percent values, so `* 100` lands within
// float noise of an integer and Math.round recovers it exactly; the
// product stays well under 2^53 for any realistic cart.
const toPaise = (rupees: number) => Math.round(rupees * 100);
export function calcDiscount(itemTotal: number, promo: PromoCodeRow): number {
  const itemPaise = toPaise(itemTotal);
  let paise = promo.discount_type === 'flat'
    ? toPaise(promo.discount_value)
    : Math.floor((itemPaise * toPaise(promo.discount_value) + 5000) / 10000);
  if (promo.max_discount_amount != null) paise = Math.min(paise, toPaise(promo.max_discount_amount));
  return Math.max(Math.min(paise, itemPaise), 0) / 100;
}

// Throws in the order a customer would most intuitively hit them: does
// the code exist at all, is it currently usable, has THIS customer
// already used it, then does THIS cart qualify. `alreadyRedeemed` is
// passed in rather than queried here — the caller already needs to check
// promo_redemptions for the (promo_code_id, customer_id) unique
// constraint before this point, no reason to query it twice.
export function validatePromoCode(promo: PromoCodeRow, itemTotal: number, alreadyRedeemed: boolean): number {
  if (!promo.is_active) {
    throw new PromoValidationError('PROMO_INACTIVE', 'This code is no longer active.');
  }
  if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
    throw new PromoValidationError('PROMO_EXPIRED', 'This code has expired.');
  }
  if (promo.usage_limit != null && promo.times_used >= promo.usage_limit) {
    throw new PromoValidationError('PROMO_USAGE_LIMIT_REACHED', 'This code has been fully redeemed.');
  }
  if (alreadyRedeemed) {
    throw new PromoValidationError('PROMO_ALREADY_USED', "You've already used this code.");
  }
  if (itemTotal < promo.min_order_value) {
    throw new PromoValidationError('PROMO_BELOW_MIN_ORDER', `Add ₹${round2(promo.min_order_value - itemTotal)} more to use this code.`);
  }
  return calcDiscount(itemTotal, promo);
}
