// One row in "Past Orders" — same avatar-stack + one-line-items pattern as
// LiveOrderCard, but flat/neutral (gray, not gradient) since these are
// resolved, not actionable. No CTA — a delivered order has nothing left to
// track.

import { Text, View } from 'react-native';
import type { PurchaseOrder } from '../data';
import { ItemAvatarStack } from './ItemAvatarStack';

interface Props {
  order: PurchaseOrder;
}

export function PastOrderCard({ order }: Props) {
  const itemsLabel = order.items.map((item) => item.name).join(', ');

  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <ItemAvatarStack items={order.items} />

      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-bold text-ink" numberOfLines={1}>
            {order.storeName}
          </Text>
          <Text className="text-sm font-extrabold text-ink">₹{order.total}</Text>
        </View>
        <Text className="mt-0.5 text-xs font-medium text-ink/50" numberOfLines={1} ellipsizeMode="tail">
          {itemsLabel}
        </Text>
        <Text className="mt-1 text-[11px] font-semibold text-success">{order.statusLabel} · {order.placedAtLabel}</Text>
      </View>
    </View>
  );
}
