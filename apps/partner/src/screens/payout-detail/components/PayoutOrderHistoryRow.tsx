// One order line within a settlement's full history — day, order id,
// this order's net contribution. Same row shape the old inline breakdown
// used, just given a real list to live in instead of a card that had to
// shrink to fit it.

import { Text, View } from 'react-native';
import type { PayoutOrderLine } from '../../payouts/data';

interface Props {
  order: PayoutOrderLine;
  isLast: boolean;
}

export function PayoutOrderHistoryRow({ order, isLast }: Props) {
  return (
    <View className={`flex-row items-center justify-between py-3.5 ${isLast ? '' : 'border-b border-black/5'}`}>
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-gray-100">
          <Text className="text-[11px] font-semibold text-ink/60">{order.dayLabel}</Text>
        </View>
        <Text className="text-sm font-semibold text-ink">{order.orderId}</Text>
      </View>
      <Text className="text-sm font-semibold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
        ₹{order.amount.toLocaleString('en-IN')}
      </Text>
    </View>
  );
}
