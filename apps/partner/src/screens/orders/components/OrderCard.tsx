// One row in the order queue. Item-photo avatar stack (see
// ./ItemAvatarStack.tsx) instead of a single customer photo — it's the
// order's items being shown, not a person.
//
// A 'placed' order now has two distinct visual states, not one:
// - Pending (not yet acknowledged): "Order Pending" badge, a live
//   countdown to the 15-minute grace-window deadline (matches
//   useOrderExpiryWatcher.ts's ORDER_ACCEPT_WINDOW_MS — this chip and
//   that watcher read the same clock, so the number on screen is never
//   out of sync with when the order actually gets rejected), and exactly
//   two actions — Accept Order / Reject. No View Order here either —
//   there's nothing to view yet beyond what's already on the card, and
//   reject only stays available before the shop owner has committed to
//   the order (see below).
// - Accepted (acknowledged via useOrdersStore.acknowledgeOrder — a local
//   UI flag, not a status change, see that store's own note): "Accepted"
//   badge, no more countdown (the auto-reject safety net has stood down
//   for this order — useOrderExpiryWatcher.ts skips acknowledged ones),
//   and the actions become View Order + Mark Packed. Mark Packed is
//   still this app's one and only real status transition
//   (specs/02-partner-app/flows.md) — Accept never was.
//
// Reject disappears once accepted on purpose — backing out is a decision
// for before you've committed to an order, not after; declining a
// physically-packed order needs a different (currently unbuilt) flow, not
// a stray button on this card.
//
// 'packed'/'out_for_delivery' orders are read-only here beyond View
// Order. See ../data.ts's own note on why this app can display
// 'out_for_delivery' even though it can't trigger it.

import { ArrowRight01Icon, Cancel01Icon, CheckmarkCircle02Icon, Clock01Icon, DeliveryTruck01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import type { IconSvgElement } from '@hugeicons/react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { ORDER_ACCEPT_WINDOW_MS, formatRemainingTime } from '../../../features/order-expiry/orderExpiry';
import { useCountdownRemaining } from '../../../features/order-expiry/useCountdownRemaining';
import { useOrdersStore } from '../../../store/useOrdersStore';
import type { PartnerOrder, PartnerOrderStatus } from '../data';
import { ItemAvatarStack } from './ItemAvatarStack';

interface Props {
  order: PartnerOrder;
  onAcknowledge: (orderId: string) => void;
  onReject: (orderId: string) => void;
  onMarkPacked: (orderId: string) => void;
  onViewOrder: () => void;
}

const STATUS_BADGE: Partial<Record<PartnerOrderStatus, { label: string; icon: IconSvgElement; color: string }>> = {
  packed: { label: 'Awaiting pickup', icon: CheckmarkCircle02Icon, color: colors.limeDeep },
  out_for_delivery: { label: 'Out for delivery', icon: DeliveryTruck01Icon, color: colors.gold },
};

// Under 2 minutes left — the chip switches to the danger tint, the one
// moment this card should feel urgent rather than just informational.
const URGENT_THRESHOLD_MS = 2 * 60 * 1000;

export function OrderCard({ order, onAcknowledge, onReject, onMarkPacked, onViewOrder }: Props) {
  const itemsLabel = order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ');
  const isPlaced = order.status === 'placed';
  const isAccepted = useOrdersStore((state) => state.acknowledgedOrderIds.has(order.id));
  const isPending = isPlaced && !isAccepted;
  const badge = STATUS_BADGE[order.status];

  // Called unconditionally (hooks can't be conditional), but only ever
  // rendered while isPending below — useCountdownRemaining itself skips
  // setting an interval once its deadline is already in the past, so
  // accepted/packed/out_for_delivery cards don't tick uselessly either
  // way.
  const remainingMs = useCountdownRemaining(order.placedAtTimestamp + ORDER_ACCEPT_WINDOW_MS);
  const isUrgent = isPending && remainingMs <= URGENT_THRESHOLD_MS;

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
              <View
                className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${
                  isAccepted ? 'bg-lime/20' : 'bg-gold/15'
                }`}
              >
                <View className={`h-1.5 w-1.5 rounded-full ${isAccepted ? 'bg-lime' : 'bg-gold'}`} />
                <Text className={`text-sm font-medium ${isAccepted ? 'text-black' : 'text-ink/70'}`}>
                  {isAccepted ? 'Accepted' : 'Order Pending'}
                </Text>
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

        {isPending && (
          <View
            className={`flex-row items-center gap-1.5 rounded-xl px-4 py-2 ${isUrgent ? 'bg-danger/10' : 'bg-white'}`}
          >
            <AppIcon icon={Clock01Icon} size={13} color={isUrgent ? colors.danger : colors.limeDeep} />
            <Text
              className={`text-xs font-semibold ${isUrgent ? 'text-danger' : 'text-lime-deep'}`}
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {formatRemainingTime(remainingMs)}
            </Text>
          </View>
        )}

        {!isPlaced && badge && (
          <View className="flex-row items-center gap-1.5 rounded-xl bg-white px-4 py-2">
            <AppIcon icon={badge.icon} size={14} color={badge.color} />
            <Text className="text-xs font-medium text-ink/60">{badge.label}</Text>
          </View>
        )}
      </View>

      <View className="flex-row gap-2.5">
        {isPending ? (
          <>
            {/* Reject stays narrow (flex-1) — Accept is the dominant,
                taller, fully-rounded action (flex-[2]) — only in this
                pending state; once accepted the row below reverts to the
                original View Order/Mark Packed split untouched. Solid
                limeDeep, not a gradient — the shadow is what carries the
                "premium" read here, not a color blend. */}
            <Pressable
              onPress={() => onReject(order.id)}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white py-3"
            >
              <AppIcon icon={Cancel01Icon} size={13} color={colors.danger} />
              <Text className="text-sm font-medium text-danger">Reject</Text>
            </Pressable>

            <Pressable
              onPress={() => onAcknowledge(order.id)}
              className="flex-[2] flex-row items-center justify-center gap-1.5 rounded-xl bg-lime-deep py-3.5"
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <AppIcon icon={CheckmarkCircle02Icon} size={14} color="#FFFFFF" />
              <Text className="text-sm font-medium text-white">Accept Order</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={onViewOrder}
              className={`flex-row items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white py-3 ${
                isAccepted ? 'flex-1' : 'w-full'
              }`}
            >
              <Text className="text-sm font-medium text-black">View Order</Text>
              <AppIcon icon={ArrowRight01Icon} size={13} color={colors.ink} />
            </Pressable>

            {isAccepted && (
              <Pressable
                onPress={() => onMarkPacked(order.id)}
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-ink py-3"
              >
                <AppIcon icon={CheckmarkCircle02Icon} size={14} color="#FFFFFF" />
                <Text className="text-sm font-medium text-white">Mark Packed</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </View>
  );
}
