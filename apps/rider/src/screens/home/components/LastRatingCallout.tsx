// "Customer rated your last delivery ★5" — surfaces the mock rating
// useRiderOrdersStore already generates on delivery (generateMockRating in
// data/mockOrders.ts) but never showed anywhere before. Reads
// completedOrders[0] directly — the store always prepends the most recent
// delivery, so no separate "latest" lookup needed.

import { StarIcon } from '@hugeicons/core-free-icons';
import { Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { RiderOrder } from '../../../data/mockOrders';

interface Props {
  order: RiderOrder;
}

export function LastRatingCallout({ order }: Props) {
  if (!order.customerRating) return null;

  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3.5">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-gold/15">
        <AppIcon icon={StarIcon} size={16} color={colors.gold} />
      </View>
      <Text className="flex-1 text-[13px] font-semibold text-ink">
        Customer rated your last delivery {'★'.repeat(order.customerRating)}
      </Text>
    </View>
  );
}
