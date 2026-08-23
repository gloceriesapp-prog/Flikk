// Pure presentational card — everything ProductCard.tsx renders EXCEPT the
// tap-to-open-ProductDetailSheet behavior. Split out specifically so this
// file has no dependency on ProductDetailSheet: SimilarProductsRow.tsx
// (rendered inside ProductDetailSheet's own tree) needs to reuse this same
// card UI, and if it imported ProductCard.tsx directly that would close a
// require cycle (ProductCard -> ProductDetailSheet -> ... ->
// SimilarProductsRow -> ProductCard), which Metro warns about and can leave
// one side of the cycle uninitialized at import time. ProductCard.tsx is
// the only thing that should import ProductDetailSheet; this file must
// never do so.
//
// Only the image is an elevated "card" (border + shadow) — price/name sit
// flat on the page background, per the reference. Weight tag + ADD button
// overlap the image's bottom edge via negative margin. Name is never
// truncated — it wraps to 2 lines if it needs to. No rating line — removed
// from every card app-wide per an explicit ask.
//
// Four image-corner elements: freshness ribbon top-left (only when
// freshnessTag is set — same-day perishables like dairy, not shelf-stable
// goods), bookmark/wishlist top-right (local-only toggle, no store —
// nothing persists this yet), veg/non-veg indicator bottom-left (defaults
// to veg; only fish/meat data sets isVeg: false explicitly, see Product's
// own note in types.ts), decorative carousel dots stay bottom-center.
//
// ADD becomes a quantity stepper once the product is in the cart — reads
// live from useCartStore, not local state, so it stays in sync if the same
// product is also in the cart bar/CartScreen.

import { useState } from 'react';
import { AddSquareIcon, Bookmark01Icon, MinusSignIcon } from '@hugeicons/core-free-icons';
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
  // Undefined in contexts with nothing to open (SimilarProductsRow) — the
  // card still renders as a Pressable either way so its own ADD/bookmark
  // Pressables keep the same touch-absorption behavior, it just has nothing
  // to do on an outer tap when this is unset.
  onPress?: () => void;
}

export function ProductCardView({ product, widthClassName = 'w-[32%]', showDiscountBadge = false, onPress }: Props) {
  // imageSeed is kept on Product (data.ts files) for when real per-item images
  // return — not read here while every card shares one placeholder image.
  const { id, name, localName, weight, price, originalPrice, isVeg = true, freshnessTag } = product;
  const discountPercent =
    showDiscountBadge && originalPrice ? Math.round((1 - price / originalPrice) * 100) : null;

  const [isBookmarked, setIsBookmarked] = useState(false);

  const quantity = useCartStore((state) => state.items.find((item) => item.id === id)?.quantity ?? 0);
  const addItem = useCartStore((state) => state.addItem);
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);

  return (
    <Pressable onPress={onPress} className={`${widthClassName} gap-2`}>
      <View className="aspect-square overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md shadow-black/20">
        <Image source={{ uri: PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />

        {/* decorative image-carousel dots — single static placeholder image for now */}
        <View className="absolute bottom-2 left-0 right-0 flex-row justify-center gap-1">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className={`h-1 w-1 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/50'}`} />
          ))}
        </View>

        {/* top-left stack: discount badge above freshness ribbon — a
            product can plausibly carry both, so they stack instead of
            overlapping. */}
        <View className="absolute left-0 top-2 gap-1.5">
          {discountPercent !== null && discountPercent > 0 && (
            <View className="rounded-r-full bg-lime-deep py-1 pl-2 pr-2.5">
              <Text className="text-[10px] font-bold text-white">{discountPercent}% OFF</Text>
            </View>
          )}
          {freshnessTag && (
            <View className="rounded-r-full bg-gold py-1 pl-2 pr-2.5">
              <Text className="text-[10px] font-bold text-white">{freshnessTag}</Text>
            </View>
          )}
        </View>

        {/* bookmark/wishlist — local toggle only, nothing persists this yet */}
        <Pressable
          onPress={() => setIsBookmarked((prev) => !prev)}
          hitSlop={8}
          className={`absolute right-1.5 top-1.5 h-7 w-7 items-center justify-center rounded-full ${
            isBookmarked ? 'bg-lime-deep' : 'bg-white'
          }`}
        >
          <AppIcon icon={Bookmark01Icon} size={14} color={isBookmarked ? '#FFFFFF' : colors.ink} strokeWidth={isBookmarked ? 0 : 1.8} />
        </Pressable>

        {/* veg/non-veg indicator — the standard Indian-grocery-app square +
            dot symbol, not a generic checkmark. */}
        <View
          className={`absolute bottom-1.5 left-1.5 h-4 w-4 items-center justify-center rounded-[3px] border bg-white ${
            isVeg ? 'border-success' : 'border-danger'
          }`}
        >
          <View className={`h-1.5 w-1.5 rounded-full ${isVeg ? 'bg-success' : 'bg-danger'}`} />
        </View>
      </View>

      <View className="-mt-4 z-10 flex-row items-center justify-between px-1">
        <View className="rounded-full border border-mist bg-white px-2 py-1">
          <Text className="text-[11px] font-semibold text-ink">{weight}</Text>
        </View>

        {quantity === 0 ? (
          <Pressable
            onPress={() => addItem({ id, name, weight, price, originalPrice })}
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
    </Pressable>
  );
}
