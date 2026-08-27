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
// Only the image is an elevated "card" (border + shadow) — name/chips/price
// sit flat on the page background below it, per the redesigned reference
// (hand-sketch: heart top-right, ADD overlapping the image's own
// bottom-right corner, name -> size chips -> discount% -> price stacked
// underneath). Name is never truncated — it wraps to 2 lines if it needs to.
// No rating line — removed from every card app-wide per an explicit ask.
//
// Image-corner elements: freshness ribbon top-left (only when freshnessTag
// is set — same-day perishables like dairy, not shelf-stable goods),
// bookmark/wishlist top-right (local-only toggle, no store — nothing
// persists this yet), veg/non-veg indicator bottom-left (defaults to veg;
// only fish/meat data sets isVeg: false explicitly, see Product's own note
// in types.ts), ADD/stepper sits bottom-right overlapping the image itself
// (not below it anymore).
//
// Size chips (sizeOptions, e.g. ['500 g', '1 kg']) are a selection toggle
// only — picking one doesn't change price yet, no per-size pricing model
// exists on Product (see that field's own note in types.ts); falls back to
// a single non-interactive chip built from `weight` when unset, so every
// product still shows something.
//
// ADD becomes a quantity stepper once the product is in the cart — reads
// live from useCartStore, not local state, so it stays in sync if the same
// product is also in the cart bar/CartScreen.

import { useState } from 'react';
import { AddSquareIcon, HeartIcon, MinusSignIcon } from '@hugeicons/core-free-icons';
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
  // imageSeed is kept on Product (data.ts files) for when a mock product has
  // no imageUrl of its own — real products (see that field's own note in
  // types.ts) carry their actual uploaded photo instead.
  const { id, name, localName, weight, price, originalPrice, imageUrl, bgColor, isVeg = true, freshnessTag, sizeOptions } = product;
  const discountPercent =
    showDiscountBadge && originalPrice ? Math.round((1 - price / originalPrice) * 100) : null;

  const chips = sizeOptions && sizeOptions.length > 0 ? sizeOptions : [weight];
  const [selectedSize, setSelectedSize] = useState(chips[0]);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const quantity = useCartStore((state) => state.items.find((item) => item.id === id)?.quantity ?? 0);
  const addItem = useCartStore((state) => state.addItem);
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);

  return (
    <Pressable onPress={onPress} className={`${widthClassName} gap-2`}>
      <View
        className="aspect-square overflow-hidden rounded-xl border border-gray-100 shadow-md shadow-black/20"
        style={{ backgroundColor: imageUrl ? (bgColor ?? colors.mist) : undefined }}
      >
        {/* Real product photos (imageUrl set) render "contain" with a
            pastel backdrop pulled from the photo itself (bgColor, admin's
            lib/bgColor.ts) — a no-background product shot sits on its own
            color instead of being cropped to fill the square. Mock/
            placeholder images keep the old "cover" fill. */}
        <Image
          source={{ uri: imageUrl || PLACEHOLDER_IMAGE_URI }}
          className={imageUrl ? 'h-full w-full p-3' : 'h-full w-full'}
          resizeMode={imageUrl ? 'contain' : 'cover'}
        />

        {/* freshness ribbon — top-left, only for same-day perishables. */}
        {freshnessTag && (
          <View className="absolute left-0 top-2 rounded-r-full bg-gold py-1 pl-2 pr-2.5">
            <Text className="text-[10px] font-bold text-white">{freshnessTag}</Text>
          </View>
        )}

        {/* bookmark/wishlist (heart) — local toggle only, nothing persists this yet */}
        <Pressable
          onPress={() => setIsBookmarked((prev) => !prev)}
          hitSlop={8}
          className={`absolute right-1.5 top-1.5 h-7 w-7 items-center justify-center rounded-full ${isBookmarked ? 'bg-lime-deep' : 'bg-white'
            }`}
        >
          <AppIcon icon={HeartIcon} size={14} color={isBookmarked ? '#FFFFFF' : colors.ink} strokeWidth={isBookmarked ? 0 : 1.8} />
        </Pressable>

        {/* veg/non-veg indicator — the standard Indian-grocery-app square +
            dot symbol, not a generic checkmark. */}
        <View
          className={`absolute bottom-1.5 left-1.5 h-4 w-4 items-center justify-center rounded-[3px] border bg-white ${isVeg ? 'border-success' : 'border-danger'
            }`}
        >
          <View className={`h-1.5 w-1.5 rounded-full ${isVeg ? 'bg-success' : 'bg-danger'}`} />
        </View>

        {/* ADD/stepper — flush against the image's own bottom-right corner
            (redesigned reference: no gap from either edge), not a separate
            row below it anymore. */}
        {quantity === 0 ? (
          <Pressable
            onPress={() => addItem({ id, name, weight: selectedSize, price, originalPrice })}
            className="absolute bottom-0 right-0 rounded-lg bg-[#2457F5] px-3 py-1.5 shadow-sm shadow-black/20"
          >
            <Text className="text-xs font-medium text-white">ADD</Text>
          </Pressable>
        ) : (
          <View className="absolute bottom-0 right-0 flex-row items-center gap-2 rounded-tl-lg rounded-br-2xl bg-lime px-1.5 py-1.5 shadow-sm shadow-black/20">
            <Pressable onPress={() => decrementItem(id)} hitSlop={6}>
              <AppIcon icon={MinusSignIcon} size={13} color={colors.ink} />
            </Pressable>
            <Text className="min-w-[14px] text-center text-xs font-semibold text-ink">{quantity}</Text>
            <Pressable onPress={() => incrementItem(id)} hitSlop={6}>
              <AppIcon icon={AddSquareIcon} size={13} color={colors.ink} />
            </Pressable>
          </View>
        )}
      </View>


      <View className="gap-1 px-1">
        <Text className="text-[13px] font-medium leading-4 text-ink" numberOfLines={2}>
          {name}
          {localName ? ` (${localName})` : ''}
        </Text>

        {/* size chips — selection only, doesn't change price yet (see this
            file's own note at the top). */}
        <View className="flex-row flex-wrap gap-1.5">
          {chips.map((size) => (
            <Pressable
              key={size}
              onPress={() => setSelectedSize(size)}
              className={`rounded-lg border px-2 py-0.5 ${selectedSize === size ? 'border-lime-deep bg-lime-soft/20' : 'border bg-[#F5F5F5]'
                }`}
            >
              <Text className={`text-[11px] font-medium ${selectedSize === size ? 'text-lime-deep' : 'text-ink'}`}>{size}</Text>
            </Pressable>
          ))}
        </View>

        {discountPercent !== null && discountPercent > 0 && (
          <Text className="text-[11px] font-semibold text-lime-deep">{discountPercent}% OFF</Text>
        )}

        <View className="flex-row items-center gap-1.5">
          <Text className="text-[15px] font-semibold text-ink">₹{price}</Text>
          {originalPrice && <Text className="text-xs text-ink/40 line-through">₹{originalPrice}</Text>}
        </View>
      </View>
    </Pressable>
  );
}
