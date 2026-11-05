import { describe, expect, it } from 'vitest';
import { checkoutLineKey, parseCheckoutItems, priceCheckoutItems, type CheckoutProduct } from './checkoutItems.js';

const productId = '00000000-0000-4000-8000-000000000031';
const packId = '00000000-0000-4000-8000-000000000032';
const cola: CheckoutProduct = { id: productId, store_id: 'shop', is_in_stock: true, price: 40, unit: '750 ml',
  product_variants: [{ id: packId, unit_type: 'ml', quantity: 750, price: 40, original_price: 40, is_default: true }],
  serving_options: ['chilled', 'room_temperature'] };
const line = (serving?: string, quantity = 1) => ({ product_id: productId, variant_id: packId, quantity, ...(serving ? { serving } : {}) });
const price = (items: unknown[], product: CheckoutProduct = cola) => priceCheckoutItems(parseCheckoutItems(items), [product]);

describe('serving temperature at checkout', () => {
  it('keeps the picked serving at the same price', () => {
    expect(price([line('chilled', 2)])[0]).toMatchObject({ serving: 'chilled', unit_price_at_order: 40, quantity: 2 });
  });
  it('needs a pick when both are offered', () => {
    expect(() => price([line()])).toThrow('Choose chilled or room temperature');
  });
  it('applies the only offered serving', () => {
    expect(price([line()], { ...cola, serving_options: ['chilled'] })[0]!.serving).toBe('chilled');
    expect(() => price([line('room_temperature')], { ...cola, serving_options: ['chilled'] })).toThrow('no longer offered');
  });
  it('rejects a serving on a product without options, and unknown values', () => {
    expect(() => price([line('chilled')], { ...cola, serving_options: [] })).toThrow('no chilled option');
    expect(() => parseCheckoutItems([line('frozen')])).toThrow();
  });
  it('keeps chilled and room temperature as two lines', () => {
    const lines = price([line('chilled'), line('room_temperature'), line('chilled')]);
    expect(lines.map((l) => [l.serving, l.quantity])).toEqual([['chilled', 2], ['room_temperature', 1]]);
    expect(checkoutLineKey(productId, packId, null, null, 'chilled')).not.toBe(checkoutLineKey(productId, packId, null, null, 'room_temperature'));
  });
  it('leaves other products unchanged', () => {
    expect(price([line()], { ...cola, serving_options: undefined })[0]!.serving).toBeNull();
  });
});
