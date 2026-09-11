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
// bookmark/wishlist top-right (useWishlistStore — on-device persisted,
// see that file's own note on why it's local-only for now), veg/non-veg
// indicator bottom-left (defaults to veg;
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
import { Add01Icon, HeartIcon, MinusSignIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { AppIcon } from '../../../components/AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { colors } from '../../../theme/tokens';
import { estimateCartEtaMinutes } from '../../../utils/estimateDelivery';
import { getPerUnitPriceLabel } from '../../../utils/perUnitPrice';
import { useCartStore } from '../../../store/useCartStore';
import { addToCart } from '../../../store/addToCart';
import { useWishlistStore } from '../../../store/useWishlistStore';
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
  const {
    id,
    name,
    localName,
    weight,
    price,
    originalPrice,
    imageUrl,
    isVeg = true,
    freshnessTag,
    sizeOptions,
    storeId,
    storeName,
  } = product;
  const discountPercent =
    showDiscountBadge && originalPrice ? Math.round((1 - price / originalPrice) * 100) : null;
  // Same real, non-fabricated pre-order estimate CartScreen already shows
  // (DEFAULT_PREP_MINUTES + DELIVERY_TRANSIT_BUFFER_MINUTES) — no per-order
  // context exists yet at the card level to compute anything more specific.
  const etaMinutes = estimateCartEtaMinutes();
  // Only weight/volume-based products (g/kg/ml/l) get a real "per 100"
  // line — count-based units (pcs, dozen) have no sane equivalent, see
  // that util's own note.
  const perUnitLabel = getPerUnitPriceLabel(weight, price);

  const chips = sizeOptions && sizeOptions.length > 0 ? sizeOptions : [weight];
  const [selectedSize, setSelectedSize] = useState(chips[0]);
  const isBookmarked = useWishlistStore((state) => state.isWishlisted(id));
  const toggleWishlist = useWishlistStore((state) => state.toggle);

  const quantity = useCartStore((state) => state.items.find((item) => item.id === id)?.quantity ?? 0);
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);

  return (
    <Pressable onPress={onPress} className={`${widthClassName} gap-2`}>
      <View className="aspect-square">
        {/* backgroundColor is a flat premium gray, not white — every card
            gets the same neutral photo backdrop regardless of what the
            actual product photo looks like (a per-product pastel would
            mean two cards next to each other look like different card
            *types*; one consistent gray reads as one deliberate system).
            Still always explicit (never undefined) for the same Android
            shadow-compositing reason as before. */}
        {/* Only the top corners round — bottom stays sharp so the veg/ADD
            cutout badges below still sit flush square in the corners,
            matching the reference's cutout look instead of getting
            clipped into a rounded corner themselves. */}
        <View
          className="h-full w-full overflow-hidden rounded-t-xl rounded-br-[8px] shadow-sm shadow-black/20"
          style={{ backgroundColor: '#EEEEEE' }}
        >
          <Image source={{ uri: imageUrl || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />

          {/* freshness ribbon */}
          {freshnessTag && (
            <View className="absolute left-0 top-2 rounded-r-full bg-gold py-0.5 pl-1.5 pr-2">
              <Text className="text-[9px] font-semibold text-white">{freshnessTag}</Text>
            </View>
          )}

          {/* bookmark/wishlist */}
          <Pressable
            onPress={() => toggleWishlist(product)}
            hitSlop={8}
            className="absolute right-2 top-2 items-center justify-center"
          >
            <AppIcon
              icon={HeartIcon}
              size={20}
              color={isBookmarked ? colors.danger : 'rgba(0,0,0,0.5)'}
              strokeWidth={isBookmarked ? 0 : 1.5}
              fill={isBookmarked ? colors.danger : 'rgba(0,0,0,0.5)'}
            />
          </Pressable>

          {/* veg/non-veg indicator — cutout corner, only the inner (top-right)
              corner curved so it reads as a notch cut out of the photo,
              not a floating square. */}
          <View className="absolute bottom-0 left-0 rounded-tr-md bg-white pr-1 pt-1">
            <View
              className={`h-4 w-4 items-center justify-center rounded-[3px] border ${isVeg ? 'border-success' : 'border-danger'
                }`}
            >
              <View className={`h-1.5 w-1.5 rounded-full ${isVeg ? 'bg-success' : 'bg-danger'}`} />
            </View>
          </View>

          {/* ADD button — docked entirely flush to the bottom-right corner. */}
          <View className="absolute bottom-0 right-0">
            {quantity === 0 ? (
              <Pressable
                onPress={() =>
                  addToCart({ id, name, weight: selectedSize, price, originalPrice, storeId: storeId ?? '', storeName, imageUrl })
                }
                className="h-9 items-center justify-center rounded-[8px] border-[1px] border-[#2457F5] bg-[#F4F7FF] px-3"
              >
                <Text className="text-[13px] font-semibold text-[#2457F5]">ADD</Text>
              </Pressable>
            ) : (
              <View className="h-8 flex-row items-center justify-between gap-1 rounded-[8px] border-[1.5px] border-[#2457F5] bg-[#F4F7FF] px-1.5">
                <Pressable onPress={() => decrementItem(id)} hitSlop={6}>
                  <AppIcon icon={MinusSignIcon} size={14} color="#2457F5" strokeWidth={2.5} />
                </Pressable>
                <Text className="min-w-[12px] text-center text-[12px] font-bold text-[#2457F5]">{quantity}</Text>
                <Pressable onPress={() => incrementItem(id)} hitSlop={6}>
                  <AppIcon icon={Add01Icon} size={14} color="#2457F5" strokeWidth={2.5} />
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>


      <View className="gap-1 px-1">
        <Text className="text-[10px] font-medium uppercase text-ink/40">Get it in {etaMinutes} mins</Text>

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
              className={`rounded-md border px-2 py-0.5 font-medium ${selectedSize === size ? 'border-[#2457F5]/60' : 'border-[#7C8B87]'
                }`}
            >
              <Text className={`text-[11px] font-medium ${selectedSize === size ? 'text-[#2457F5]' : 'text-[#7C8B87]'}`}>{size}</Text>
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

        {perUnitLabel && <Text className="text-[11px] font-medium text-ink/40">{perUnitLabel}</Text>}
      </View>
    </Pressable>
  );
}