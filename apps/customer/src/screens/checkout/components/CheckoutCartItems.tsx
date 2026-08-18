// Shows at most 2 cart items (reusing CartItemRow from screens/cart/ — same
// row, same steppers, not a copy) with a "View all N items" link when
// there's more, rather than dumping the whole cart into this screen. The
// link goes back to CartScreen, which already lists everything.

import { Pressable, Text, View } from 'react-native';
import { CartItemRow } from '../../cart/components/CartItemRow';
import type { CartItem } from '../../../store/useCartStore';

const PREVIEW_COUNT = 2;

interface Props {
  items: CartItem[];
  onViewAll: () => void;
}

export function CheckoutCartItems({ items, onViewAll }: Props) {
  const previewItems = items.slice(0, PREVIEW_COUNT);
  const hasMore = items.length > PREVIEW_COUNT;

  return (
    <View>
      <Text className="mb-1 text-lg font-semibold text-ink">Cart items</Text>

      {previewItems.map((item) => (
        <CartItemRow key={item.id} item={item} />
      ))}

      {hasMore && (
        <Pressable onPress={onViewAll} className="items-center py-2">
          <Text className="text-sm font-bold text-lime-deep">View all {items.length} items</Text>
        </Pressable>
      )}
    </View>
  );
}
