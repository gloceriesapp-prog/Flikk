import { describe, expect, it } from 'vitest';
import { cardImages, pillText } from './nammaBrands.js';

const p = (id: string, price: number, originalPrice: number | null, inStock = true) => ({ id, price, originalPrice, inStock });

describe('pillText', () => {
  it('best discount: the largest (MRP - price) / MRP, rounded down', () => {
    expect(pillText('discount', [p('a', 80, 100), p('b', 45, 50), p('c', 70, 99)])).toBe('Upto 29% Off');
  });
  it('lowest price: the cheapest in-stock price', () => {
    expect(pillText('lowest_price', [p('a', 80, 100), p('b', 45, 50), p('c', 30, null, false)])).toBe('Starting from ₹45');
  });
  it('falls back to lowest price when the best discount is under 5%', () => {
    expect(pillText('discount', [p('a', 97, 100), p('b', 60, 62)])).toBe('Starting from ₹60');
    expect(pillText('discount', [p('a', 95, 100)])).toBe('Upto 5% Off');
  });
  it('ignores out-of-stock products, and gives no pill when none are in stock', () => {
    expect(pillText('discount', [p('a', 10, 100, false), p('b', 90, 100)])).toBe('Upto 10% Off');
    expect(pillText('lowest_price', [p('a', 10, 20, false)])).toBeNull();
  });
});

describe('cardImages', () => {
  const products = [{ id: 'a', imageUrl: 'A' }, { id: 'b', imageUrl: 'B' }, { id: 'c', imageUrl: 'C' }, { id: 'd', imageUrl: null }];
  it('uses the admin picks that are available, keeping their count', () => {
    expect(cardImages(['c'], products, ['a', 'b'])).toEqual(['C']);
    expect(cardImages(['c', 'gone'], products, ['a'])).toEqual(['C', 'A']);
  });
  it('defaults to the top sellers, then any product with a photo', () => {
    expect(cardImages([], products, ['b', 'zzz'])).toEqual(['B', 'A']);
  });
});
