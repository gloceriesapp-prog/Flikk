import { describe, expect, it } from 'vitest';
import { applyCustomerPrices, customerUnitPrice, storeItemTotal, toStoreOrder, withoutMarkup } from './customerPrice.js';
import { parseCheckoutItems, priceCheckoutItems, type CheckoutProduct } from './checkoutItems.js';
import { storeCommissions, type CommissionRules } from './commission.js';
import { groupPricedCartByStore } from './trips.js';
import { customerUnitPrice as adminCustomerUnitPrice } from '../../../apps/admin/src/lib/productValidation';

const productId = '00000000-0000-4000-8000-000000000011';
const packId = '00000000-0000-4000-8000-000000000012';

describe('customerUnitPrice', () => {
  it('adds the markup to the store price', () => {
    expect(customerUnitPrice(300, 15, null)).toBe(315);
    expect(customerUnitPrice(300, 0, 400)).toBe(300);
    expect(customerUnitPrice(9.99, 0.02, null)).toBe(10.01);
  });
  it('never charges above MRP, and never below the store price', () => {
    expect(customerUnitPrice(300, 15, 310)).toBe(310);
    expect(customerUnitPrice(300, 15, 315)).toBe(315);
    expect(customerUnitPrice(320, 15, 310)).toBe(320);
  });
  it('is the same rule in the admin form', () => {
    for (const [store, markup, mrp] of [[300, 15, null], [300, 15, 310], [320, 15, 310], [9.99, 0.02, null], [50, 0, 60]] as const) {
      expect(adminCustomerUnitPrice(store, markup, mrp)).toBe(customerUnitPrice(store, markup, mrp));
    }
  });
  it('treats a missing or negative markup as none', () => {
    expect(customerUnitPrice(50, null, null)).toBe(50);
    expect(customerUnitPrice(50, -5, null)).toBe(50);
  });
});

describe('customer feeds', () => {
  const row = { id: productId, price: 300, original_price: 400, stores: { name: 'Shop' }, product_variants: [
    { id: 'a', price: 300, original_price: 400, is_default: true, platform_markup: '15.00' },
    { id: 'b', price: 58, original_price: 60, is_default: false, platform_markup: 5 },
  ] };
  it('shows every pack at its customer price and hides the markup', () => {
    const [shown] = applyCustomerPrices([row]);
    expect(shown.price).toBe(315);
    expect(shown.product_variants.map((v) => v.price)).toEqual([315, 60]);
    expect(shown.product_variants.some((v) => 'platform_markup' in v)).toBe(false);
  });
  it('handles rows that embed the product (wishlist)', () => {
    const [item] = applyCustomerPrices([{ id: 'w', products: row }]);
    expect(item.products.product_variants[0]!.price).toBe(315);
  });
  it('gives a store its own rows without the markup', () => {
    const own = withoutMarkup(row);
    expect(own.product_variants[0]).not.toHaveProperty('platform_markup');
    expect(own.product_variants[0]!.price).toBe(300);
  });
});

describe('store side of an order', () => {
  it('shows the store its own prices and total only', () => {
    const order = toStoreOrder({ id: 'o', total: 360, item_total: 330, store_item_total: 300, commission_amount: 18,
      order_items: [{ quantity: 1, unit_price_at_order: 330, store_unit_price_at_order: 300 }] });
    expect(order).toMatchObject({ total: 300, item_total: 300, commission_amount: 18 });
    expect(order).not.toHaveProperty('store_item_total');
    expect(order.order_items[0]).toEqual({ quantity: 1, unit_price_at_order: 300 });
  });
  it('reads orders placed before the markup as they were', () => {
    expect(toStoreOrder({ total: 120, item_total: 100, store_item_total: null, order_items: [{ unit_price_at_order: 50, store_unit_price_at_order: null }] }))
      .toMatchObject({ total: 100, item_total: 100, order_items: [{ unit_price_at_order: 50 }] });
    expect(storeItemTotal({ item_total: 100, store_item_total: null })).toBe(100);
    expect(storeItemTotal({ item_total: 110, store_item_total: 100 })).toBe(100);
  });
});

describe('checkout with a markup', () => {
  const product: CheckoutProduct = { id: productId, store_id: 'shop', is_in_stock: true, price: 300, unit: '5 kg', product_variants: [
    { id: packId, unit_type: 'kg', quantity: 5, price: 300, original_price: 400, is_default: true, platform_markup: '15' },
  ] };
  const rules: CommissionRules = { defaultRate: 0.06, capPerOrder: null, categoryRates: new Map(), stores: new Map() };

  it('charges the customer price and keeps the store price for the store', () => {
    const [line] = priceCheckoutItems(parseCheckoutItems([{ product_id: productId, variant_id: packId, quantity: 2, expected_unit_price: 315 }]), [product]);
    expect(line).toMatchObject({ unit_price_at_order: 315, store_unit_price: 300, variant_mrp_at_order: 400 });
  });
  it('rejects a cart priced at the store price once a markup exists', () => {
    expect(() => priceCheckoutItems(parseCheckoutItems([{ product_id: productId, variant_id: packId, quantity: 1, expected_unit_price: 300 }]), [product]))
      .toThrow('price has changed');
  });
  it('charges commission on the store price only; Gloceries keeps commission + markup', () => {
    const lines = priceCheckoutItems(parseCheckoutItems([{ product_id: productId, variant_id: packId, quantity: 2 }]), [product]);
    const commission = storeCommissions(lines, new Map(), rules).get('shop')!;
    const [leg] = groupPricedCartByStore(lines, new Map([['shop', commission]]));
    expect(commission).toBe(36);
    expect(leg!.itemTotal).toBe(630);
    const storeTotal = lines.reduce((sum, l) => sum + l.store_unit_price * l.quantity, 0);
    expect(storeTotal - commission).toBe(564);
    expect(leg!.itemTotal - (storeTotal - commission)).toBe(66);
  });
  it('charges no commission on a product the admin waived; we keep only the extra', () => {
    const lines = priceCheckoutItems(parseCheckoutItems([{ product_id: productId, variant_id: packId, quantity: 2 }]), [product]);
    expect(storeCommissions(lines, new Map(), rules, new Set([productId])).get('shop')).toBe(0);
    expect(storeCommissions(lines, new Map(), rules, new Set(['other'])).get('shop')).toBe(36);
  });
  it('hides the commission flag from customers', () => {
    const [shown] = applyCustomerPrices([{ id: productId, waive_commission: true, product_variants: [{ price: 10, original_price: null, is_default: true, platform_markup: 1 }] }]);
    expect(shown).not.toHaveProperty('waive_commission');
  });
});
