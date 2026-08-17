// Card layout matches the reference exactly: full-bleed image with the
// discount ribbon and ADD pill overlaid on top of it (not stacked below,
// unlike screens/home/products/ProductCard.tsx's overlap-via-negative-margin
// style, which is a different reference and broke down at this card's
// narrower 2-column width).

import { Image, Pressable, Text, View } from 'react-native';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import type { Product } from '../../home/products/types';

interface Props {
  product: Product;
  // Rotated pastel tint behind the product photo per grid position —
  // reference cards each sit on a different pastel background, not a
  // single flat one.
  bgClassName: string;
}

export function CategoryProductCard({ product, bgClassName }: Props) {
  const { name, weight, price, originalPrice } = product;
  const discountPercent = originalPrice ? Math.round((1 - price / originalPrice) * 100) : null;

  return (
    <View className="w-[47%]">
      <View className={`aspect-[4/5] w-full overflow-hidden rounded-2xl ${bgClassName}`}>
        <Image source={{ uri: PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />

        {discountPercent !== null && discountPercent > 0 && (
          <View className="absolute left-0 top-3 rounded-r-full bg-indigo-600 py-1 pl-2.5 pr-3">
            <Text className="text-[11px] font-bold text-white">{discountPercent}% OFF</Text>
          </View>
        )}

        <Pressable className="absolute bottom-3 right-3 rounded-full bg-white px-4 py-1.5 shadow-sm shadow-black/20">
          <Text className="text-xs font-extrabold text-ink">ADD</Text>
        </Pressable>
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
