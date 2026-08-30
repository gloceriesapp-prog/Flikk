// Single row inside CartScreen's items card (the white card itself, "N
// items" header + dashed divider, lives in CartScreen.tsx — this is just one
// row). One layout for every item — image | name/weight | stepper | price,
// all one horizontal line. No "Move to wishlist" link — per an explicit
// ask, this app has no wishlist screen to move something to yet.
//
// Strikethrough original price only shows when the item has a real
// discount (originalPrice set and higher than price).

import { AddSquareIcon, MinusSignIcon } from '@hugeicons/core-free-icons';
import { Image, Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { useCartStore, type CartItem } from '../../../store/useCartStore';

const STEPPER_TINT = '#155DFC';

interface Props {
  item: CartItem;
}

export function CartItemRow({ item }: Props) {
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);

  const lineTotal = item.price * item.quantity;
  const hasDiscount = Boolean(item.originalPrice && item.originalPrice > item.price);
  const originalLineTotal = hasDiscount ? item.originalPrice! * item.quantity : null;
  const discountPercent = hasDiscount ? Math.round(((item.originalPrice! - item.price) / item.originalPrice!) * 100) : 0;

  return (
    <View className="flex-row items-center gap-3 py-3.5">
      <View className="relative h-[68px] w-[68px] overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <Image source={{ uri: item.imageUrl || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
        {hasDiscount ? (
          <View className="absolute bottom-0 w-full items-center bg-success py-0.5">
            <Text className="text-[9px] font-bold text-white">{discountPercent}% OFF</Text>
          </View>
        ) : null}
      </View>

      <View className="flex-1 gap-1">
        <Text className="text-[15px] font-medium text-ink" numberOfLines={2}>
          {item.name}
        </Text>
        <Text className="text-sm text-ink/50">{item.weight}</Text>
      </View>

      <View className="flex-row items-center gap-1.5 rounded-full border border-gray-200 p-1">
        <Pressable
          onPress={() => decrementItem(item.id)}
          hitSlop={6}
          className="h-6 w-6 items-center justify-center rounded-full"
          style={{ backgroundColor: `${STEPPER_TINT}1A` }}
        >
          <AppIcon icon={MinusSignIcon} size={12} color={STEPPER_TINT} />
        </Pressable>
        <Text className="min-w-[16px] text-center text-[13px] font-bold" style={{ color: STEPPER_TINT }}>
          {item.quantity}
        </Text>
        <Pressable
          onPress={() => incrementItem(item.id)}
          hitSlop={6}
          className="h-6 w-6 items-center justify-center rounded-full"
          style={{ backgroundColor: `${STEPPER_TINT}1A` }}
        >
          <AppIcon icon={AddSquareIcon} size={12} color={STEPPER_TINT} />
        </Pressable>
      </View>

      <View className="items-end gap-0.5">
        {originalLineTotal && <Text className="text-xs text-ink/40 line-through">₹{originalLineTotal}</Text>}
        <Text className="text-[16px] font-semibold tabular-nums text-ink">₹{lineTotal}</Text>
      </View>
    </View>
  );
}
