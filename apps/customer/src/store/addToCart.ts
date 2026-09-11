// Single call every ADD button in this app uses instead of calling
// useCartStore's addItem directly — kept as its own file (not inlined at
// each call site) so a future cross-cutting concern (analytics, a toast)
// has one place to land. No cross-store conflict dialog anymore: the cart
// now genuinely supports items from more than one store (useCartStore's
// own header note) — adding from a different store than what's already in
// the cart just works.

import { useCartStore, type CartProduct } from './useCartStore';

export function addToCart(product: CartProduct): void {
  useCartStore.getState().addItem(product);
}
