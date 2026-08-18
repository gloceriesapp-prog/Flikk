// Overlapping product-photo circles — 1 image shows as 1 circle, 2 as 2,
// 3+ always caps at 3 (never more, per the ask) with white borders so they
// read as a stack, not a row.

import { Image, View } from 'react-native';
import type { OrderItemSummary } from '../data';

const MAX_AVATARS = 3;

interface Props {
  items: OrderItemSummary[];
}

export function ItemAvatarStack({ items }: Props) {
  const visibleItems = items.slice(0, MAX_AVATARS);

  return (
    <View className="flex-row">
      {visibleItems.map((item, i) => (
        <View
          key={item.name}
          style={{ marginLeft: i === 0 ? 0 : -14, zIndex: visibleItems.length - i }}
          className="h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-mist shadow-sm shadow-black/10"
        >
          <Image source={{ uri: item.imageUri }} className="h-full w-full" resizeMode="cover" />
        </View>
      ))}
    </View>
  );
}
