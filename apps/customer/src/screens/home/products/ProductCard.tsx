// Only the image is an elevated "card" (border + shadow) — price/name/rating
// sit flat on the page background, per the reference. Weight tag + ADD button
// overlap the image's bottom edge via negative margin. Name is never
// truncated — it wraps to 2 lines if it needs to.

import { CheckmarkCircle02Icon, StarIcon } from '@hugeicons/core-free-icons';
import { Image, Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { Product } from './types';

interface Props {
  product: Product;
  // Grid rows (ProductSection) need a %-based width to divide the row evenly;
  // horizontal scroll rows (e.g. groceries/FarmSection) need a fixed width
  // instead. Defaults to the 3-column grid width.
  widthClassName?: string;
  // Off by default — opt-in per screen (e.g. search/) rather than changing
  // every existing card's look silently. Only renders when the product
  // actually has an originalPrice to compute a percentage off from.
  showDiscountBadge?: boolean;
}

export function ProductCard({ product, widthClassName = 'w-[32%]', showDiscountBadge = false }: Props) {
  const { name, localName, weight, price, originalPrice, rating, ratingCount, imageSeed } = product;
  const discountPercent =
    showDiscountBadge && originalPrice ? Math.round((1 - price / originalPrice) * 100) : null;

  return (
    <View className={`${widthClassName} gap-2`}>
      <View className="aspect-square overflow-hidden rounded-2xl border border-mist bg-mist shadow-md shadow-black/20">
        <Image
          source={{ uri: `https://picsum.photos/seed/${imageSeed}/400/400` }}
          className="h-full w-full"
          resizeMode="cover"
        />

        {/* decorative image-carousel dots — single static placeholder image for now */}
        <View className="absolute bottom-2 left-0 right-0 flex-row justify-center gap-1">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className={`h-1 w-1 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/50'}`} />
          ))}
        </View>

        <View className="absolute right-1.5 top-1.5 rounded-full bg-white p-0.5">
          <AppIcon icon={CheckmarkCircle02Icon} size={14} color={colors.limeDeep} />
        </View>

        {discountPercent !== null && discountPercent > 0 && (
          <View className="absolute left-0 top-2 rounded-r-full bg-lime-deep py-1 pl-2 pr-2.5">
            <Text className="text-[10px] font-bold text-white">{discountPercent}% OFF</Text>
          </View>
        )}
      </View>

      <View className="-mt-4 z-10 flex-row items-center justify-between px-1">
        <View className="rounded-full border border-mist bg-white px-2 py-1">
          <Text className="text-[11px] font-semibold text-ink">{weight}</Text>
        </View>
        <Pressable className="rounded-full border border-lime-deep bg-white px-3 py-1">
          <Text className="text-xs font-bold text-lime-deep">ADD</Text>
        </Pressable>
      </View>

      <View className="gap-0.5 px-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-[15px] font-extrabold text-ink">₹{price}</Text>
          {originalPrice && <Text className="text-xs text-ink/40 line-through">₹{originalPrice}</Text>}
        </View>
        <Text className="text-[13px] font-semibold leading-4 text-ink" numberOfLines={2}>
          {name} ({localName})
        </Text>
        <View className="flex-row items-center gap-1">
          <AppIcon icon={StarIcon} size={11} color={colors.gold} />
          <Text className="text-[11px] text-ink/60">
            {rating.toFixed(1)} · {ratingCount}
          </Text>
        </View>
      </View>
    </View>
  );
}
