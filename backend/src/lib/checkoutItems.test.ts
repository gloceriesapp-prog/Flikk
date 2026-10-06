import { describe, expect, it } from 'vitest';
import { checkoutTransactionError, parseCheckoutItems, priceCheckoutItems, type CheckoutProduct } from './checkoutItems.js';
import { groupPricedCartByStore } from './trips.js';
import { cartIdentity, checkoutItems } from '../../../apps/customer/src/store/cartIdentity';
import { mapApiProduct, type ApiProduct } from '../../../apps/customer/src/api/products';

const productId = '00000000-0000-4000-8000-000000000001';
const smallId = '00000000-0000-4000-8000-000000000002';
const largeId = '00000000-0000-4000-8000-000000000003';
const product: CheckoutProduct = { id: productId, store_id: 'shop', is_in_stock: true, price: 10, unit: '250 g',
  product_variants: [
    { id: smallId, unit_type: 'g', quantity: 250, price: 10, original_price: 15, is_default: true },
    { id: largeId, unit_type: 'kg', quantity: 1, price: 32, original_price: 40, is_default: false },
  ] };
const line = { product_id: productId, variant_id: largeId, quantity: 2 };

describe('variant checkout contract', () => {
  it.each(['40001', 'P0001'])('returns a recoverable conflict for transaction failure %s', (code) => {
    expect(checkoutTransactionError(code).status).toBe(409);
  });
  it('does not expose database failures as customer messages', () => {
    expect(checkoutTransactionError('XX000')).toMatchObject({ status: 500, message: 'Could not create your order. Please try again.' });
  });
  it('sends separate product and variant IDs, including existing persisted composite keys', () => {
    expect(checkoutItems([{ id: `${productId}::${largeId}`, quantity: 2, price: 32 }])).toEqual([
      { ...line, expected_unit_price: 32 },
    ]);
    expect(cartIdentity({ id: productId }).productId).toBe(productId);
    expect(() => checkoutItems([{ id: `${productId}::preview-bulk`, quantity: 1 }])).toThrow('sample pack');
  });
  it('rejects composite product IDs, invented variants and invalid quantities at the API boundary', () => {
    for (const invalid of [{ ...line, product_id: `${productId}::${largeId}` }, { ...line, variant_id: 'preview-bulk' },
      ...[0, -1, 1.5, 1000, '2'].map((quantity) => ({ ...line, quantity }))]) {
      expect(() => parseCheckoutItems([invalid])).toThrow();
    }
  });
  it('takes variant price, pack and MRP from the database rather than client fields', () => {
    const parsed = parseCheckoutItems([{ ...line, unit_price_at_order: 1, unit_at_order: '100 kg' }]);
    expect(priceCheckoutItems(parsed, [product])[0]).toMatchObject({ unit_price_at_order: 32, unit_at_order: '1 kg', variant_mrp_at_order: 40 });
  });
  it('allows two packs of one product without collapsing their prices', () => {
    const items = priceCheckoutItems([line, { product_id: productId, variant_id: smallId, quantity: 3 }], [product]);
    const legs = groupPricedCartByStore(items, 0.1);
    expect(legs[0].items).toHaveLength(2);
    expect(legs[0].itemTotal).toBe(94);
    expect(legs[0].commissionAmount).toBe(9.4);
  });
  it('rejects variants removed from or belonging to another product', () => {
    expect(() => priceCheckoutItems([{ ...line, variant_id: productId }], [product])).toThrow('pack is no longer');
  });
  it('enforces the shared product availability for every variant', () => {
    expect(() => priceCheckoutItems([line], [{ ...product, is_in_stock: false }])).toThrow('out of stock');
  });
  it('rejects a changed displayed price without charging the new price silently', () => {
    expect(() => priceCheckoutItems([{ ...line, expected_unit_price: 10 }], [product])).toThrow('price has changed');
  });
  it('resolves a legacy base line to the real default pack and combines duplicate aliases', () => {
    expect(priceCheckoutItems([{ product_id: productId, quantity: 1 },
      { product_id: productId, variant_id: smallId, quantity: 2 }], [product])).toMatchObject([
      { variant_id: smallId, quantity: 3, unit_price_at_order: 10, unit_at_order: '250 g' },
    ]);
  });
  it('keeps base products with no variants orderable without inventing a size', () => {
    expect(priceCheckoutItems([{ product_id: productId, quantity: 1 }], [{ ...product, product_variants: [] }])[0])
      .toMatchObject({ variant_id: null, unit_price_at_order: 10, unit_at_order: '250 g' });
  });
});

describe('database-only customer pack mapping', () => {
  const apiProduct = { ...product, name: 'Rice', local_name: null, category: 'Rice', description: null,
    original_price: null, image_url: null, bg_color: null, is_veg: true, freshness_tag: null, stores: null } as ApiProduct;
  it('does not synthesize variants or pack sizes for a variant-less product', () => {
    const mapped = mapApiProduct({ ...apiProduct, unit: '1 bag', product_variants: [] });
    expect(mapped.weight).toBe('1 bag');
    expect(mapped.variants).toBeUndefined();
    expect(mapped.sizeOptions).toBeUndefined();
  });
  it('uses a single actual pack without manufacturing a second option', () => {
    const mapped = mapApiProduct({ ...apiProduct, price: 100, product_variants: [product.product_variants[0]] });
    expect(mapped.sizeOptions).toEqual(['250 g']);
    expect(mapped.variants).toBeUndefined();
    expect(mapped.defaultVariantId).toBe(smallId);
    expect(mapped.price).toBe(10);
  });
  it('preserves actual default ordering, pack quantities and individual prices', () => {
    const mapped = mapApiProduct({ ...apiProduct, product_variants: [...product.product_variants].reverse() });
    expect(mapped.variants?.map((v) => [v.id, v.label, v.price])).toEqual([[smallId, '250 g', 10], [largeId, '1 kg', 32]]);
  });
  it('selects an available actual pack when the preferred pack is depleted', () => {
    const mapped = mapApiProduct({ ...apiProduct, stock_tracking_enabled: true, stock_quantity: 2, product_variants: apiProduct.product_variants.map(v => ({ ...v, stock_quantity: v.id === smallId ? 0 : 2 })) });
    expect(mapped.defaultVariantId).toBe(largeId);
    expect(mapped.variants?.find(v => v.id === smallId)?.isAvailable).toBe(false);
  });
  it('marks actual unavailable inventory for product cards', () => {
    expect(mapApiProduct({ ...apiProduct, is_in_stock: false }).isAvailable).toBe(false);
    expect(mapApiProduct({ ...apiProduct, stock_tracking_enabled: true, stock_quantity: 0 }).isAvailable).toBe(false);
    expect(mapApiProduct({ ...apiProduct, approval_status: 'pending' }).isAvailable).toBe(false);
    expect(mapApiProduct({ ...apiProduct, stock_tracking_enabled: true, stock_quantity: 2 }).isAvailable).toBe(false);
    expect(mapApiProduct({ ...apiProduct, stock_tracking_enabled: true, stock_quantity: 2, product_variants: apiProduct.product_variants.map(v => ({ ...v, stock_quantity: 1 })) }).isAvailable).toBe(true);
  });

});
