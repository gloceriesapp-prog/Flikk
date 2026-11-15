import { stockLabel } from '../src/components/stockLabel';
import { priceComparison, discountPercentLabel } from '../src/components/priceComparison';
import { flavourStatus } from '../src/components/ProductDetailSheet/flavourStatus';

test('only shows genuine savings and higher MRP', () => {
  expect(priceComparison(235, 260)).toEqual({ mrp: 260, discount: 10 });
  for (const mrp of [undefined, 235, 200, NaN, Infinity]) expect(priceComparison(235, mrp).mrp).toBeUndefined();
});
test('shows verified stock on unselected flavours and selection only on active flavours', () => {
  for (const count of [1, 5]) expect(flavourStatus(true, true, count)).toBe(`Selected · ${count} left`);
  for (const count of [undefined, 0, -1, 6, 1.5, NaN]) expect(flavourStatus(true, true, count)).toBe('Selected');
  expect(flavourStatus(true, false, 2)).toBe('2 left');
  expect(flavourStatus(false, true, 2)).toBe('Out of stock');
});


test('shared card badge hides unknown, invalid and unavailable stock', () => {
  expect(stockLabel(5)).toBe('5 left');
  for (const count of [undefined, 0, -2, 6, 1.5, Infinity, NaN]) expect(stockLabel(count)).toBe('');
  expect(stockLabel(3, false)).toBe('');
});

test('shows even very small genuine discounts without claiming a full percent', () => {
  expect(discountPercentLabel(638, 640)).toBe('<1');
  expect(discountPercentLabel(99.2, 100)).toBe('<1');
  expect(discountPercentLabel(365, 370)).toBe('1');
  expect(discountPercentLabel(99, 100)).toBe('1');
  expect(discountPercentLabel(235, 260)).toBe('10');
  expect(discountPercentLabel(100, 100)).toBeUndefined();
  expect(discountPercentLabel(101, 100)).toBeUndefined();
  expect(discountPercentLabel(100)).toBeUndefined();
});
