// Overlapping item-photo circles, replacing the earlier single customer
// avatar (that photo had nothing to do with the order itself). 1 item
// shows 1 circle, 2 items show 2, 3+ always caps at 3 — same rule as
// apps/customer's own ItemAvatarStack, copied here rather than shared
// (see specs/00-foundation/repo-structure.md on why there's no
// /packages/shared yet). No border ring this time (an explicit ask) — a
// soft mist background behind each circle does the separation work
// instead, since there's no per-product photo yet to make the border
// necessary for contrast.

import { Image, View } from 'react-native';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import type { OrderLineItem } from '../data';

const MAX_AVATARS = 3;

interface Props {
  items: OrderLineItem[];
}

export function ItemAvatarStack({ items }: Props) {
  const visibleItems = items.slice(0, MAX_AVATARS);

  return (
    <View className="flex-row">
      {visibleItems.map((item, i) => (
        <View
          key={item.name}
          style={{ marginLeft: i === 0 ? 0 : -14, zIndex: visibleItems.length - i }}
          className="h-12 w-12 overflow-hidden rounded-full bg-white"
        >
          <Image source={{ uri: PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
        </View>
      ))}
    </View>
  );
}
