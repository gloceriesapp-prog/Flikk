// One line item, replicating the reference row: thumbnail, "Qtyx Name"
// title + unit subtitle on the left, line price on the right. No quantity
// stepper — this app only ever displays an order that's already placed,
// there's nothing here to adjust.

import { Image, Text, View } from 'react-native';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import type { OrderLineItem } from '../../orders/data';

interface Props {
  item: OrderLineItem;
}

export function OrderDetailItemRow({ item }: Props) {
  return (
    <View className="flex-row items-center gap-3 py-2.5">
      <Image source={{ uri: PLACEHOLDER_IMAGE_URI }} className="h-14 w-14 rounded-2xl bg-gray-50" resizeMode="cover" />

      <View className="flex-1">
        <Text className="text-[15px] font-medium leading-5 text-ink" numberOfLines={2}>
          {item.quantity}x {item.name}
        </Text>
        <Text className="text-[14px] font-medium text-ink/60">{item.unit}</Text>
      </View>

      <Text className="text-[15px] font-semibold text-ink">₹{item.price}</Text>
    </View>
  );
}
