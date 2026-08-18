// Card layout matches the reference exactly: full-bleed image with the
// discount ribbon and ADD pill overlaid on top of it (not stacked below,
// unlike screens/home/products/ProductCard.tsx's overlap-via-negative-margin
// style, which is a different reference and broke down at this card's
// narrower 2-column width).
//
// ADD becomes a quantity stepper once in the cart — same useCartStore as
// ProductCard, so a product added here shows correctly in the cart bar/
// CartScreen and vice versa.

import { AddSquareIcon, MinusSignIcon } from '@hugeicons/core-free-icons';
import { Image, Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { colors } from '../../../theme/tokens';
import { useCartStore } from '../../../store/useCartStore';
import type { Product } from '../../home/products/types';

interface Props {
  product: Product;
  // Rotated pastel tint behind the product photo per grid position —
  // reference cards each sit on a different pastel background, not a
  // single flat one.
  bgClassName: string;
}

export function CategoryProductCard({ product, bgClassName }: Props) {
  const { id, name, weight, price, originalPrice } = product;
  const discountPercent = originalPrice ? Math.round((1 - price / originalPrice) * 100) : null;

  const quantity = useCartStore((state) => state.items.find((item) => item.id === id)?.quantity ?? 0);
  const addItem = useCartStore((state) => state.addItem);
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);

  return (
    <View className="w-[47%]">
      <View className={`aspect-[4/5] w-full overflow-hidden rounded-2xl ${bgClassName}`}>
        <Image source={{ uri: PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />

        {discountPercent !== null && discountPercent > 0 && (
          <View className="absolute left-0 top-3 rounded-r-full bg-indigo-600 py-1 pl-2.5 pr-3">
            <Text className="text-[11px] font-bold text-white">{discountPercent}% OFF</Text>
          </View>
        )}

        {quantity === 0 ? (
          <Pressable
            onPress={() => addItem({ id, name, weight, price })}
            className="absolute bottom-3 right-3 rounded-full bg-white px-4 py-1.5 shadow-sm shadow-black/20"
          >
            <Text className="text-xs font-extrabold text-ink">ADD</Text>
          </Pressable>
        ) : (
          <View className="absolute bottom-3 right-3 flex-row items-center gap-2 rounded-full bg-white px-2 py-1.5 shadow-sm shadow-black/20">
            <Pressable onPress={() => decrementItem(id)} hitSlop={6}>
              <AppIcon icon={MinusSignIcon} size={14} color={colors.ink} />
            </Pressable>
            <Text className="min-w-[14px] text-center text-xs font-extrabold text-ink">{quantity}</Text>
            <Pressable onPress={() => incrementItem(id)} hitSlop={6}>
              <AppIcon icon={AddSquareIcon} size={14} color={colors.ink} />
            </Pressable>
          </View>
        )}
      </View>

      <Text className="mt-3 text-sm font-bold leading-5 text-ink" numberOfLines={2}>
        {name}
      </Text>

      <View className="mt-1.5 flex-row items-center gap-2">
        <Text className="text-lg font-extrabold text-ink">₹{price}</Text>
        {originalPrice && (
          <Text className="text-xs font-semibold text-danger line-through">MRP ₹{originalPrice}</Text>
        )}
      </View>

      <View className="mt-2 self-start rounded-md bg-ink px-2 py-1">
        <Text className="text-[11px] font-bold text-white">{weight}</Text>
      </View>
    </View>
  );
}
