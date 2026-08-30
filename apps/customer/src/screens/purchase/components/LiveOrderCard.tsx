// Active-order card for the Purchase tab's "Live Order" section — item
// photos (ItemAvatarStack) on the left, order status/items/CTA on the
// right. Replaces the old OnTheWayCard: that version had no item photos
// and a flat lime-soft fill; this one uses a warm gradient wash (still
// brand lime, just richer) for the "premium" card feel that was asked for.
//
// Item names join into one line and truncate with numberOfLines — RN's own
// ellipsis, not a hand-rolled "..." string, so it degrades correctly at any
// width instead of a fixed cutoff.

import { ArrowRight01Icon, CheckmarkCircle02Icon, DeliveryTruck01Icon, Store01Icon } from '@hugeicons/core-free-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { PurchaseOrder } from '../data';
import { ItemAvatarStack } from './ItemAvatarStack';

interface Props {
  order: PurchaseOrder;
  onTrackOrder: () => void;
}

// order.status is real now (api/orders.ts, GET /orders) — this used to be
// a hardcoded "Your order is out for delivery" string regardless of what
// statusLabel actually said, misleading the moment a real order hadn't
// reached that stage yet (a 'placed' or 'packed' order still showed the
// out-for-delivery headline).
const STATUS_HEADLINE: Record<PurchaseOrder['status'], string> = {
  placed: 'Your order has been placed',
  packed: 'Your order is being packed',
  out_for_delivery: 'Your order is out for delivery',
  delivered: 'Your order has been delivered',
  cancelled: 'Your order was cancelled',
};

const STATUS_ICON = { placed: CheckmarkCircle02Icon, packed: Store01Icon, out_for_delivery: DeliveryTruck01Icon, delivered: CheckmarkCircle02Icon, cancelled: CheckmarkCircle02Icon };

export function LiveOrderCard({ order, onTrackOrder }: Props) {
  const itemsLabel = order.items.map((item) => item.name).join(', ');

  return (
    <View className="overflow-hidden rounded-3xl shadow-md shadow-black/10">
      {/* LinearGradient isn't one of NativeWind's auto-patched components —
          className is silently ignored, so positioning goes through style,
          same gotcha as elsewhere in this app. */}
      <LinearGradient
        colors={['#EEF7DC', '#FBFDF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View className="gap-3 p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5 rounded-full bg-lime-deep px-3 py-1">
            <View className="h-1.5 w-1.5 rounded-full bg-white" />
            <Text className="text-xs font-semibold text-white">{order.statusLabel}</Text>
          </View>
          <View className="h-8 w-8 items-center justify-center rounded-full bg-white">
            <AppIcon icon={STATUS_ICON[order.status]} size={18} color={colors.limeDeep} />
          </View>
        </View>

        <View className="flex-row items-center gap-3">
          <ItemAvatarStack items={order.items} />

          <View className="flex-1">
            <Text className="text-lg font-semibold text-ink" numberOfLines={1}>
              {STATUS_HEADLINE[order.status]}
            </Text>
            <Text className="text-sm font-medium text-ink/55" numberOfLines={1} ellipsizeMode="tail">
              {itemsLabel}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onTrackOrder}
          className="flex-row items-center justify-center gap-1.5 rounded-2xl bg-ink py-3.5"
        >
          <Text className="text-base font-semibold text-white">Track Order</Text>
          <AppIcon icon={ArrowRight01Icon} size={15} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}
