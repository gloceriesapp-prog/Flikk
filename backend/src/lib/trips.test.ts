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
  it('charges the delivery fee once, not once per leg', () => {
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

    const { itemTotal, total } = calcTripTotal(legs, 25);
    expect(itemTotal).toBe(300);
    expect(total).toBe(325); // NOT 300 + 25 + 25
  });
});
