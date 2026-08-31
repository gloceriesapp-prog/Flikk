import { ArrowRight01Icon, PackageIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { RiderOrder } from '../../../data/mockOrders';

const STATUS_LABEL: Record<RiderOrder['status'], string> = {
  assigned: 'Head to store',
  arrived_at_store: 'At the store',
  picked_up: 'Delivering',
  arrived_at_customer: 'At customer',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

interface Props {
  order: RiderOrder;
  onPress: () => void;
}

export function OrderQueueCard({ order, onPress }: Props) {
  return (
    <Pressable onPress={onPress} className="gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-black/5">
      <View className="flex-row items-center justify-between">
        <Text className="text-[15px] font-bold text-ink">{order.orderNumber}</Text>
        <View className="rounded-full bg-lime-soft px-2.5 py-1">
          <Text className="text-[11px] font-bold text-lime-deep">{STATUS_LABEL[order.status]}</Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        <AppIcon icon={PackageIcon} size={14} color={colors.ink} />
        <Text className="flex-1 text-[13px] text-ink/60" numberOfLines={1}>
          {order.storeName} → {order.customerName}
        </Text>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-[13px] font-semibold text-ink/70">{order.itemCount} items · {order.distanceKm} km</Text>
        <View className="flex-row items-center gap-1">
          <Text className="text-[15px] font-bold text-ink">₹{order.payout}</Text>
          <AppIcon icon={ArrowRight01Icon} size={15} color={colors.ink} />
        </View>
      </View>
    </Pressable>
  );
}
