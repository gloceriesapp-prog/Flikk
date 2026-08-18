// Only the image is an elevated "card" (border + shadow) — price/name sit
// flat on the page background, per the reference. Weight tag + ADD button
// overlap the image's bottom edge via negative margin. Name is never
// truncated — it wraps to 2 lines if it needs to. No rating line — removed
// from every card app-wide per an explicit ask.
//
// ADD becomes a quantity stepper once the product is in the cart — reads
// live from useCartStore, not local state, so it stays in sync if the same
// product is also in the cart bar/CartScreen.

import { AddSquareIcon, CheckmarkCircle02Icon, MinusSignIcon } from '@hugeicons/core-free-icons';
import { Image, Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { colors } from '../../../theme/tokens';
import { useCartStore } from '../../../store/useCartStore';
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
  // imageSeed is kept on Product (data.ts files) for when real per-item images
  // return — not read here while every card shares one placeholder image.
  const { id, name, localName, weight, price, originalPrice } = product;
  const discountPercent =
    showDiscountBadge && originalPrice ? Math.round((1 - price / originalPrice) * 100) : null;

  const quantity = useCartStore((state) => state.items.find((item) => item.id === id)?.quantity ?? 0);
  const addItem = useCartStore((state) => state.addItem);
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);

  return (
    <View className={`${widthClassName} gap-2`}>
      <View className="aspect-square overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md shadow-black/20">
        <Image source={{ uri: PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />

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

        {quantity === 0 ? (
          <Pressable
            onPress={() => addItem({ id, name, weight, price })}
            className="rounded-full border border-lime-deep bg-white px-3 py-1"
          >
            <Text className="text-xs font-bold text-lime-deep">ADD</Text>
          </Pressable>
        ) : (
          <View className="flex-row items-center gap-2 rounded-full bg-lime-deep px-1.5 py-1">
            <Pressable onPress={() => decrementItem(id)} hitSlop={6}>
              <AppIcon icon={MinusSignIcon} size={13} color={colors.ink} />
            </Pressable>
            <Text className="min-w-[14px] text-center text-xs font-extrabold text-ink">{quantity}</Text>
            <Pressable onPress={() => incrementItem(id)} hitSlop={6}>
              <AppIcon icon={AddSquareIcon} size={13} color={colors.ink} />
            </Pressable>
          </View>
        )}
      </View>

      <View className="gap-0.5 px-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-[15px] font-extrabold text-ink">₹{price}</Text>
          {originalPrice && <Text className="text-xs text-ink/40 line-through">₹{originalPrice}</Text>}
        </View>
        <Text className="text-[13px] font-semibold leading-4 text-ink" numberOfLines={2}>
          {name} ({localName})
        </Text>
      </View>
    </View>
  );
}
