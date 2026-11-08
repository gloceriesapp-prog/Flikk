import { discountPercentOf } from '../src/components/ProductDetailSheet/ProductVariantOptions';

test('% OFF only when the MRP is higher than the price', () => {
  expect(discountPercentOf(296, 360)).toBe(18);
  expect(discountPercentOf(100, 100)).toBeNull();
  expect(discountPercentOf(100)).toBeNull();
});
