import { describe, expect, it } from 'vitest';
import { checkoutLineKey, parseCheckoutItems, priceCheckoutItems, type CheckoutProduct } from './checkoutItems.js';

const productId = '00000000-0000-4000-8000-000000000021';
const packId = '00000000-0000-4000-8000-000000000022';
const masala = '00000000-0000-4000-8000-000000000023';
const tomato = '00000000-0000-4000-8000-000000000024';
const bingo: CheckoutProduct = { id: productId, store_id: 'shop', is_in_stock: true, price: 20, unit: '72 g',
  product_variants: [{ id: packId, unit_type: 'g', quantity: 72, price: 20, original_price: 20, is_default: true }],
  product_options: [{ id: masala, is_available: true }, { id: tomato, is_available: false }] };
const line = (option_id?: string, quantity = 1) => ({ product_id: productId, variant_id: packId, quantity, ...(option_id ? { option_id } : {}) });

describe('product flavours at checkout', () => {
  it('prices a flavour at the pack price and keeps it on the line', () => {
    expect(priceCheckoutItems(parseCheckoutItems([line(masala, 2)]), [bingo])[0]).toMatchObject({ option_id: masala, unit_price_at_order: 20, quantity: 2 });
  });
  it('needs a flavour when the product has flavours', () => {
    expect(() => priceCheckoutItems(parseCheckoutItems([line()]), [bingo])).toThrow('Choose a flavour');
  });
  it('rejects an out-of-stock or foreign flavour', () => {
    expect(() => priceCheckoutItems(parseCheckoutItems([line(tomato)]), [bingo])).toThrow('out of stock');
    expect(() => priceCheckoutItems(parseCheckoutItems([line('00000000-0000-4000-8000-000000000099')]), [bingo])).toThrow('no longer offered');
  });
  it('rejects a malformed flavour id', () => {
    expect(() => parseCheckoutItems([{ ...line(), option_id: 'masala' }])).toThrow();
  });
  it('keeps two flavours as two lines, and merges repeats of one', () => {
    const tomatoOn = { ...bingo, product_options: [{ id: masala, is_available: true }, { id: tomato, is_available: true }] };
    const lines = priceCheckoutItems(parseCheckoutItems([line(masala), line(tomato), line(masala)]), [tomatoOn]);
    expect(lines.map((l) => [l.option_id, l.quantity])).toEqual([[masala, 2], [tomato, 1]]);
    expect(checkoutLineKey(productId, packId, null, masala)).not.toBe(checkoutLineKey(productId, packId, null, tomato));
  });
  it('leaves products without flavours unchanged', () => {
    const plain = { ...bingo, product_options: [] };
    expect(priceCheckoutItems(parseCheckoutItems([line()]), [plain])[0]!.option_id).toBeNull();
  });
});
