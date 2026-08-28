// One product row inside a PromoListCard — thumbnail, name/weight stacked
// left, ADD/stepper center-right, price + struck MRP far right. Same
// useCartStore wiring as ProductCardView.tsx (add/increment/decrement) so a
// product added from here shows correctly everywhere else in the app
// (cart bar, CartScreen) and vice versa.
//
// Fixed ROW_HEIGHT (not padding-driven) — PromoListCard.tsx fits 4 of these
// inside a fixed-height card, so every row needs the same real height to
// budget against rather than "however much its own padding adds up to."

import { AddSquareIcon, MinusSignIcon } from '@hugeicons/core-free-icons';
import { Image, Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../../../theme/placeholderImage';
import { colors } from '../../../../theme/tokens';
import { useCartStore } from '../../../../store/useCartStore';
import type { Product } from '../../products/types';

export const ROW_HEIGHT = 46;

interface Props {
  product: Product;
  onPress: () => void;
}

export function PromoListCardRow({ product, onPress }: Props) {
  const { id, name, weight, price, originalPrice, imageUrl } = product;

  const quantity = useCartStore((state) => state.items.find((item) => item.id === id)?.quantity ?? 0);
  const addItem = useCartStore((state) => state.addItem);
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);

  return (
    <Pressable onPress={onPress} style={{ height: ROW_HEIGHT }} className="flex-row items-center gap-2.5">
      <View className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-white">
        <Image source={{ uri: imageUrl || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
      </View>

      <View className="min-w-0 flex-1">
        <Text className="text-[11px] font-bold leading-3.5 text-ink" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-[9px] text-ink/45">{weight}</Text>
      </View>

      {quantity === 0 ? (
        <Pressable
          onPress={() => addItem({ id, name, weight, price, originalPrice })}
          className="shrink-0 rounded-full border border-lime-deep bg-white px-2.5 py-1"
        >
          <Text className="text-[10px] font-extrabold text-lime-deep">ADD</Text>
        </Pressable>
      ) : (
        <View className="shrink-0 flex-row items-center gap-1.5 rounded-full bg-lime-deep px-1.5 py-1">
          <Pressable onPress={() => decrementItem(id)} hitSlop={6}>
            <AppIcon icon={MinusSignIcon} size={10} color={colors.ink} />
          </Pressable>
          <Text className="min-w-[10px] text-center text-[10px] font-extrabold text-ink">{quantity}</Text>
          <Pressable onPress={() => incrementItem(id)} hitSlop={6}>
            <AppIcon icon={AddSquareIcon} size={10} color={colors.ink} />
          </Pressable>
        </View>
      )}

      <View className="w-11 shrink-0 items-end">
        <Text className="text-[11px] font-extrabold text-ink">₹{price}</Text>
        {originalPrice && originalPrice > price && (
          <Text className="text-[9px] text-ink/35 line-through">₹{originalPrice}</Text>
        )}
      </View>
    </Pressable>
  );
}
