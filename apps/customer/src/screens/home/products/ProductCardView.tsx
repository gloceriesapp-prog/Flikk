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
// in types.ts), ADD sits bottom-right, HALF outside the image's own corner
// (a solid blue circle + a white "+" — per an explicit reference image),
// not the earlier in-bounds text pill. Once added, it becomes a compact
// pill stepper instead (-, qty, +) since a circle can't fit three elements.
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

  const chips = sizeOptions && sizeOptions.length > 0 ? sizeOptions : [weight];
  const [selectedSize, setSelectedSize] = useState(chips[0]);
  const isBookmarked = useWishlistStore((state) => state.isWishlisted(id));
  const toggleWishlist = useWishlistStore((state) => state.toggle);

  const quantity = useCartStore((state) => state.items.find((item) => item.id === id)?.quantity ?? 0);
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);

  return (
    <Pressable onPress={onPress} className={`${widthClassName} gap-2`}>
      {/* Outer wrapper has NO overflow-hidden — the ADD circle below sits
          half outside the image tile's own corner and would get clipped
          if this View were the one hiding overflow. Only the inner tile
          (image + freshness/bookmark/veg-dot, all in-bounds) clips. */}
      <View className="aspect-square">
        {/* backgroundColor is always explicit white, never undefined —
            Android's `elevation`-based shadow (shadow-md below) needs an
            opaque background on the elevated View to composite correctly;
            leaving it undefined rendered a mismatched gray fill behind the
            image on Android only (iOS's shadow implementation has no such
            requirement, which is why this never showed up there). */}
        <View
          className="h-full w-full overflow-hidden rounded-xl border border-gray-100 shadow-md shadow-black/20"
          style={{ backgroundColor: '#FFFFFF' }}
        >
        {/* Every card renders the same way now — full-bleed "cover", no
            padding, no gray contain-backdrop. That gray-box treatment used
            to apply only to real photos (imageUrl set), which made mock/
            placeholder cards and real-photo cards look like two different
            products of card — per an explicit ask, one consistent look for
            every card regardless of image source. */}
        <Image source={{ uri: imageUrl || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />

        {/* freshness ribbon — top-left, only for same-day perishables. */}
        {freshnessTag && (
          <View className="absolute left-0 top-2 rounded-r-full bg-gold py-1 pl-2 pr-2.5">
            <Text className="text-[10px] font-bold text-white">{freshnessTag}</Text>
          </View>
        )}

        {/* bookmark/wishlist (heart) — local toggle only, nothing persists
            this yet. Bg always white; only the heart itself changes
            (outline -> filled red) on tap, not a green badge swap. */}
        <Pressable
          onPress={() => toggleWishlist(product)}
          hitSlop={8}
          className="absolute right-1.5 top-1.5 h-7 w-7 items-center justify-center rounded-full bg-white"
        >
          <AppIcon
            icon={HeartIcon}
            size={14}
            color={isBookmarked ? colors.danger : colors.ink}
            strokeWidth={isBookmarked ? 0 : 1.8}
            fill={isBookmarked ? colors.danger : undefined}
          />
        </Pressable>

        {/* veg/non-veg indicator — the standard Indian-grocery-app square +
            dot symbol, not a generic checkmark. */}
        <View
          className={`absolute bottom-1.5 left-1.5 h-4 w-4 items-center justify-center rounded-[3px] border bg-white ${isVeg ? 'border-success' : 'border-danger'
            }`}
        >
          <View className={`h-1.5 w-1.5 rounded-full ${isVeg ? 'bg-success' : 'bg-danger'}`} />
        </View>
        </View>

        {/* ADD — a solid blue circle sitting HALF outside the image tile's
            own bottom-right corner (per an explicit reference image), not
            an in-bounds text pill anymore. Lives on the outer (non-clipped)
            wrapper, not inside the tile above — see that View's own note. */}
        {quantity === 0 ? (
          <Pressable
            onPress={() =>
              addToCart({ id, name, weight: selectedSize, price, originalPrice, storeId: storeId ?? '', storeName, imageUrl })
            }
            className="absolute -bottom-3 -right-3 h-9 w-9 items-center justify-center rounded-full shadow-md shadow-black/30"
            style={{ backgroundColor: '#2457F5' }}
          >
            <AppIcon icon={Add01Icon} size={18} color="#FFFFFF" strokeWidth={2.4} />
          </Pressable>
        ) : (
          <View
            className="absolute -bottom-3 -right-3 flex-row items-center gap-2 rounded-full px-2.5 py-1.5 shadow-md shadow-black/30"
            style={{ backgroundColor: '#2457F5' }}
          >
            <Pressable onPress={() => decrementItem(id)} hitSlop={6}>
              <AppIcon icon={MinusSignIcon} size={15} color="#FFFFFF" strokeWidth={3} />
            </Pressable>
            <Text className="min-w-[14px] text-center text-xs font-bold text-white">{quantity}</Text>
            <Pressable onPress={() => incrementItem(id)} hitSlop={6}>
              <AppIcon icon={Add01Icon} size={15} color="#FFFFFF" strokeWidth={3} />
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
              className={`rounded-lg border px-2 py-0.5 ${selectedSize === size ? 'border-[#2457F5]/80' : 'border bg-[#F5F5F5]'
                }`}
            >
              <Text className={`text-[11px] font-medium ${selectedSize === size ? 'text-[#2457F5]/80' : 'text-ink'}`}>{size}</Text>
            </Pressable>
          ))}
        </View>

        {discountPercent !== null && discountPercent > 0 && (
          <Text className="text-[11px] font-bold text-lime-deep">{discountPercent}% OFF</Text>
        )}

        <View className="flex-row items-center gap-1.5">
          <Text className="text-[15px] font-semibold text-ink">₹{price}</Text>
          {originalPrice && <Text className="text-xs text-ink/40 line-through">₹{originalPrice}</Text>}
        </View>
      </View>
    </Pressable>
  );
}
