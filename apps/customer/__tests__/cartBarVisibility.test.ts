import { showStandaloneCart } from '../src/navigation/home/cartBarVisibility';
test('cart remains available across browsing destinations with items', () => {
  for (const route of ['CategoryDetail', 'HomeContentCollection', 'BrandProducts', 'StoreDetail', 'Search', 'Wishlist'] as const) expect(showStandaloneCart(route, false, 1)).toBe(true);
});
test('never duplicates a navigation cart or covers checkout', () => {
  expect(showStandaloneCart('Home', true, 1)).toBe(false);
  for (const route of ['Cart', 'PaymentMethod', 'PaymentProcessing', 'PaymentRecovery', 'Categories', 'Purchase', 'Store'] as const) expect(showStandaloneCart(route, false, 1)).toBe(false);
  expect(showStandaloneCart('CategoryDetail', false, 0)).toBe(false);
});
