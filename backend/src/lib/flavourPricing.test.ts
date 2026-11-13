import { describe, expect, it } from 'vitest';
import { applyCustomerPrices } from './customerPrice.js';
import { priceCheckoutItems, type CheckoutProduct } from './checkoutItems.js';
import { mapApiProduct, type ApiProduct } from '../../../apps/customer/src/api/products';
import { flavourPrice } from '../../../apps/customer/src/components/FlavourPicker/flavourPricing';
import { toProductOptions } from '../../../apps/admin/src/lib/productValidation';
const id = '00000000-0000-4000-8000-000000000001';
const option = '00000000-0000-4000-8000-000000000002';
const pack = '00000000-0000-4000-8000-000000000003';
const product: CheckoutProduct = { id, store_id: 'store', price: 20, is_in_stock: true,
  product_variants: [{ id: pack, unit_type: 'ml', quantity: 170, price: 20, original_price: 25, is_default: true, platform_markup: 3 }],
  product_options: [{ id: option, is_available: true, price_overrides: { 'ml:170': { price: 30, original_price: 32 } } }] };
const line = { product_id: id, variant_id: pack, option_id: option, quantity: 1 };
describe('flavour pack price contract', () => {
  it('charges the flavour price with the existing markup capped at MRP', () => {
    expect(priceCheckoutItems([line], [product])[0]).toMatchObject({ unit_price_at_order: 32, store_unit_price: 30, variant_mrp_at_order: 32 });
    expect(priceCheckoutItems([{ ...line, option_id: null }], [product])[0].unit_price_at_order).toBe(23);
    expect(() => priceCheckoutItems([{ ...line, expected_unit_price: 23 }], [product])).toThrow('price has changed');
  });
  it('inherits unmodified packs instead of applying another size price', () => {
    const second = { ...product.product_variants[0], id: 'other', quantity: 500, price: 60, original_price: 70 };
    expect(priceCheckoutItems([{ ...line, variant_id: 'other' }], [{ ...product, product_variants: [...product.product_variants, second] }])[0].unit_price_at_order).toBe(63);
  });
  it('supports no-pack products and refuses corrupt prices', () => {
    const base = { ...product, product_variants: [], product_options: [{ id: option, is_available: true, price_overrides: { base: { price: 18 } } }] };
    expect(priceCheckoutItems([{ ...line, variant_id: null }], [base])[0].unit_price_at_order).toBe(18);
    expect(() => priceCheckoutItems([line], [{ ...product, product_options: [{ id: option, is_available: true, price_overrides: { 'ml:170': { price: -1 } } }] }])).toThrow('cannot be ordered');
  });
  it('hides private store overrides and hydrates the exact checkout price', () => {
    const publicRow = applyCustomerPrices({ ...product, name: 'Milk', category: 'Dairy', unit: '170 ml', is_veg: true,
      product_options: [{ ...product.product_options![0], name: 'Mango', sort_order: 0, image_url: null }] });
    expect(publicRow.product_options![0]).not.toHaveProperty('price_overrides');
    expect(publicRow.product_variants[0]).not.toHaveProperty('platform_markup');
    const client = mapApiProduct(publicRow as unknown as ApiProduct);
    expect(flavourPrice(client, client.options![0])).toMatchObject({ price: 32, originalPrice: 32 });
  });
  it('validates admin prices while preserving omitted old-client settings', () => {
    expect(toProductOptions({ options: [{ name: 'Mango' }] })![0]).not.toHaveProperty('price_overrides');
    expect(toProductOptions({ options: [{ name: 'Mango', priceOverrides: { 'ml:170': { price: 30, originalPrice: 32 } } }] })![0].price_overrides).toEqual({ 'ml:170': { price: 30, original_price: 32 } });
    for (const prices of [{ 'ml:170': { price: 0 } }, { 'ml:170': { price: 1.001 } }, { base: { price: 50, originalPrice: 40 } }, { 'ml:0': { price: 2 } }]) {
      expect(() => toProductOptions({ options: [{ name: 'Mango', priceOverrides: prices }] })).toThrow();
    }
  });
});

it('matches price changes to the exact flavour instead of another pack line', async () => {
  const { quotedCartItems, matchesQuotedLine } = await import('../../../apps/customer/src/screens/cart/quote/quoteItems');
  const main = { id, productId: id, variantId: pack, name: 'Milk', storeId: 'store', quantity: 1, weight: '170 ml', price: 23 };
  const mango = { ...main, id: `${id}@${option}`, optionId: option, price: 32 };
  const quote = { items: [{ product_id: id, variant_id: pack, option_id: option, quantity: 1, store_id: 'store', unit_at_order: '170 ml', unit_price_at_order: 32 },
    { product_id: id, variant_id: pack, option_id: null, quantity: 1, store_id: 'store', unit_at_order: '170 ml', unit_price_at_order: 23 }] } as unknown as import('../../../apps/customer/src/api/checkout').CheckoutQuote;
  expect(matchesQuotedLine(main, quote.items[0])).toBe(false);
  expect(quotedCartItems([main, mango], quote).map(item => [item.optionId, item.price])).toEqual([[option,32],[undefined,23]]);
});
