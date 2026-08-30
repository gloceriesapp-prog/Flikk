// Sticky bar — no price/weight shown, per an explicit ask (that lives in
// ProductDetailInfo's own price row already, showing it twice was
// redundant). Two states:
//
// - Not in cart: one full-width "Add to cart" button, nothing else.
// - In cart: this product's own +/- stepper centered in the row (reads/
//   writes useCartStore, same as ProductCard's), plus a basket icon pinned
//   right showing selectCartTotalQuantity — the *whole cart's* item count,
//   not just this product's — so it visibly ticks up as more gets added,
//   whether that's this item or something else.
//
// The stepper is the row's only in-flow child (justify-center centers it
// against the row's actual full width) — the basket is pulled OUT of flow
// (position: absolute, pinned right) rather than the row centering the
// stepper between two flex-1 side columns. That flex-1 approach only
// centers correctly if both side columns end up exactly equal width, and
// in practice the basket icon+count's own content pulled its column wider
// than the empty spacer column, dragging the stepper off-true-center.
// Removing the basket from flex distribution entirely (absolute) means
// nothing about its width can affect the stepper's position, guaranteeing
// a true center regardless. The basket itself is one Pressable (not just an
// icon next to a bare Text) so the icon and count read as a single centered
// unit/button, not two loosely aligned siblings — top-0/bottom-0 center it
// vertically against the row's own height, which the stepper (the only
// in-flow child) still determines.
//
// No background/border of its own — ProductDetailSheet.tsx wraps this in a
// BlurView glass overlay and needs this content transparent so the blur
// actually shows through underneath it.

import { AddSquareIcon, MinusSignIcon, ShoppingBasket01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../AppIcon';
import { colors } from '../../theme/tokens';
import { selectCartTotalQuantity, useCartStore } from '../../store/useCartStore';
import { addToCart } from '../../store/addToCart';
import type { Product } from '../../screens/home/products/types';

interface Props {
  product: Product;
}

export function ProductDetailFooter({ product }: Props) {
  const { id, name, weight, price, originalPrice, storeId, storeName, imageUrl } = product;

  const quantity = useCartStore((state) => state.items.find((item) => item.id === id)?.quantity ?? 0);
  const cartTotalQuantity = useCartStore(selectCartTotalQuantity);
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);

  if (quantity === 0) {
    return (
      <View className="px-5 py-4">
        <Pressable
          onPress={() => addToCart({ id, name, weight, price, originalPrice, storeId: storeId ?? '', storeName, imageUrl })}
          className="items-center rounded-2xl bg-lime-deep py-3.5"
        >
          <Text className="text-base font-medium text-ink">Add to cart</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="relative flex-row items-center justify-center px-5 py-4">
      <View className="flex-row items-center gap-4 rounded-2xl bg-lime-deep px-4 py-3.5">
        <Pressable onPress={() => decrementItem(id)} hitSlop={8}>
          <AppIcon icon={MinusSignIcon} size={18} color={colors.ink} />
        </Pressable>
        <Text className="min-w-[18px] text-center text-base font-extrabold text-ink">{quantity}</Text>
        <Pressable onPress={() => incrementItem(id)} hitSlop={8}>
          <AppIcon icon={AddSquareIcon} size={18} color={colors.ink} />
        </Pressable>
      </View>

      <Pressable className="absolute bottom-0 right-5 top-0 flex-row items-center justify-center gap-1.5">
        <AppIcon icon={ShoppingBasket01Icon} size={22} color={colors.ink} />
        <Text className="text-base font-bold text-ink">{cartTotalQuantity}</Text>
      </Pressable>
    </View>
  );
}
