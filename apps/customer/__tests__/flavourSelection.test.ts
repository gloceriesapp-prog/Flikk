import { flavourChoices, flavourPhotos, MAIN_PRODUCT_CHOICE } from '../src/components/ProductDetailSheet/flavourSelection';
import { cartLineId, checkoutItems } from '../src/store/cartIdentity';
import type { Product } from '../src/screens/home/products/types';
const product = { id: '00000000-0000-4000-8000-000000000001', name: 'Badam Milk', imageUrl: 'main', imageUrls: ['main', 'main-back'],
  options: [{ id: '00000000-0000-4000-8000-000000000002', name: 'Mango Milk', imageUrl: 'mango', imageUrls: ['mango', 'mango-back'], isAvailable: true },
    { id: '00000000-0000-4000-8000-000000000003', name: 'Rose Milk', imageUrl: 'rose', isAvailable: false }] } as Product;
it('lists the original product first and retains every added flavour and its availability', () => {
  expect(flavourChoices(product).map((option) => [option.id, option.name, option.isAvailable])).toEqual([
    [MAIN_PRODUCT_CHOICE, 'Badam Milk', true], [product.options![0]!.id, 'Mango Milk', true], [product.options![1]!.id, 'Rose Milk', false],
  ]);
  expect(flavourChoices({ ...product, options: [] })).toEqual([]);
});
it('switches the hero to the chosen gallery and restores the original gallery on return', () => {
  expect(flavourPhotos(product, MAIN_PRODUCT_CHOICE)).toEqual(['main', 'main-back']);
  expect(flavourPhotos(product, product.options![0]!.id)).toEqual(['mango', 'mango-back']);
  expect(flavourPhotos(product, product.options![1]!.id)).toEqual(['rose']);
  expect(flavourPhotos(product, MAIN_PRODUCT_CHOICE)).toEqual(['main', 'main-back']);
});
it('never sends the UI-only main choice as a flavour ID or merges it with an added flavour', () => {
  const main = cartLineId(product.id), mango = cartLineId(product.id, undefined, undefined, product.options![0]!.id);
  expect(main).not.toBe(mango);
  expect(checkoutItems([{ id: main, productId: product.id, quantity: 1 }])[0]).not.toHaveProperty('option_id');
});
