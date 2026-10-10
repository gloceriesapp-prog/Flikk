// The active-delivery card a rider glances at mid-shift — premium white card
// on the gray home surface. Whole card taps into OrderDetail; the one nested
// interactive control is the coral "Navigate" CTA, which hands off to the
// rider's real maps app (openNavigation) for turn-by-turn.
//
// The route line (store dot / dashed connector / customer pin) is the exact
// visual every courier app uses so "where do I go" reads instantly. The
// Navigate button is leg-aware: before pickup it routes to the STORE, after
// pickup to the CUSTOMER — the same next-stop a rider actually needs.

import { ArrowRight01Icon, MapPinIcon, Navigation03Icon, PackageIcon, Store01Icon } from '@hugeicons/core-free-icons';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { CollectCashBanner } from '../../../components/CollectCashBanner';
import { colors } from '../../../theme/tokens';
import { openNavigation } from '../../../location/openNavigation';
import type { RiderOrder } from '../../../data/mockOrders';

// Status pill copy + NativeWind class per status (pill bg / text / dot). Class
// strings live here literally so NativeWind's content scan compiles them even
// though they're interpolated into className. delivered/cancelled never reach
// the active list, but the map stays total so the type is exhaustive (no `any`,
// no default case). Non-brand tints (amber picked_up, soft greens/reds) use
// arbitrary hex; brand tints use the named tokens from tailwind.config.js.
const STATUS: Record<RiderOrder['status'], { label: string; pill: string; text: string; dot: string }> = {
  assigned: { label: 'Pick up order', pill: 'bg-lime-soft', text: 'text-lime-deep', dot: 'bg-lime-deep' },
  picked_up: { label: 'Delivering', pill: 'bg-[#FDF3D9]', text: 'text-[#B47D0A]', dot: 'bg-[#B47D0A]' },
  arrived_at_customer: { label: 'At customer', pill: 'bg-[#E3F4EC]', text: 'text-success', dot: 'bg-success' },
  delivered: { label: 'Delivered', pill: 'bg-mist', text: 'text-ink', dot: 'bg-ink' },
  cancelled: { label: 'Cancelled', pill: 'bg-[#FBE5E5]', text: 'text-danger', dot: 'bg-danger' },
};

interface Props {
  order: RiderOrder;
  onPress: () => void;
}

export const ActiveDeliveryCard = memo(function ActiveDeliveryCard({ order, onPress }: Props) {
  const status = STATUS[order.status];
  // Leg-aware Navigate target: heading to the store until picked up, to the
  // customer after. delivered/cancelled aren't shown here.
  const goingToStore = order.status === 'assigned';
  const navTarget = goingToStore ? order.storeCoords : order.customerCoords;
  const navLabel = goingToStore ? order.storeName : order.customerName;

  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm shadow-black/5"
    >
      <View className="gap-3.5 p-4">
        <View className="flex-row items-center justify-between">
          <View className={`flex-row items-center gap-1.5 rounded-full px-3 py-1 ${status.pill}`}>
            <View className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            <Text className={`text-[13px] font-semibold ${status.text}`}>
              {status.label}
            </Text>
          </View>
          <Text className="text-[13px] font-semibold text-ink/40">Order ID: {order.orderNumber}</Text>
        </View>

        {/* Route: store (lime) → dashed connector → customer (coral pin). */}
        <View className="flex-row gap-3">
          <View className="w-7 items-center py-1">
            <View className="h-7 w-7 items-center justify-center rounded-full bg-lime-soft">
              <AppIcon icon={Store01Icon} size={15} color={colors.limeDeep} />
            </View>
            <View className="w-0 flex-1 border-l-2 border-dashed border-[#D9DEDD] my-[3px]" />
            <View className="h-7 w-7 items-center justify-center rounded-full bg-[#FFE9E3]">
              <AppIcon icon={MapPinIcon} size={15} color={colors.coral} />
            </View>
          </View>
          <View className="flex-1 justify-between gap-3">
            <View>
              <Text className="text-[14px] font-semibold text-ink" numberOfLines={1}>
                {order.storeName}
              </Text>
              <Text className="mt-0.5 text-[13px] text-ink/45 font-medium" numberOfLines={1}>
                {order.storeAddress}
              </Text>
            </View>
            <View>
              <Text className="text-[14px] font-semibold text-ink" numberOfLines={1}>
                {order.customerName}
              </Text>
              <Text className="mt-0.5 text-[12px] text-ink/45 font-medium" numberOfLines={1}>
                {order.landmark ? `${order.customerAddress} · ${order.landmark}` : order.customerAddress}
              </Text>
            </View>
          </View>
        </View>

        <CollectCashBanner paymentMethod={order.paymentMethod} cashToCollect={order.cashToCollect} compact />

        <View className="flex-row items-center justify-between border-t border-mist pt-3">
          <View className="flex-row items-center gap-2">
            <AppIcon icon={PackageIcon} size={14} color={`${colors.ink}80`} />
            <Text className="text-[12.5px] font-medium text-ink/60">
              {order.itemCount} items · {order.distanceKm} km
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Text className="text-[15px] font-extrabold text-ink tabular-nums">₹{order.payout}</Text>
            <AppIcon icon={ArrowRight01Icon} size={16} color={colors.ink} />
          </View>
        </View>
      </View>

      {/* Navigate CTA — coral is the only CTA color (CLAUDE.md). Own Pressable
          so the tap opens maps instead of bubbling to the card's OrderDetail.
          Pure NativeWind: arbitrary coral + active: variant for the pressed
          state, no style prop (a style FUNCTION can't merge with className and
          was dropping the bg). Icon-only, compact. */}
      {/* <Pressable
        onPress={() => void openNavigation(navTarget, navLabel)}
        className="h-11 flex-row items-center justify-center bg-[#FF6B4A] active:bg-[#E8543A]"
      >
        <AppIcon icon={Navigation03Icon} size={18} color="#000000" />
      </Pressable> */}
    </Pressable>
  );
});
