import { requireCheckoutEligibilitySnapshot } from './checkoutEligibilityService.js';
import { AppError } from './errors.js';
import { env } from '../config/env.js';
import { loadCheckoutItems } from './checkoutCatalog.js';
import { parseCheckoutItems } from './checkoutItems.js';
import { getDeliverySettings } from './deliverySettings.js';
import { calcItemTotal, round2 } from './pricing.js';
import { getCheckoutControls } from './platformSettings.js';
import { lookupPromoForCheckout } from '../routes/promos.js';
import { calculateCheckoutBill, issueQuote, requireConfirmedQuote } from './checkoutQuote.js';

export async function buildCheckoutSnapshot(input: unknown, customerId: string, promoCode?: string, storeId?: string, addressId?: string) {
  // Quotes return changed prices for review instead of rejecting old prices.
  // Creation rechecks the signed snapshot and the database trigger checks
  // prices/pack labels again inside the order transaction.
  if (promoCode != null && typeof promoCode !== 'string') throw new AppError(400, 'INVALID_PROMO', 'Choose a valid promo code.');
  const inputItems = parseCheckoutItems(input).map((item) => ({ product_id: item.product_id, variant_id: item.variant_id, quantity: item.quantity }));
  const { address, products, deliveryDistanceKm } = await requireCheckoutEligibilitySnapshot(inputItems, customerId, addressId);
  const items = await loadCheckoutItems(inputItems, storeId, products);
  const itemTotal = calcItemTotal(items.map((item) => ({ unitPrice: item.unit_price_at_order, quantity: item.quantity })));
  const promo = promoCode ? await lookupPromoForCheckout(promoCode, customerId, itemTotal)
    : { promoCodeId: null, discountAmount: 0 };
  const settings = await getDeliverySettings();
  return { items, bill: calculateCheckoutBill(items, settings, promo.discountAmount, deliveryDistanceKm ?? null), promoCodeId: promo.promoCodeId, address };
}
// Platform-wide minimum order (admin Checkout settings, migration 117) on the
// item subtotal before coupon discount. Outside the signed snapshot: the quote
// reports it for the cart, order/trip creation enforces it.
export function minimumOrder(itemTotal: number, minOrderValue: number) {
  return { value: minOrderValue, shortfall: round2(Math.max(0, minOrderValue - itemTotal)) };
}
export function assertMinimumOrder(itemTotal: number, minOrderValue: number) {
  const { value, shortfall } = minimumOrder(itemTotal, minOrderValue);
  if (shortfall > 0) {
    throw new AppError(409, 'BELOW_MINIMUM_ORDER', `The minimum order is ₹${value}. Add items worth ₹${shortfall} more to place this order.`);
  }
}
export async function createCheckoutQuote(input: unknown, customerId: string, promoCode?: string, addressId?: string) {
  const [snapshot, controls] = await Promise.all([buildCheckoutSnapshot(input, customerId, promoCode, undefined, addressId), getCheckoutControls()]);
  return { ...issueQuote(snapshot, customerId, env.supabaseServiceRoleKey), minimumOrder: minimumOrder(snapshot.bill.itemTotal, controls.minOrderValue) };
}
export async function confirmCheckoutQuote(input: unknown, customerId: string, token: unknown, promoCode?: string, storeId?: string, addressId?: string) {
  const snapshot = await buildCheckoutSnapshot(input, customerId, promoCode, storeId, addressId);
  requireConfirmedQuote(token, snapshot, customerId, env.supabaseServiceRoleKey);
  assertMinimumOrder(snapshot.bill.itemTotal, (await getCheckoutControls()).minOrderValue);
  return snapshot;
}
