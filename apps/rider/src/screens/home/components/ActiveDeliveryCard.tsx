// Replaces the old one-line ActiveOrderBanner with a real trip card — the
// pickup→drop route line (dot/dashed-line/dot) is the exact visual real
// courier apps (Swiggy/Zomato/Uber driver) use for an in-progress
// delivery, since a rider scanning this needs "where do I go" to read
// instantly, not just an order number. Whole card is one tap into
// OrderDetail; nothing here is a separate interactive control.

import { ArrowRight01Icon, PackageIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { RiderOrder } from '../../../data/mockOrders';

const STATUS_LABEL: Record<RiderOrder['status'], string> = {
  assigned: 'Pick up order',
  picked_up: 'Delivering',
  arrived_at_customer: 'At customer',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

interface Props {
  order: RiderOrder;
  onPress: () => void;
}

export function ActiveDeliveryCard({ order, onPress }: Props) {
  return (
    <Pressable onPress={onPress} className="gap-3.5 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm shadow-black/5">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5 rounded-full bg-lime-soft px-3 py-1">
          <View className="h-1.5 w-1.5 rounded-full bg-lime-deep" />
          <Text className="text-[11px] font-bold text-lime-deep">{STATUS_LABEL[order.status]}</Text>
        </View>
        <Text className="text-[12px] font-semibold text-ink/40">{order.orderNumber}</Text>
      </View>

      {/* Route line — dot / dashed connector / dot, same recipe every
          courier app uses for a pickup->drop trip summary. */}
      <View className="flex-row gap-3">
        <View className="items-center py-0.5" style={{ width: 12 }}>
          <View className="h-2.5 w-2.5 rounded-full bg-lime-deep" />
          <View style={{ flex: 1, width: 0, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: '#D9DEDD', marginVertical: 4 }} />
          <View className="h-2.5 w-2.5 rounded-full bg-coral" />
        </View>
        <View className="flex-1 justify-between gap-4">
          <View>
            <Text className="text-[14px] font-bold text-ink" numberOfLines={1}>
              {order.storeName}
            </Text>
            <Text className="mt-0.5 text-[12px] text-ink/45" numberOfLines={1}>
              {order.storeAddress}
            </Text>
          </View>
          <View>
            <Text className="text-[14px] font-bold text-ink" numberOfLines={1}>
              {order.customerName}
            </Text>
            <Text className="mt-0.5 text-[12px] text-ink/45" numberOfLines={1}>
              {order.customerAddress}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-center justify-between border-t border-mist pt-3">
        <View className="flex-row items-center gap-2">
          <AppIcon icon={PackageIcon} size={14} color={`${colors.ink}80`} />
          <Text className="text-[12.5px] font-medium text-ink/60">
            {order.itemCount} items · {order.distanceKm} km
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Text className="text-[15px] font-extrabold text-ink">₹{order.payout}</Text>
          <AppIcon icon={ArrowRight01Icon} size={16} color={colors.ink} />
        </View>
      </View>
    </Pressable>
  );
}
