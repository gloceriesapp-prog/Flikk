import type { AppStackParamList } from '../types';
// These screens already render a cart bar inside their own bottom navigation.
const SCREEN_NAVIGATION = new Set<keyof AppStackParamList>(['Categories', 'Purchase', 'Store']);
// Checkout owns its footer and recovery controls. A second cart entry could
// interrupt an in-flight payment, so it must not cover those controls.
const CHECKOUT_SCREENS = new Set<keyof AppStackParamList>(['Cart', 'PaymentMethod', 'PaymentProcessing', 'PaymentStatus', 'OrderPlaced', 'CheckoutAttemptRecovery', 'PaymentRecovery']);
export function showStandaloneCart(route: keyof AppStackParamList, shellNavigationVisible: boolean, quantity: number) {
  return quantity > 0 && !shellNavigationVisible && !SCREEN_NAVIGATION.has(route) && !CHECKOUT_SCREENS.has(route);
}
