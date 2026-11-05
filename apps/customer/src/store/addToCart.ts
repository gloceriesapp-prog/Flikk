// Single call every ADD button in this app uses instead of calling
// useCartStore's addItem directly — kept as its own file (not inlined at
// each call site) so a cross-cutting concern has one place to land. Items
// from several stores share a cart (useCartStore's own header note); the
// one thing that can't mix is a pre-order with quick-delivery items
// (store/preorder.ts), so that asks before replacing the cart.

import { Alert } from 'react-native';
import { cartConflict, type CartPreorder } from './preorder';
import { useCartStore, type CartProduct } from './useCartStore';

export function addToCart(product: CartProduct, preorder?: CartPreorder): void {
  const cart = useCartStore.getState();
  const conflict = cartConflict(cart.items, product);
  if (!conflict) { cart.addItem(product, preorder); return; }
  Alert.alert('Start a new cart?', `${conflict} Replace your cart with this item?`, [
    { text: 'Keep cart', style: 'cancel' },
    { text: 'Replace', style: 'destructive', onPress: () => { cart.clear(); useCartStore.getState().addItem(product, preorder); } },
  ]);
}
