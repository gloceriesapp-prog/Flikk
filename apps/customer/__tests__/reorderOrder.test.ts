import { reorderLines } from '../src/store/reorderOrder';
import type { Product } from '../src/screens/home/products/types';

const product = (over: Partial<Product>): Product => ({ id: 'p1', name: 'Milk', weight: '500 ml', price: 30, storeId: 's1', ...over } as Product);

it('rebuilds the same pack and quantity at today\'s price', () => {
  const catalogue = [product({ variants: [{ id: 'v1', label: '500 ml', price: 30 }, { id: 'v2', label: '1 L', price: 58 }] })];
  const { lines, skipped } = reorderLines([{ product_id: 'p1', variant_id: 'v2', quantity: 2 }], catalogue);
  expect(skipped).toBe(0);
  expect(lines).toHaveLength(1);
  expect(lines[0]!.quantity).toBe(2);
  expect(lines[0]!.product).toMatchObject({ id: 'p1::v2', variantId: 'v2', price: 58, weight: '1 L' });
});

it('keeps cut, serving and flavour, and caps to stock', () => {
  const catalogue = [product({ cutOptions: true, servingOptions: ['chilled', 'room_temperature'], availableQuantity: 1,
    options: [{ id: 'o1', name: 'Mango', isAvailable: true }] })];
  const { lines } = reorderLines([{ product_id: 'p1', quantity: 3, cut_size: 'small', serving: 'chilled', option_id: 'o1' }], catalogue);
  expect(lines[0]!.quantity).toBe(1);
  expect(lines[0]!.product).toMatchObject({ cutSize: 'small', serving: 'chilled', optionId: 'o1', optionName: 'Mango' });
});

it('skips products that are gone, out of stock, pre-order, or a removed pack', () => {
  const catalogue = [product({ id: 'out', isAvailable: false }), product({ id: 'pre', preorder: { minQty: 5, leadDays: 1 } }),
    product({ id: 'packs', variants: [{ id: 'v1', label: '500 ml', price: 30 }] })];
  const { lines, skipped } = reorderLines([
    { product_id: 'missing', quantity: 1 }, { product_id: 'out', quantity: 1 }, { product_id: 'pre', quantity: 5 },
    { product_id: 'packs', variant_id: 'gone', quantity: 1 },
  ], catalogue);
  expect(lines).toHaveLength(0);
  expect(skipped).toBe(4);
});
