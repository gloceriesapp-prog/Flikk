// Sticky bar — repeats weight/discount so it's still visible once the
// description has scrolled out of view, plus the same ADD/quantity-stepper
// logic ProductCard already uses (reads live from useCartStore, so the two
// stay in sync if the same product is also in the cart bar/CartScreen).
// Uses this app's own lime-deep CTA color, not the reference's blue.
//
// No background/border of its own — ProductDetailSheet.tsx wraps this in a
// BlurView glass overlay and needs this content transparent so the blur
// actually shows through underneath it.

import { AddSquareIcon, MinusSignIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../AppIcon';
import { colors } from '../../theme/tokens';
import { useCartStore } from '../../store/useCartStore';
import type { Product } from '../../screens/home/products/types';

interface Props {
  product: Product;
}

export function ProductDetailFooter({ product }: Props) {
  const { id, name, weight, price, originalPrice } = product;
  const discountPercent = originalPrice ? Math.round((1 - price / originalPrice) * 100) : null;

  const quantity = useCartStore((state) => state.items.find((item) => item.id === id)?.quantity ?? 0);
  const addItem = useCartStore((state) => state.addItem);
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);

  return (
    <View className="flex-row items-center justify-between border-t border-white/60 px-5 py-4">
      <View className="gap-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-sm text-ink/60">{weight}</Text>
          {discountPercent !== null && discountPercent > 0 && (
            <Text className="text-sm font-bold text-success">{discountPercent}% OFF</Text>
          )}
        </View>
        <View className="flex-row items-baseline gap-2">
          <Text className="text-lg font-extrabold text-ink">₹{price}</Text>
          {originalPrice && <Text className="text-xs text-ink/40 line-through">₹{originalPrice}</Text>}
        </View>
      </View>

      {quantity === 0 ? (
        <Pressable
          onPress={() => addItem({ id, name, weight, price, originalPrice })}
          className="rounded-2xl bg-lime-deep px-8 py-3.5"
        >
          <Text className="text-base font-medium text-ink">Add to cart</Text>
        </Pressable>
      ) : (
        <View className="flex-row items-center gap-4 rounded-2xl bg-lime-deep px-4 py-3.5">
          <Pressable onPress={() => decrementItem(id)} hitSlop={8}>
            <AppIcon icon={MinusSignIcon} size={18} color={colors.ink} />
          </Pressable>
          <Text className="min-w-[18px] text-center text-base font-extrabold text-ink">{quantity}</Text>
          <Pressable onPress={() => incrementItem(id)} hitSlop={8}>
            <AppIcon icon={AddSquareIcon} size={18} color={colors.ink} />
          </Pressable>
        </View>
      )}
    </View>
  );
}
