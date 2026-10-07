import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from './errors.js';
import { calcItemTotal, calcOrderTotal, round2 } from './pricing.js';
import type { PricedCheckoutItem } from './checkoutItems.js';
import { distanceDeliveryFee } from './deliveryFees.js';
import type { DeliverySettings } from './deliverySettings.js';

export const EXTRA_STOP_FEE = 15;
export const QUOTE_TTL_MS = 5 * 60 * 1000;

// All values are rupees. Waive the whole delivery fee, including pickups,
// when free delivery applies, matching the existing trip policy. The base fee
// is priced by road distance to the farthest shop (delivery_settings tiers);
// a null distance charges the flat fee.
export function calculateCheckoutBill(items: PricedCheckoutItem[], settings: DeliverySettings, discountAmount: number, deliveryDistanceKm: number | null = null) {
  const storeCount = new Set(items.map((item) => item.store_id)).size;
  const itemTotal = calcItemTotal(items.map((item) => ({ unitPrice: item.unit_price_at_order, quantity: item.quantity })));
  const originalItemTotal = calcItemTotal(items.map((item) => ({ unitPrice: item.variant_mrp_at_order, quantity: item.quantity })));
  const deliveryFree = settings.freeDeliveryEnabled && itemTotal >= settings.freeDeliveryThreshold;
  const baseDeliveryFee = deliveryFree ? 0 : distanceDeliveryFee(deliveryDistanceKm, settings);
  const additionalShopFee = deliveryFree ? 0 : round2(EXTRA_STOP_FEE * Math.max(0, storeCount - 1));
  const deliveryFee = round2(baseDeliveryFee + additionalShopFee);
  return { storeCount, itemTotal, originalItemTotal, baseDeliveryFee, additionalShopFee, deliveryFee,
    deliveryDistanceKm: deliveryDistanceKm == null ? null : Math.round(deliveryDistanceKm * 10) / 10,
    handlingFee: settings.handlingFee, discountAmount,
    total: calcOrderTotal(itemTotal, deliveryFee, discountAmount, settings.handlingFee) };
}

export interface QuoteSnapshot {
  items: PricedCheckoutItem[];
  bill: ReturnType<typeof calculateCheckoutBill>;
  promoCodeId: string | null;
  address?: { id: string; zone_id: string; latitude: number | null; longitude: number | null };
}

export function quoteVersion(snapshot: QuoteSnapshot): string {
  const items = [...snapshot.items].sort((a, b) => `${a.product_id}:${a.variant_id}`.localeCompare(`${b.product_id}:${b.variant_id}`));
  return createHash('sha256').update(JSON.stringify({ ...snapshot, items })).digest('hex');
}

function signature(payload: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(`checkout-quote:v1:${payload}`).digest();
}
export function issueQuote(snapshot: QuoteSnapshot, customerId: string, secret: string, now = Date.now()) {
  const version = quoteVersion(snapshot);
  const expiresAt = now + QUOTE_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ customerId, version, expiresAt })).toString('base64url');
  return { ...snapshot, version, expiresAt, token: `${payload}.${signature(payload, secret).toString('base64url')}` };
}

// A quote binds the customer, packs, quantities, prices, MRP, fees and coupon.
// Stateless tokens work across backend replicas; never accept client totals.
export function requireConfirmedQuote(token: unknown, snapshot: QuoteSnapshot, customerId: string, secret: string, now = Date.now()) {
  try {
    if (typeof token !== 'string' || token.length > 2048) throw new Error();
    const parts = token.split('.');
    if (parts.length !== 2) throw new Error();
    const [payload, mac] = parts;
    if (!payload || !mac) throw new Error();
    const actual = Buffer.from(mac, 'base64url');
    const expected = signature(payload, secret);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error();
    const saved = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Record<string, unknown>;
    if (saved.customerId !== customerId || typeof saved.expiresAt !== 'number' || saved.expiresAt <= now
      || saved.expiresAt > now + QUOTE_TTL_MS || saved.version !== quoteVersion(snapshot)) throw new Error();
  } catch {
    throw new AppError(409, 'QUOTE_CHANGED', 'Your bill has changed or expired. Review the updated bill before ordering.');
  }
}

export function rejectUnsupportedTip(body: Record<string, unknown>) {
  if ([body.tip, body.tip_amount, body.rider_tip].some((value) => value != null && value !== 0)) {
    throw new AppError(400, 'TIPS_UNAVAILABLE', 'Rider tips are not available yet.');
  }
}
