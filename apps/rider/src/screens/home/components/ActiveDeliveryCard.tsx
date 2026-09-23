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
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { openNavigation } from '../../../location/openNavigation';
import type { RiderOrder } from '../../../data/mockOrders';

// Status pill copy + tint. delivered/cancelled never reach the active list, but
// the map stays total so the type is exhaustive (no `any`, no default case).
const STATUS: Record<RiderOrder['status'], { label: string; tint: string; bg: string }> = {
  assigned: { label: 'Pick up order', tint: colors.limeDeep, bg: colors.limeSoft },
  picked_up: { label: 'Delivering', tint: '#B47D0A', bg: '#FDF3D9' },
  arrived_at_customer: { label: 'At customer', tint: colors.success, bg: '#E3F4EC' },
  delivered: { label: 'Delivered', tint: colors.ink, bg: colors.mist },
  cancelled: { label: 'Cancelled', tint: colors.danger, bg: '#FBE5E5' },
};

interface Props {
  order: RiderOrder;
  onPress: () => void;
}

export function ActiveDeliveryCard({ order, onPress }: Props) {
  const status = STATUS[order.status];
  // Leg-aware Navigate target: heading to the store until picked up, to the
  // customer after. delivered/cancelled aren't shown here.
  const goingToStore = order.status === 'assigned';
  const navTarget = goingToStore ? order.storeCoords : order.customerCoords;
  const navLabel = goingToStore ? order.storeName : order.customerName;
  const navText = goingToStore ? 'Navigate to store' : 'Navigate to customer';

  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm shadow-black/5"
    >
      <View className="gap-3.5 p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5 rounded-full px-3 py-1" style={{ backgroundColor: status.bg }}>
            <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.tint }} />
            <Text className="text-[11px] font-bold" style={{ color: status.tint }}>
              {status.label}
            </Text>
          </View>
          <Text className="text-[12px] font-semibold text-ink/40">{order.orderNumber}</Text>
        </View>

        {/* Route: store (lime) → dashed connector → customer (coral pin). */}
        <View className="flex-row gap-3">
          <View className="items-center py-1" style={{ width: 28 }}>
            <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: colors.limeSoft }}>
              <AppIcon icon={Store01Icon} size={15} color={colors.limeDeep} />
            </View>
            <View style={{ flex: 1, width: 0, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: '#D9DEDD', marginVertical: 3 }} />
            <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: '#FFE9E3' }}>
              <AppIcon icon={MapPinIcon} size={15} color={colors.coral} />
            </View>
          </View>
          <View className="flex-1 justify-between gap-3">
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
            <Text className="text-[15px] font-extrabold text-ink tabular-nums">₹{order.payout}</Text>
            <AppIcon icon={ArrowRight01Icon} size={16} color={colors.ink} />
          </View>
        </View>
      </View>

      {/* Navigate CTA — coral is the only CTA color (CLAUDE.md). Own Pressable
          so the tap opens maps instead of bubbling to the card's OrderDetail. */}
      <Pressable
        onPress={() => void openNavigation(navTarget, navLabel)}
        className="h-12 flex-row items-center justify-center gap-2"
        style={({ pressed }) => ({ backgroundColor: pressed ? '#E8543A' : colors.coral })}
      >
        <AppIcon icon={Navigation03Icon} size={17} color="#FFFFFF" />
        <Text className="text-[14px] font-bold text-white">{navText}</Text>
      </Pressable>
    </Pressable>
  );
}
