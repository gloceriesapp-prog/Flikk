import { describe, expect, it } from 'vitest';
import { groupCartByStore, calcTripTotal } from './trips.js';

const storeA = 'store-a';
const storeB = 'store-b';

describe('groupCartByStore', () => {
  it('splits a two-store cart into one leg per store, each with its own locked-in prices', () => {
    const legs = groupCartByStore(
      [
        { product_id: 'p1', quantity: 2 },
        { product_id: 'p2', quantity: 1 },
      ],
      [
        { id: 'p1', store_id: storeA, price: 10, is_in_stock: true },
        { id: 'p2', store_id: storeB, price: 50, is_in_stock: true },
      ],
      0.15,
    );

    expect(legs).toHaveLength(2);
    const legA = legs.find((l) => l.storeId === storeA)!;
    const legB = legs.find((l) => l.storeId === storeB)!;
    expect(legA.itemTotal).toBe(20);
    expect(legA.commissionAmount).toBe(3);
    expect(legB.itemTotal).toBe(50);
    expect(legB.commissionAmount).toBe(7.5);
  });

  it('groups multiple items from the same store into one leg', () => {
    const legs = groupCartByStore(
      [
        { product_id: 'p1', quantity: 1 },
        { product_id: 'p2', quantity: 1 },
      ],
      [
        { id: 'p1', store_id: storeA, price: 10, is_in_stock: true },
        { id: 'p2', store_id: storeA, price: 15, is_in_stock: true },
      ],
      0.1,
    );

    expect(legs).toHaveLength(1);
    expect(legs[0]!.items).toHaveLength(2);
    expect(legs[0]!.itemTotal).toBe(25);
  });
});

describe('calcTripTotal', () => {
  it('charges one base delivery fee for a two-store trip (one extra stop)', () => {
    const legs = groupCartByStore(
      [
        { product_id: 'p1', quantity: 1 },
        { product_id: 'p2', quantity: 1 },
      ],
      [
        { id: 'p1', store_id: storeA, price: 100, is_in_stock: true },
        { id: 'p2', store_id: storeB, price: 200, is_in_stock: true },
      ],
      0.15,
    );

    const { itemTotal, deliveryFee, total } = calcTripTotal(legs, 25, 15);
    expect(itemTotal).toBe(300);
    expect(deliveryFee).toBe(40); // 25 base + 15 for the one extra stop
    expect(total).toBe(340); // NOT 300 + 25 + 25, and NOT 300 + 25
  });

  it('scales the surcharge with every extra store, not just the second', () => {
    const legs = groupCartByStore(
      [
        { product_id: 'p1', quantity: 1 },
        { product_id: 'p2', quantity: 1 },
        { product_id: 'p3', quantity: 1 },
      ],
      [
        { id: 'p1', store_id: 'store-a', price: 10, is_in_stock: true },
        { id: 'p2', store_id: 'store-b', price: 10, is_in_stock: true },
        { id: 'p3', store_id: 'store-c', price: 10, is_in_stock: true },
      ],
      0.15,
    );

    const { deliveryFee } = calcTripTotal(legs, 25, 15);
    expect(deliveryFee).toBe(55); // 25 base + 15 × 2 extra stops
  });

  it('charges only the base fee for a single-leg "trip" (defensive — never actually routed here)', () => {
    const legs = groupCartByStore(
      [{ product_id: 'p1', quantity: 1 }],
      [{ id: 'p1', store_id: storeA, price: 100, is_in_stock: true }],
      0.15,
    );

    const { deliveryFee } = calcTripTotal(legs, 25, 15);
    expect(deliveryFee).toBe(25);
  });
});
