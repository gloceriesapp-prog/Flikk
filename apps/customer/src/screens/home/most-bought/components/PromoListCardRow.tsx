// One product row inside a PromoListCard — thumbnail, name/weight stacked
// left, ADD/stepper center-right, price + struck MRP far right. Same
// useCartStore wiring as ProductCardView.tsx (add/increment/decrement) so a
// product added from here shows correctly everywhere else in the app
// (cart bar, CartScreen) and vice versa.
//
// ADD pill/stepper use the parent card's own accentColor (PromoListCard's
// prop of the same name), not a hardcoded green — "Best Deals" is a coral
// card and "Fresh Picks" is a blue one, so a fixed lime-deep button clashed
// with both instead of reading as part of the same card.
//
// Fixed ROW_HEIGHT (not padding-driven) — PromoListCard.tsx fits 4 of these
// inside a fixed-height card, so every row needs the same real height to
// budget against rather than "however much its own padding adds up to."

import { AddSquareIcon, MinusSignIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../../components/AppImage';
import { AppIcon } from '../../../../components/AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../../../theme/placeholderImage';
import { useCartStore } from '../../../../store/useCartStore';
import { addToCart } from '../../../../store/addToCart';
import type { Product } from '../../products/types';

export const ROW_HEIGHT = 46;

interface Props {
  product: Product;
  accentColor: string;
  onPress: () => void;
}

export function PromoListCardRow({ product, accentColor, onPress }: Props) {
  const { id, name, weight, price, originalPrice, imageUrl, storeId, storeName } = product;

  const quantity = useCartStore((state) => state.items.find((item) => item.id === id)?.quantity ?? 0);
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);

  return (
    <Pressable onPress={onPress} style={{ height: ROW_HEIGHT }} className="flex-row items-center gap-2.5">
      <View className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-white">
        <Image source={{ uri: imageUrl || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
      </View>

      <View className="min-w-0 flex-1">
        <Text className="text-[12px] font-semibold leading-3.5 text-ink" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-[10px] text-ink/45">{weight}</Text>
      </View>

      {quantity === 0 ? (
        <Pressable
          onPress={() => addToCart({ id, name, weight, price, originalPrice, storeId: storeId ?? '', storeName, imageUrl })}
          className="shrink-0 rounded-full border border-[#155dfc] bg-white px-2.5 py-1"
          
        >
          <Text className="text-[10px] font-semibold text-[#155dfc]">
            ADD
          </Text>
        </Pressable>
      ) : (
        <View className="shrink-0 flex-row items-center gap-1.5 rounded-full px-1.5 py-1" style={{ backgroundColor: accentColor }}>
          <Pressable onPress={() => decrementItem(id)} hitSlop={6}>
            <AppIcon icon={MinusSignIcon} size={10} color="#FFFFFF" />
          </Pressable>
          <Text className="min-w-[10px] text-center text-[10px] font-extrabold text-white">{quantity}</Text>
          <Pressable onPress={() => incrementItem(id)} hitSlop={6}>
            <AppIcon icon={AddSquareIcon} size={10} color="#FFFFFF" />
          </Pressable>
        </View>
      )}

      <View className="w-11 shrink-0 items-end">
        <Text className="text-[12px] font-bold text-ink">₹{price}</Text>
        {originalPrice && originalPrice > price && (
          <Text className="text-[9px] text-ink/35 line-through">₹{originalPrice}</Text>
        )}
      </View>
    </Pressable>
  );
}
