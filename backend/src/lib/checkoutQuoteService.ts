import { requireCheckoutEligibilitySnapshot } from './checkoutEligibilityService.js';
import { AppError } from './errors.js';
import { env } from '../config/env.js';
import { loadCheckoutItems } from './checkoutCatalog.js';
import { parseCheckoutItems } from './checkoutItems.js';
import { getDeliverySettings } from './deliverySettings.js';
import { calcItemTotal } from './pricing.js';
import { lookupPromoForCheckout } from '../routes/promos.js';
import { calculateCheckoutBill, issueQuote, requireConfirmedQuote } from './checkoutQuote.js';

export async function buildCheckoutSnapshot(input: unknown, customerId: string, promoCode?: string, storeId?: string, addressId?: string) {
  // Quotes return changed prices for review instead of rejecting old prices.
  // Creation rechecks the signed snapshot and the database trigger checks
  // prices/pack labels again inside the order transaction.
  if (promoCode != null && typeof promoCode !== 'string') throw new AppError(400, 'INVALID_PROMO', 'Choose a valid promo code.');
  const inputItems = parseCheckoutItems(input).map((item) => ({ product_id: item.product_id, variant_id: item.variant_id, quantity: item.quantity }));
  const { address, products } = await requireCheckoutEligibilitySnapshot(inputItems, customerId, addressId);
  const items = await loadCheckoutItems(inputItems, storeId, products);
  const itemTotal = calcItemTotal(items.map((item) => ({ unitPrice: item.unit_price_at_order, quantity: item.quantity })));
  const promo = promoCode ? await lookupPromoForCheckout(promoCode, customerId, itemTotal)
    : { promoCodeId: null, discountAmount: 0 };
  const settings = await getDeliverySettings();
  return { items, bill: calculateCheckoutBill(items, settings, promo.discountAmount), promoCodeId: promo.promoCodeId, address };
}
export async function createCheckoutQuote(input: unknown, customerId: string, promoCode?: string, addressId?: string) {
  return issueQuote(await buildCheckoutSnapshot(input, customerId, promoCode, undefined, addressId), customerId, env.supabaseServiceRoleKey);
}
export async function confirmCheckoutQuote(input: unknown, customerId: string, token: unknown, promoCode?: string, storeId?: string, addressId?: string) {
  const snapshot = await buildCheckoutSnapshot(input, customerId, promoCode, storeId, addressId);
  requireConfirmedQuote(token, snapshot, customerId, env.supabaseServiceRoleKey);
  return snapshot;
}
