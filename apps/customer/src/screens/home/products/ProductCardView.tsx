import { useState } from 'react';
import { Add01Icon, Bookmark02Icon, Clock01Icon, MinusSignIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { AppIcon } from '../../../components/AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { colors } from '../../../theme/tokens';
import { PriceDropBadge } from './PriceDropBadge';
import { estimateCartEtaMinutes } from '../../../utils/estimateDelivery';
import { getPerUnitPriceLabel } from '../../../utils/perUnitPrice';
import { useCartStore } from '../../../store/useCartStore';
import { addToCart } from '../../../store/addToCart';
import { useWishlistStore } from '../../../store/useWishlistStore';
import type { Product } from './types';

const VEG_INDICATOR_CATEGORIES = new Set(['Meat, Eggs & Fish', 'Dairy, Bread & Eggs']);

interface Props {
  product: Product;
  widthClassName?: string;
  showDiscountBadge?: boolean;
  onPress?: () => void;
}

export function ProductCardView({ product, widthClassName = 'w-[32%]', showDiscountBadge = false, onPress }: Props) {
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
    categoryLabel,
  } = product;

  const showVegIndicator = categoryLabel != null && VEG_INDICATOR_CATEGORIES.has(categoryLabel);
  const discountPercent = showDiscountBadge && originalPrice ? Math.round((1 - price / originalPrice) * 100) : null;
  const perUnitLabel = getPerUnitPriceLabel(weight, price);

  const chips = sizeOptions && sizeOptions.length > 0 ? sizeOptions : [weight];
  const [selectedSize, setSelectedSize] = useState(chips[0]);
  const isBookmarked = useWishlistStore((state) => state.isWishlisted(id));
  const toggleWishlist = useWishlistStore((state) => state.toggle);

  const quantity = useCartStore((state) => state.items.find((item) => item.id === id)?.quantity ?? 0);
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);
  const etaMinutes = estimateCartEtaMinutes();

  return (
    <Pressable onPress={onPress} className={`${widthClassName} gap-1.5`}>

      {/* Elevated Image Card & Footer */}
      <View className="overflow-visible rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] mb-1">
        {/* Changed bg-white to bg-[#F1F0F6] to act as the default gray backdrop */}
        <View className="aspect-[4/4.5] w-full relative rounded-t-2xl overflow-hidden bg-[#F9FAFB] border-b border-[#E5E7EB]">
          <Image source={{ uri: imageUrl || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />

          {freshnessTag && (
            <View className="absolute left-0 top-2 rounded-r-full bg-gold py-0.5 pl-1.5 pr-2">
              <Text className="text-[9px] font-semibold text-white">{freshnessTag}</Text>
            </View>
          )}

          <Pressable
            onPress={() => toggleWishlist(product)}
            hitSlop={8}
            className="absolute right-2 top-2 h-7 w-7 items-center justify-center"
          >
            <AppIcon
              icon={Bookmark02Icon}
              size={22}
              color={isBookmarked ? colors.danger : "#b0b0b0"}
              strokeWidth={2}
              fill={isBookmarked ? colors.danger : 'none'}
            />
          </Pressable>

          {showVegIndicator && (
            <View className="absolute bottom-0 left-0 rounded-tr-md bg-white pr-1 pt-1">
              <View className={`h-4 w-4 items-center justify-center rounded-[3px] border ${isVeg ? 'border-success' : 'border-danger'}`}>
                <View className={`h-1.5 w-1.5 rounded-full ${isVeg ? 'bg-success' : 'bg-danger'}`} />
              </View>
            </View>
          )}
        </View>

        {/* Inner Card Footer with Overhanging Button */}
        <View className="h-9 justify-center pl-2 pr-0.5 relative">
          <Text className="text-[10.5px] font-semibold text-[#374151]" numberOfLines={1}>
            {selectedSize}
          </Text>

          <View className="absolute -right-2 z-10">
            {quantity === 0 ? (
              <Pressable
                onPress={() => addToCart({ id, name, weight: selectedSize, price, originalPrice, storeId: storeId ?? '', storeName, imageUrl })}
                className="items-center justify-center rounded-[12px] border border-[#155dfc] bg-white px-5 py-3"
              >
                <Text className="text-[14px] font-semibold tracking-tight text-[#155dfc]">ADD</Text>
              </Pressable>
            ) : (
              <View className="flex-row items-center gap-2 rounded-[12px] border border-[#155dfc] bg-white px-2 py-3">
                <Pressable onPress={() => decrementItem(id)} hitSlop={6}>
                  <AppIcon icon={MinusSignIcon} size={15} color="#155dfc" strokeWidth={2.5} />
                </Pressable>
                <Text className="min-w-[14px] text-center text-[13px] font-extrabold text-[#155dfc]">{quantity}</Text>
                <Pressable onPress={() => incrementItem(id)} hitSlop={6}>
                  <AppIcon icon={Add01Icon} size={15} color="#155dfc" strokeWidth={2.5} />
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* External Details Section */}
      <View className="gap-0.5 px-0.5 pt-0">


        {/* Current Price */}
        <Text className="text-[18px] font-extrabold text-[#111827]">₹{price}</Text>

        {/* Original Price & Discount Row */}
        {(originalPrice || (discountPercent !== null && discountPercent > 0)) && (
          <View className="flex-row items-center gap-1.5">
            {originalPrice && (
              <Text className="text-[13px] font-semibold text-[#9CA3AF] line-through decoration-[#9CA3AF] ">
                ₹{originalPrice}
              </Text>
            )}
            {discountPercent !== null && discountPercent > 0 && <PriceDropBadge discountPercent={discountPercent} />}
          </View>
        )}
        <Text className="mt-0.5 text-[13px] font-semibold text-[#000000]/80 tracking-wide" numberOfLines={3}>
          {name}
        </Text>

        {/* Product Title (Bolded, acting as primary text block) */}

      <View className="flex-row items-center self-start gap-1 mt-1 bg-gray-100 py-1 px-2.5 rounded-full">
  {/* <AppIcon icon={Clock01Icon} size={10} color="#6B7280" /> */}
  <Text className="text-[10px] font-medium uppercase tracking-wide text-[#7C8B87]">
    In {etaMinutes} mins
  </Text>
</View>


      </View>
    </Pressable>
  );
}