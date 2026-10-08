// One active assignment in the Orders queue. Reads as a mini pickup→drop
// timeline (store node → customer node) with a status pill up top so a rider
// can scan the list and know, per card, where each order is without opening
// it. Payout stays the loudest thing on the card — it's what the rider is
// scanning for.

import { ArrowRight01Icon, Location01Icon, PackageIcon, Store01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { CollectCashBanner } from '../../../components/CollectCashBanner';
import { colors } from '../../../theme/tokens';
import type { RiderOrder } from '../../../data/mockOrders';

// Label + pill text color + soft tint per status. color drives the pill
// text; tint is the pill background. rgba built off the
// theme hex so a token change flows through (no separate tint token to
// drift). arrived_at_customer shares the in-progress success green — "at the
// drop, almost done". delivered is deliberately GRAY (not green): a finished
// order is history, it shouldn't compete for attention with a live one.
const STATUS_META: Record<RiderOrder['status'], { label: string; color: string; tint: string }> = {
  assigned: { label: 'At the store', color: colors.gold, tint: 'rgba(217,164,65,0.14)' },
  picked_up: { label: 'Delivering', color: colors.limeDeep, tint: 'rgba(124,181,24,0.14)' },
  arrived_at_customer: { label: 'At customer', color: colors.success, tint: 'rgba(46,158,119,0.14)' },
  delivered: { label: 'Delivered', color: `${colors.ink}70`, tint: 'rgba(16,28,16,0.06)' },
  cancelled: { label: 'Cancelled', color: colors.danger, tint: 'rgba(214,69,69,0.12)' },
};

interface Props {
  order: RiderOrder;
  onPress: () => void;
}

export function OrderQueueCard({ order, onPress }: Props) {
  const meta = STATUS_META[order.status];
  // Store node lights up gold only until pickup; once picked_up the pickup
  // leg is done, so it goes muted and the customer node carries the color.
  const storeDone = order.status !== 'assigned';

  return (
    <Pressable
      onPress={onPress}
      className="gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-black/5"
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-[15px] font-bold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
          {order.orderNumber}
        </Text>
        <View style={{ backgroundColor: meta.tint }} className="rounded-full px-2.5 py-1">
          <Text style={{ color: meta.color }} className="text-[11px] font-bold">{meta.label}</Text>
        </View>
      </View>

      {/* Pickup → drop timeline: two nodes joined by a short connector. */}
      <View>
        <View className="flex-row items-center gap-2.5">
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: storeDone ? `${colors.ink}25` : colors.gold }} />
          <AppIcon icon={Store01Icon} size={13} color={`${colors.ink}80`} />
          <Text className="flex-1 text-[13px] font-semibold text-ink" numberOfLines={1}>{order.storeName}</Text>
        </View>
        <View className="my-0.5 ml-[3px] h-3.5 w-px bg-ink/15" />
        <View className="flex-row items-center gap-2.5">
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.success }} />
          <AppIcon icon={Location01Icon} size={13} color={`${colors.ink}80`} />
          <Text className="flex-1 text-[13px] font-semibold text-ink" numberOfLines={1}>{order.customerName}</Text>
        </View>
      </View>

      <CollectCashBanner paymentMethod={order.paymentMethod} cashToCollect={order.cashToCollect} compact />

      <View className="flex-row items-center justify-between border-t border-ink/[0.06] pt-3">
        <View className="flex-row items-center gap-1.5">
          <AppIcon icon={PackageIcon} size={13} color={`${colors.ink}70`} />
          <Text className="text-[12.5px] font-semibold text-ink/60">{order.itemCount} items</Text>
          <View className="mx-1 h-3 w-px bg-ink/15" />
          <Text className="text-[12.5px] font-semibold text-ink/60" style={{ fontVariant: ['tabular-nums'] }}>
            {order.distanceKm} km
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Text className="text-[16px] font-bold text-ink" style={{ fontVariant: ['tabular-nums'] }}>₹{order.payout}</Text>
          <AppIcon icon={ArrowRight01Icon} size={15} color={colors.ink} />
        </View>
      </View>
    </Pressable>
  );
}
