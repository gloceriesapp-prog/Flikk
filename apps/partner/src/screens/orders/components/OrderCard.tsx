// One row in the order queue. Item-photo avatar stack (see
// ./ItemAvatarStack.tsx) instead of a single customer photo — it's the
// order's items being shown, not a person.
//
// Every card gets a "View Order" button, opening OrderDetailScreen (P3) —
// replaces the earlier "Reject" button that lived directly on the card.
// Reject now lives inside the detail screen instead (a confirm-before-you-
// commit flow reads better for a destructive action than a quick tap in a
// scrolling list) — see order-detail/OrderDetailScreen.tsx for that and
// its own note on why Reject stays visual-only regardless of where it
// lives (specs/02-partner-app/flows.md's acceptance criteria: "Partner app
// triggers no status transition other than `packed`"). "Accept Order" is
// this app's real and only transition — the same "Mark Packed" action,
// labeled to match the reference, since this app has no separate accept
// step: packing an order *is* accepting it. Only shown for orders still
// needing that action.
//
// 'out_for_delivery' orders are read-only here — just a status badge and
// View Order. See ../data.ts's own note on why this app can display that
// state even though it can't trigger it.

import { ArrowRight01Icon, CheckmarkCircle02Icon, Clock01Icon, DeliveryTruck01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import type { IconSvgElement } from '@hugeicons/react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { PartnerOrder, PartnerOrderStatus } from '../data';
import { ItemAvatarStack } from './ItemAvatarStack';

interface Props {
  order: PartnerOrder;
  onMarkPacked: (orderId: string) => void;
  onViewOrder: () => void;
}

const STATUS_BADGE: Partial<Record<PartnerOrderStatus, { label: string; icon: IconSvgElement; color: string }>> = {
  packed: { label: 'Awaiting pickup', icon: CheckmarkCircle02Icon, color: colors.limeDeep },
  out_for_delivery: { label: 'Out for delivery', icon: DeliveryTruck01Icon, color: colors.gold },
};

export function OrderCard({ order, onMarkPacked, onViewOrder }: Props) {
  const itemsLabel = order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ');
  const isPlaced = order.status === 'placed';
  const badge = STATUS_BADGE[order.status];

  return (
    <View className="gap-3 rounded-3xl bg-[#F9FAFB] p-4 shadow-sm shadow-black/5">
      <View className="flex-row items-center gap-3">
        <ItemAvatarStack items={order.items} />

        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-[14px] font-medium text-ink" numberOfLines={1}>
              {order.customerName}
            </Text>
            {isPlaced && (
              <View className="flex-row items-center gap-1.5 rounded-full bg-coral px-2.5 py-1">
                <View className="h-1.5 w-1.5 rounded-full bg-white" />
                <Text className="text-[10px] font-bold text-white">New</Text>
              </View>
            )}
          </View>
          <Text className="text-sm font-medium text-ink/70">{order.id}</Text>
        </View>
      </View>

      <Text className="text-sm text-ink/70" numberOfLines={2}>
        <Text className="font-medium text-ink/80">Items: </Text>
        {itemsLabel}
      </Text>

      <View className="flex-row items-center justify-between border-t border-black/5 pt-3">
        <View className="flex-row items-center gap-1.5">
          <AppIcon icon={Clock01Icon} size={13} color={`${colors.ink}80`} />
          <Text className="text-sm font-medium text-ink/80">{order.placedAtLabel}</Text>
          <Text className="text-sm font-semibold text-ink/30">·</Text>
          <Text className="text-sm font-semibold text-ink/80">₹{order.total}</Text>
        </View>

        {badge && (
          <View className="flex-row items-center gap-1.5 rounded-xl bg-white px-4 py-2">
            <AppIcon icon={badge.icon} size={14} color={badge.color} />
            <Text className="text-xs font-bold text-ink/60">{badge.label}</Text>
          </View>
        )}
      </View>

      <View className="flex-row gap-2.5">
        <Pressable
          onPress={onViewOrder}
          className={`flex-row items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white py-3 ${
            isPlaced ? 'flex-1' : 'w-full'
          }`}
        >
          <Text className="text-xs font-bold text-ink">View Order</Text>
          <AppIcon icon={ArrowRight01Icon} size={13} color={colors.ink} />
        </Pressable>

        {isPlaced && (
          <Pressable
            onPress={() => onMarkPacked(order.id)}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-ink py-3"
          >
            <AppIcon icon={CheckmarkCircle02Icon} size={14} color="#FFFFFF" />
            <Text className="text-xs font-bold text-white">Accept Order</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
