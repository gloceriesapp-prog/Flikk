import { describe, expect, it } from 'vitest';
import { CartValidationError, validateCart } from './orderValidation.js';

const storeA = 'store-a';
const storeB = 'store-b';

describe('cart validation', () => {
  it('passes a valid single-store, in-stock cart', () => {
    expect(() =>
      validateCart(
        [{ product_id: 'p1', quantity: 1 }],
        [{ id: 'p1', store_id: storeA, price: 10, is_in_stock: true }],
        storeA,
      ),
    ).not.toThrow();
  });

  it('rejects a cart referencing a product that no longer exists', () => {
    expect(() =>
      validateCart([{ product_id: 'p1', quantity: 1 }, { product_id: 'p2', quantity: 1 }], [
        { id: 'p1', store_id: storeA, price: 10, is_in_stock: true },
      ], storeA),
    ).toThrow(CartValidationError);
  });

  it('rejects a cart spanning two stores, even if storeId matches one of them', () => {
    try {
      validateCart(
        [
          { product_id: 'p1', quantity: 1 },
          { product_id: 'p2', quantity: 1 },
        ],
        [
          { id: 'p1', store_id: storeA, price: 10, is_in_stock: true },
          { id: 'p2', store_id: storeB, price: 10, is_in_stock: true },
        ],
        storeA,
      );
      throw new Error('expected validateCart to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(CartValidationError);
      expect((err as CartValidationError).code).toBe('MULTI_STORE_CART');
    }
  });

  it('rejects when the declared storeId does not match the products at all', () => {
    try {
      validateCart(
        [{ product_id: 'p1', quantity: 1 }],
        [{ id: 'p1', store_id: storeA, price: 10, is_in_stock: true }],
        storeB,
      );
      throw new Error('expected validateCart to throw');
    } catch (err) {
      expect((err as CartValidationError).code).toBe('MULTI_STORE_CART');
    }
  });

  it('rejects an out-of-stock item', () => {
    try {
      validateCart(
        [{ product_id: 'p1', quantity: 1 }],
        [{ id: 'p1', store_id: storeA, price: 10, is_in_stock: false }],
        storeA,
      );
      throw new Error('expected validateCart to throw');
    } catch (err) {
      expect((err as CartValidationError).code).toBe('STOCK_UNAVAILABLE');
    }
  });
});
