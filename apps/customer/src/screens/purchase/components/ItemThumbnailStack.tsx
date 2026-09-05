// Overlapping item-photo circles for OrderRow — 1 item shows 1 circle, 2
// shows 2, 3 shows 3. Past 3, it caps at 2 real photos + one more circle
// showing "+N" (N = however many items aren't pictured) instead of a 3rd
// photo, so a long order still reads as "here's roughly what's in it" at a
// glance rather than silently dropping items with no indication more exist.

import { Image, Text, View } from 'react-native';
import type { OrderItemSummary } from '../data';

const MAX_PHOTOS = 3;
const CIRCLE_SIZE = 44;

interface Props {
  items: OrderItemSummary[];
}

export function ItemThumbnailStack({ items }: Props) {
  const overflowCount = items.length - (MAX_PHOTOS - 1);
  const hasOverflow = overflowCount > 1;
  const visiblePhotos = items.slice(0, hasOverflow ? MAX_PHOTOS - 1 : MAX_PHOTOS);

  return (
    <View className="flex-row">
      {visiblePhotos.map((item, i) => (
        <View
          key={item.name}
          style={{ marginLeft: i === 0 ? 0 : -14, zIndex: visiblePhotos.length - i, height: CIRCLE_SIZE, width: CIRCLE_SIZE }}
          className="overflow-hidden rounded-full border border-white bg-gray-100"
        >
          <Image source={{ uri: item.imageUri }} className="h-full w-full" resizeMode="cover" />
        </View>
      ))}

      {hasOverflow && (
        <View
          style={{ marginLeft: -14, zIndex: 0, height: CIRCLE_SIZE, width: CIRCLE_SIZE }}
          className="items-center justify-center rounded-full border border-white bg-ink"
        >
          <Text className="text-xs font-bold text-white">+{overflowCount}</Text>
        </View>
      )}
    </View>
  );
}
