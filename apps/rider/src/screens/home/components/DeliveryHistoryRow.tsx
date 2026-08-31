// One compact row for a completed or cancelled order — same shape
// OrdersScreen's own "Delivered today" list already uses, pulled out here
// so Home's filtered list (FilterChipRow) can show the same rows without
// copy-pasting the JSX a third time.

import { CancelCircleIcon, CheckmarkCircle02Icon, StarIcon } from '@hugeicons/core-free-icons';
import { Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { RiderOrder } from '../../../data/mockOrders';

interface Props {
  order: RiderOrder;
}

export function DeliveryHistoryRow({ order }: Props) {
  const isCancelled = order.status === 'cancelled';
  // Total shown here is fare + tip — same "true take-home per order"
  // total EarningsScreen's own per-delivery rows show, not just the fare.
  const total = order.payout + (order.tip ?? 0);

  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4">
      <AppIcon
        icon={isCancelled ? CancelCircleIcon : CheckmarkCircle02Icon}
        size={18}
        color={isCancelled ? colors.danger : colors.success}
      />
      <View className="flex-1">
        <Text className="text-[13px] font-semibold text-ink">{order.orderNumber}</Text>
        <Text className="text-[12px] text-ink/45" numberOfLines={1}>
          {isCancelled ? order.cancelReason ?? 'Cancelled' : order.customerName}
        </Text>
      </View>
      {!isCancelled && order.customerRating ? (
        <View className="flex-row items-center gap-1">
          <AppIcon icon={StarIcon} size={12} color={colors.gold} />
          <Text className="text-[12px] font-semibold text-ink/60">{order.customerRating}</Text>
        </View>
      ) : null}
      <Text className={`ml-3 text-[13px] font-bold ${isCancelled ? 'text-ink/30' : 'text-ink'}`}>₹{total}</Text>
    </View>
  );
}
