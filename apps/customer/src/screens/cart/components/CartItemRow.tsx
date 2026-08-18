import { AddSquareIcon, MinusSignIcon, PlusSignIcon } from '@hugeicons/core-free-icons';
import { Image, Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { colors } from '../../../theme/tokens';
import { useCartStore, type CartItem } from '../../../store/useCartStore';

interface Props {
  item: CartItem;
}

export function CartItemRow({ item }: Props) {
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);

  return (
    <View className="flex-row items-center gap-3 py-3">
      <View className="h-24 w-24 overflow-hidden rounded-xl border border-gray-100 bg-white">
        <Image source={{ uri: PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
      </View>

      <View className="flex-1 gap-0">
        <Text className="text-base font-semibold text-ink" numberOfLines={2}>
          {item.name}
        </Text>
        <Text className="text-base font-medium text-ink/50">{item.weight}</Text>
        <Text className="text-base font-semibold text-ink">Price ₹{item.price * item.quantity}</Text>
      </View>

      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => decrementItem(item.id)}
          hitSlop={8}
          className="h-8 w-8 items-center justify-center rounded-full bg-gray-100"
        >
          <AppIcon icon={MinusSignIcon} size={15} color={colors.ink} />
        </Pressable>

        <Text className="min-w-[16px] text-center text-base font-bold text-ink">
          {item.quantity}
        </Text>

        <Pressable
          onPress={() => incrementItem(item.id)}
          hitSlop={8}
          className="h-8 w-8 items-center justify-center rounded-full bg-gray-100"
        >
          <AppIcon icon={PlusSignIcon} size={15} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}
