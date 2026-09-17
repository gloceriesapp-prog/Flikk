// Single row inside CartScreen's items card (the white card itself, "N
// items" header + dashed divider, lives in CartScreen.tsx — this is just one
// row). One layout for every item — image | name/weight | stepper | price,
// all one horizontal line. No "Move to wishlist" link — per an explicit
// ask, this app has no wishlist screen to move something to yet.
//
// Strikethrough original price only shows when the item has a real
// discount (originalPrice set and higher than price).
//
// Thumbnail sits on a flat neutral gray (#F3F4F6), same tone the "Grab
// these before you go" row's own image tiles use — deliberately NOT the
// per-product bgColor pastel ProductCardView uses on Home (that read as
// too colorful/inconsistent against this row's own gray-toned neutral
// cards, per an explicit ask to drop it here).

import { Add01Icon, AddSquareIcon, MinusSignIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { AppIcon } from '../../../components/AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { useCartStore, type CartItem } from '../../../store/useCartStore';

const IMAGE_TILE_BG = '#F3F4F6';

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

  return (
    <View className="flex-row items-center gap-3 py-3.5">
      <View
        className="relative h-12 w-12 overflow-hidden rounded-xl border border-gray-100"
        style={{ backgroundColor: item.imageUrl ? IMAGE_TILE_BG : '#FFFFFF' }}
      >
        <Image
          source={{ uri: item.imageUrl || PLACEHOLDER_IMAGE_URI }}
          className={item.imageUrl ? 'h-full w-full p-2' : 'h-full w-full'}
          resizeMode={item.imageUrl ? 'contain' : 'cover'}
        />
      </View>

      <View className="flex-1 gap-1">
        <Text className="text-[13.5px] font-medium text-ink" numberOfLines={2}>
          {item.name}
        </Text>
        <Text className="text-[12px] text-ink/50 font-medium">{item.weight}</Text>
      </View>

      <View className="flex-row items-center gap-1.5 rounded-xl border border-[#155dfc] p-1 bg-white">
        <Pressable
          onPress={() => decrementItem(item.id)}
          hitSlop={6}
          className="h-6 w-6 items-center justify-center rounded-full"
          style={{ backgroundColor: `${STEPPER_TINT}0A` }}
        >
          <AppIcon icon={MinusSignIcon} size={12} color={STEPPER_TINT} />
        </Pressable>
        <Text className="min-w-[16px] text-center text-[13px] font-bold text-[#155dfc]">
          {item.quantity}
        </Text>
        <Pressable
          onPress={() => incrementItem(item.id)}
          hitSlop={6}
          className="h-6 w-6 items-center justify-center rounded-full"
          style={{ backgroundColor: `${STEPPER_TINT}0A` }}
        >
          <AppIcon icon={Add01Icon} size={12} color={STEPPER_TINT} />
        </Pressable>
      </View>

      <View className="items-end gap-0.5">
        {originalLineTotal && <Text className="text-xs text-ink/40 line-through font-semibold">₹{originalLineTotal}</Text>}
        <Text className="text-[16px] font-semibold tabular-nums text-ink">₹{lineTotal}</Text>
      </View>
    </View>
  );
}
