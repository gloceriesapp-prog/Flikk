import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectCartTotalQuantity, useCartStore } from '../../store/useCartStore';
import { STANDALONE_CART_CLEARANCE } from './cartBarVisibility';

export function useCollectionBottomPadding(defaultPadding = 48) {
  const { bottom } = useSafeAreaInsets();
  const hasCart = useCartStore(state => selectCartTotalQuantity(state) > 0);
  return hasCart ? Math.max(defaultPadding, bottom + STANDALONE_CART_CLEARANCE) : defaultPadding;
}
