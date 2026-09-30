import { useState } from 'react';
import { Add01Icon, FlashIcon, MinusSignIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { AppIcon } from '../../../components/AppIcon';
import { RupeePrice } from '../../../components/RupeePrice';
import { IconlyBookmark, IconlyBookmarkFilled } from '../../../components/icons/IconlyBookmark';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { colors } from '../../../theme/tokens';
import { getPerUnitPriceLabel } from '../../../utils/perUnitPrice';
import { useCartStore } from '../../../store/useCartStore';
import { addToCart } from '../../../store/addToCart';
import { useWishlistStore } from '../../../store/useWishlistStore';
import type { Product } from './types';

// Categories where a veg/non-veg mark is meaningful — only these show the dot.
// (veg/non-veg indicator removed from the card per design)

interface Props {
  product: Product;
  widthClassName?: string;
  showDiscountBadge?: boolean;
  // Festival-rail variant: no bookmark, ADD button is a bold + icon (not text).
  // Every other Home row leaves this off and keeps the full card.
  compact?: boolean;
  // Festival panel sits on a dark maroon bg — switch the background-less
  // detail text (name/price/%OFF) to light treatments so it stays readable.
  // Everything with its own light chip/pill bg is left untouched.
  onDark?: boolean;
  onPress?: () => void;
}

export function ProductCardView({ product, widthClassName = 'w-[32%]', showDiscountBadge = false, compact = false, onDark = false, onPress }: Props) {
  const {
    id,
    name,
    weight,
    price,
    originalPrice,
    imageUrl,
    freshnessTag,
    sizeOptions,
    storeId,
    storeName,
    isVeg = true,
  } = product;

  const discountPercent = showDiscountBadge && originalPrice ? Math.round((1 - price / originalPrice) * 100) : null;
  const perUnitLabel = getPerUnitPriceLabel(weight, price);

  const chips = sizeOptions && sizeOptions.length > 0 ? sizeOptions : [weight];
  const [selectedSize] = useState(chips[0]);
  const isBookmarked = useWishlistStore((state) => state.isWishlisted(id));
  const toggleWishlist = useWishlistStore((state) => state.toggle);

  const quantity = useCartStore((state) => state.items.find((item) => item.id === id)?.quantity ?? 0);
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);

  return (
    <Pressable onPress={onPress} className={`${widthClassName} gap-0`}>

      {/* Image card with the ADD button pinned to its bottom-right corner. */}
      <View className="relative mb-2">
        <View className="aspect-[4/4.5] w-full overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]">
          <Image source={{ uri: imageUrl || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
        </View>

        {freshnessTag && (
          <View className="absolute left-0 top-2 rounded-r-full bg-gold py-0.5 pl-1.5 pr-2">
            <Text className="text-[9px] font-semibold text-white">{freshnessTag}</Text>
          </View>
        )}

        {compact ? null : (
          <Pressable
            onPress={() => toggleWishlist(product)}
            hitSlop={8}
            className="absolute right-2 top-2 h-7 w-7 items-center justify-center"
          >
            {isBookmarked ? (
              <IconlyBookmarkFilled size={22} color={colors.danger} />
            ) : (
              <IconlyBookmark size={22} color="#1F2937" />
            )}
          </Pressable>
        )}

        {/* ADD / stepper — flush to the image's bottom-right corner (no inset,
            no outer gap). */}
        <View
          className="absolute bottom-0 right-0 z-10"
        >
          {quantity === 0 ? (
            <Pressable
              onPress={() =>
                addToCart({ id, name, weight: selectedSize, price, originalPrice, storeId: storeId ?? '', storeName, imageUrl })
              }
              className={`items-center justify-center rounded-[8px] border border-[#155dfc] bg-white py-2 px-3 `}
            >
              {compact ? (
                <AppIcon icon={Add01Icon} size={18} color="#241712" fill="#155dfc" strokeWidth={3.5} />
              ) : (
                <AppIcon icon={Add01Icon} size={20} color="#155dfc" fill="#155dfc" strokeWidth={3} />
              )}
            </Pressable>
          ) : (
            <View className="flex-row items-center gap-2.5 rounded-[8px] border border-[#155dfc] bg-white px-3 py-2">
              <Pressable onPress={() => decrementItem(id)} hitSlop={8}>
                <AppIcon icon={MinusSignIcon} size={20} color="#155dfc" strokeWidth={2.5} />
              </Pressable>
              <Text className="min-w-[12px] text-center text-[13px] font-extrabold text-[#155dfc]">{quantity}</Text>
              <Pressable onPress={() => incrementItem(id)} hitSlop={8}>
                <AppIcon icon={Add01Icon} size={20} color="#155dfc" strokeWidth={2.5} />
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* Details — weight + ETA row, price row, per-unit, % OFF, name. */}
      <View className="gap-1 px-0.5 pt-0">
        {/* Weight chip + delivery-ETA pill, sitting next to each other (left-
            aligned, small fixed gap — not pushed apart). Weight chip hugs its
            text (no min width) so it stays compact. */}
        <View className="mb-0.5 flex-row items-center gap-1.5">
          {/* Veg / non-veg mark — square outline + center dot, standard Indian
              food-label convention. isVeg defaults true (types.ts), only
              fish/meat set it false. */}
          <View
            className="h-3 w-3 items-center justify-center rounded-[3px] border"
            style={{ borderColor: isVeg ? '#00A650' : '#E23744' }}
          >
            <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: isVeg ? '#00A650' : '#E23744' }} />
          </View>
          <View className="self-start rounded-md  bg-[#F1F1F4] border border-gray-100 px-1.5 py-0.5">
            <Text className="text-[11.5px] font-semibold text-black/60">{weight}</Text>
          </View>

        </View>

        {/* Price row — RupeeIcon + current price, then strike-through MRP.
            Numerals in Gilroy-ExtraBold (RupeePrice); everything else Gilroy. */}
        <View className="flex-row items-center gap-[5px]">
          <RupeePrice amount={price} size={17} color={onDark ? '#FFFFFFCC' : '#101C10CC'} />

          {originalPrice && originalPrice > price && (
            <RupeePrice amount={originalPrice} size={12} strike color={onDark ? '#FFFFFF73' : '#B8B8B8'} />
          )}
        </View>

        {/* {perUnitLabel && <Text className="text-[11px] font-medium text-[#9CA3AF]">{perUnitLabel}</Text>} */}

        {discountPercent !== null && discountPercent > 0 && (
          <Text className={`text-[12px] font-bold ${onDark ? 'text-[#8FE3B0]' : 'text-[#00A650]'}`}>{discountPercent}% OFF</Text>
        )}

        <Text className={`text-[13px] font-semibold leading-[17px] ${onDark ? 'text-white' : 'text-[#1F2937]'}`} numberOfLines={3}>
          {name}
        </Text>
        <View className="self-start flex-row items-center gap-0.5 rounded-md bg-[#F3F4F6] border border-gray-100 px-1.5 py-0.5">
          <AppIcon
            icon={FlashIcon}
            size={10}
            color="#155dfc"
            fill="#155dfc"
            strokeWidth={1.5}
          />

          <Text className="text-[10px] font-semibold text-[#1F2937] uppercase">
            20 mins
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
