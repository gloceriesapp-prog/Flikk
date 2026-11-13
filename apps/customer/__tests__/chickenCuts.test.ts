import { cartIdentity, cartLineId, checkoutItems } from '../src/store/cartIdentity';
import { quotedCartItems, quoteMatchesCart } from '../src/screens/cart/quote/quoteItems';
import type { CheckoutQuote } from '../src/api/checkout';
import type { CartItem } from '../src/store/useCartStore';

const p = 'product-1';
const v = 'variant-1';

test('each cut is its own cart line and is sent to checkout', () => {
  expect(cartLineId(p, v, 'small')).not.toBe(cartLineId(p, v, 'large'));
  expect(cartLineId(p, v)).toBe(`${p}::${v}`);
  expect(checkoutItems([{ id: cartLineId(p, v, 'small'), productId: p, variantId: v, cutSize: 'small', quantity: 2, price: 200 }]))
    .toEqual([{ product_id: p, variant_id: v, quantity: 2, expected_unit_price: 200, cut_size: 'small' }]);
  expect(checkoutItems([{ id: cartLineId(p, v), productId: p, variantId: v, quantity: 1 }])[0]).not.toHaveProperty('cut_size');
});

test('a persisted unknown cut is dropped', () => {
  expect(cartIdentity({ id: `${p}::${v}#huge`, cutSize: 'huge' as never })).toMatchObject({ productId: p, variantId: v, cutSize: undefined, id: `${p}::${v}` });
});

test('quote lines are matched back to the right cut', () => {
  const base = { productId: p, variantId: v, name: 'Chicken', weight: '1 kg', price: 200, storeId: 's1' };
  const items: CartItem[] = [
    { ...base, id: cartLineId(p, v, 'small'), cutSize: 'small', quantity: 1 },
    { ...base, id: cartLineId(p, v, 'large'), cutSize: 'large', quantity: 3 },
  ];
  const line = { product_id: p, variant_id: v, store_id: 's1', unit_price_at_order: 200, unit_at_order: '1 kg', variant_mrp_at_order: 200 };
  const quote = { items: [{ ...line, quantity: 3, cut_size: 'large', bulk: false }, { ...line, quantity: 1, cut_size: 'small', bulk: false }] } as CheckoutQuote;
  expect(quotedCartItems(items, quote).map((item) => [item.cutSize, item.quantity])).toEqual([['large', 3], ['small', 1]]);
});

test('stale quotes cannot crash a cart cleared after successful payment', () => {
  const item = { id: 'product::variant', productId: 'product', variantId: 'variant', quantity: 1 } as CartItem;
  const quote = { items: [{ product_id: 'product', variant_id: 'variant', quantity: 1 }] } as CheckoutQuote;
  expect(quoteMatchesCart([item], quote)).toBe(true);
  expect(quoteMatchesCart([], quote)).toBe(false);
  expect(quoteMatchesCart([{ ...item, quantity: 2 }], quote)).toBe(false);
  expect(quoteMatchesCart([{ ...item, optionId: '00000000-0000-4000-8000-000000000001' }], quote)).toBe(false);
});
