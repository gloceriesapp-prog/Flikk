import { canShowShoppingCart, showStandaloneCart } from '../src/navigation/home/cartBarVisibility';
test('cart remains available across browsing destinations with items', () => {
  for (const route of ['CategoryDetail', 'HomeContentCollection', 'BrandProducts', 'StoreDetail', 'Search', 'Wishlist'] as const) expect(showStandaloneCart(route, false, 1)).toBe(true);
});
test('never duplicates a navigation cart or covers checkout', () => {
  expect(showStandaloneCart('Home', true, 1)).toBe(false);
  for (const route of ['Cart', 'PaymentMethod', 'PaymentProcessing', 'PaymentRecovery', 'Categories', 'Purchase', 'Store'] as const) expect(showStandaloneCart(route, false, 1)).toBe(false);
  expect(showStandaloneCart('CategoryDetail', false, 0)).toBe(false);
});

test('address, account, order and payment screens never show a floating cart', () => {
  for (const route of ['LocationPermission', 'SelectLocation', 'LocationSearch', 'AddressList', 'AddressForm',
    'Profile', 'Purchase', 'TrackOrder', 'OrderSummary', 'OrderRating', 'Support', 'Notifications',
    'AboutGloceries', 'Faq', 'MyRefunds', 'RefundDetail', 'Referral', 'AccountPrivacy',
    'Cart', 'PaymentMethod', 'PaymentProcessing', 'PaymentStatus', 'OrderPlaced',
    'CheckoutAttemptRecovery', 'PaymentRecovery'] as const) {
    expect(showStandaloneCart(route, false, 4)).toBe(false);
    expect(canShowShoppingCart(route)).toBe(false);
  }
  expect(canShowShoppingCart('FutureUtilityScreen')).toBe(false);
});
test('shopping navigation owns its cart and leaves no standalone bar on unavailable Home', () => {
  for (const route of ['Home', 'HomeCategory', 'Categories', 'Store'] as const) {
    expect(canShowShoppingCart(route)).toBe(true);
    expect(showStandaloneCart(route, false, 4)).toBe(false);
  }
});
