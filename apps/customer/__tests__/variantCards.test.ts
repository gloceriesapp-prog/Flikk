import { discountPercentOf, lowStockLabel } from '../src/components/ProductDetailSheet/ProductVariantOptions';

test('"N left" shows only for a few tracked packs on an in-stock size', () => {
  expect(lowStockLabel({ stockLeft: 3 })).toBe('3 left');
  expect(lowStockLabel({ stockLeft: 5 })).toBe('5 left');
  expect(lowStockLabel({ stockLeft: 6 })).toBeNull();
  expect(lowStockLabel({ stockLeft: 0 })).toBeNull();
  expect(lowStockLabel({})).toBeNull();
  expect(lowStockLabel({ stockLeft: 2, isAvailable: false })).toBeNull();
});

test('% OFF only when the MRP is higher than the price', () => {
  expect(discountPercentOf(296, 360)).toBe(18);
  expect(discountPercentOf(100, 100)).toBeNull();
  expect(discountPercentOf(100)).toBeNull();
});
