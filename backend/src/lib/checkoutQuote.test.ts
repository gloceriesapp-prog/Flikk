import { describe, expect, it } from 'vitest';
import { calculateCheckoutBill, issueQuote, requireConfirmedQuote, parseTip } from './checkoutQuote.js';
import type { PricedCheckoutItem } from './checkoutItems.js';
import { quotedCartItems, quoteHasPriceChanges } from '../../../apps/customer/src/screens/cart/quote/quoteItems';
import type { CheckoutQuote } from '../../../apps/customer/src/api/checkout';

const line = (shop: string, price = 40, quantity = 1): PricedCheckoutItem => ({ product_id: `product-${shop}`, variant_id: null,
  store_id: shop, quantity, unit_price_at_order: price, unit_at_order: '1 kg', variant_mrp_at_order: 50 });
const settings = { flatDeliveryFee: 20, handlingFee: 5, freeDeliveryEnabled: false, freeDeliveryThreshold: 100, estimatedDeliveryMinutes: 35 };
const items = [line('a'), line('b'), line('c')];
const snapshot = { items, bill: calculateCheckoutBill(items, settings, 10), promoCodeId: 'promo' };
const secret = 'test-only-signing-secret';

describe('authoritative checkout bill', () => {
  it('includes each additional pickup once and never duplicates handling', () => {
    expect(snapshot.bill).toMatchObject({ storeCount: 3, itemTotal: 120, originalItemTotal: 150,
      baseDeliveryFee: 20, additionalShopFee: 30, deliveryFee: 50, handlingFee: 5, discountAmount: 10, total: 165 });
  });
  it('does not charge extra stops for multiple variants at one shop', () => {
    expect(calculateCheckoutBill([line('a'), { ...line('a', 25), variant_id: 'pack' }], settings, 0))
      .toMatchObject({ storeCount: 1, additionalShopFee: 0, total: 90 });
  });
  it('charges the configured extra store fee per additional shop', () => {
    expect(calculateCheckoutBill(items, { ...settings, extraStopFee: 10 }, 0))
      .toMatchObject({ baseDeliveryFee: 20, additionalShopFee: 20, deliveryFee: 40 });
    expect(calculateCheckoutBill(items, { ...settings, extraStopFee: 0 }, 0))
      .toMatchObject({ additionalShopFee: 0, deliveryFee: 20 });
  });
  it('waives all delivery charges at the threshold but keeps handling', () => {
    expect(calculateCheckoutBill(items, { ...settings, freeDeliveryEnabled: true }, 10))
      .toMatchObject({ deliveryFee: 0, additionalShopFee: 0, total: 115 });
    expect(calculateCheckoutBill([line('a', 99)], { ...settings, freeDeliveryEnabled: true }, 0).deliveryFee).toBe(20);
  });
  it('rounds decimal money and prevents negative totals', () => {
    expect(calculateCheckoutBill([line('a', 10.15, 3)], settings, 0).total).toBe(55.45);
    expect(calculateCheckoutBill(items, settings, 1000).total).toBe(0);
  });
});
describe('quote confirmation boundary', () => {
  const quote = issueQuote(snapshot, 'customer-a', secret, 1000);
  it('accepts the unchanged quote across replicas and item reordering', () => {
    expect(() => requireConfirmedQuote(quote.token, { ...snapshot, items: [...items].reverse() }, 'customer-a', secret, 2000)).not.toThrow();
  });
  it('rejects expired, malformed, tampered and another customer’s quote', () => {
    for (const token of [null, '', 'x.y', quote.token + 'x', quote.token.split('.')[0] + '.AAAA']) {
      expect(() => requireConfirmedQuote(token, snapshot, 'customer-a', secret, 2000)).toThrow();
    }
    expect(() => requireConfirmedQuote(quote.token, snapshot, 'customer-b', secret, 2000)).toThrow();
    expect(() => requireConfirmedQuote(quote.token, snapshot, 'customer-a', secret, quote.expiresAt)).toThrow();
    expect(() => requireConfirmedQuote(quote.token, snapshot, 'customer-a', 'another-secret', 2000)).toThrow();
  });
  it('requires new consent for prices, pack sizes, quantities, fees and coupons, even if total stays equal', () => {
    const changed = [
      { ...snapshot, items: [line('a', 41), ...items.slice(1)] },
      { ...snapshot, items: [{ ...items[0]!, unit_at_order: '500 g' }, ...items.slice(1)] },
      { ...snapshot, items: [{ ...items[0]!, quantity: 2 }, ...items.slice(1)] },
      { ...snapshot, bill: { ...snapshot.bill, handlingFee: 6, baseDeliveryFee: 19 } },
      { ...snapshot, promoCodeId: 'another-promo' },
    ];
    for (const version of changed) expect(() => requireConfirmedQuote(quote.token, version, 'customer-a', secret, 2000))
      .toThrow('Your bill has changed or expired');
  });
  it('accepts whole-rupee tips from 0 to 500 and refuses anything else', () => {
    expect(parseTip({})).toBe(0);
    expect(parseTip({ tip_amount: 0 })).toBe(0);
    expect(parseTip({ tip_amount: 20 })).toBe(20);
    expect(parseTip({ tip_amount: 500 })).toBe(500);
    for (const bad of [-1, 501, 10.5, '20', Number.NaN]) expect(() => parseTip({ tip_amount: bad })).toThrow();
  });
  it('adds the tip after the discount, so a coupon never eats into it', () => {
    const plain = calculateCheckoutBill(items, settings, 1000);
    expect(plain.total).toBe(0);
    expect(calculateCheckoutBill(items, settings, 1000, null, 30)).toMatchObject({ tipAmount: 30, total: 30 });
    expect(calculateCheckoutBill(items, settings, 10, null, 20).total).toBe(round(calculateCheckoutBill(items, settings, 10).total + 20));
  });
});
const round = (n: number) => Math.round(n * 100) / 100;
describe('customer quote presentation', () => {
  const cart = [{ id: 'product-a', storeId: 'a', quantity: 1, name: 'Rice', price: 35, weight: '1 kg' }];
  const quote = issueQuote({ items: [line('a')], bill: calculateCheckoutBill([line('a')], settings, 0), promoCodeId: null }, 'a', secret) as CheckoutQuote;
  it('shows changed server prices in the bill and receipt without mutating the saved cart', () => {
    expect(quoteHasPriceChanges(cart, quote)).toBe(true);
    expect(quotedCartItems(cart, quote)[0]).toMatchObject({ name: 'Rice', price: 40, originalPrice: 50, weight: '1 kg' });
    expect(cart[0]!.price).toBe(35);
    expect(quoteHasPriceChanges(quotedCartItems(cart, quote), quote)).toBe(false);
  });
  it('never substitutes another pack from the same product', () => {
    expect(() => quotedCartItems([{ ...cart[0]!, variantId: 'different-pack' }], quote)).toThrow();
  });
});

describe('checkout fee comparison display', () => {
  it('quotes original fees without charging or discounting them', () => {
    const bill = calculateCheckoutBill([line('a')], { ...settings, handlingFee: 10.01, originalHandlingFee: 12.55, originalDeliveryFee: 30 }, 0);
    expect(bill).toMatchObject({ originalBaseDeliveryFee: 30, baseDeliveryFee: 20, originalHandlingFee: 12.55, handlingFee: 10.01, total: 70.01 });
  });
  it('uses the configured original when delivery is waived', () => {
    const bill = calculateCheckoutBill(items, { ...settings, freeDeliveryEnabled: true, originalDeliveryFee: 35, deliveryFeeTiers: [{ upToKm: 5, fee: 35 }] }, 0, 4);
    expect(bill).toMatchObject({ originalBaseDeliveryFee: 35, baseDeliveryFee: 0, additionalShopFee: 0, total: 125 });
  });
  it('shows only the actual price when originals are blank, including free delivery', () => {
    const bill = calculateCheckoutBill(items, { ...settings, freeDeliveryEnabled: true }, 0);
    expect(bill.originalBaseDeliveryFee).toBeUndefined();
    expect(bill.originalHandlingFee).toBeUndefined();
  });
  it('hides equal, smaller and invalid original amounts', () => {
    for (const original of [0, 4, 5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(calculateCheckoutBill(items, { ...settings, originalHandlingFee: original }, 0).originalHandlingFee).toBeUndefined();
    }
  });
  it('keeps FREE display preferences separate from actual charges', () => {
    const bill = calculateCheckoutBill(items, { ...settings, handlingFee: 0, originalHandlingFee: 12.55, deliveryFeeShowFree: false, handlingFeeShowFree: true }, 0);
    expect(bill).toMatchObject({ handlingFee: 0, originalHandlingFee: 12.55, deliveryFeeShowFree: false, handlingFeeShowFree: true, total: 170 });
  });
});
