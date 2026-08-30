// Single call every ADD button in this app uses instead of calling
// useCartStore's addItem directly — handles the one outcome addItem can't
// resolve on its own (a cross-store add, AddItemResult's own note): shows a
// real confirm dialog and only replaces the cart if the customer actually
// agrees, rather than either silently discarding what was there or
// silently refusing to add the new item.

import { Alert } from 'react-native';
import { useCartStore, type CartProduct } from './useCartStore';

export function addToCart(product: CartProduct): void {
  const result = useCartStore.getState().addItem(product);
  if (result === 'added') return;

  if (!product.storeId) return; // no real store — nothing a confirm dialog can fix, see addItem's own note.

  Alert.alert(
    'Start a new cart?',
    'Your cart has items from a different store. Adding this will remove them and start a new cart.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start new cart', style: 'destructive', onPress: () => useCartStore.getState().replaceCartWithItem(product) },
    ]
  );
}
