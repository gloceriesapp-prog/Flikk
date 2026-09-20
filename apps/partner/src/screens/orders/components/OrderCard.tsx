import { ArrowRight01Icon, CheckmarkCircle02Icon, Clock01Icon, DeliveryTruck01Icon, Time03Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { useEffect } from 'react';
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
  onMarkPacked: (orderId: string) => void;
  onViewOrder: () => void;
}

const STATUS_BADGE: Partial<Record<PartnerOrderStatus, { label: string; icon: IconSvgElement; color: string }>> = {
  packed: { label: 'Awaiting pickup', icon: CheckmarkCircle02Icon, color: colors.limeDeep },
  out_for_delivery: { label: 'Out for delivery', icon: DeliveryTruck01Icon, color: colors.gold },
};

// Three-tier urgency on the 10-minute accept window (ORDER_ACCEPT_WINDOW_MS)
// — green for most of it, amber once under half remains, red for the last
// 2 minutes. Real thresholds against the same window everywhere else in
// this feature already uses (orderExpiry.ts), not independently invented
// ones.
const URGENT_THRESHOLD_MS = 2 * 60 * 1000;
const WARNING_THRESHOLD_MS = 5 * 60 * 1000;
const MAX_ACCEPT_MINUTES = 10;

type UrgencyTier = 'urgent' | 'warning' | 'safe';

function urgencyTier(remainingMs: number): UrgencyTier {
  if (remainingMs <= URGENT_THRESHOLD_MS) return 'urgent';
  if (remainingMs <= WARNING_THRESHOLD_MS) return 'warning';
  return 'safe';
}

const TIMER_STYLE: Record<UrgencyTier, { bg: string; text: string; icon: string }> = {
  urgent: { bg: 'bg-danger/10', text: 'text-danger', icon: colors.danger },
  warning: { bg: 'bg-gold/15', text: 'text-gold', icon: colors.gold },
  safe: { bg: 'bg-success/10', text: 'text-success', icon: colors.success },
};

export function OrderCard({ order, onAcknowledge, onMarkPacked, onViewOrder }: Props) {
  const isPlaced = order.status === 'placed';
  const isAccepted = useOrdersStore((state) => state.acknowledgedOrderIds.has(order.id));
  const rejectOrder = useOrdersStore((state) => state.rejectOrder);
  const isPending = isPlaced && !isAccepted;
  const badge = STATUS_BADGE[order.status];

  const isOrderAcceptedOrBeyond = !isPending;
  const totalItemTypes = order.items.length;

  // Item Label Summary (up to 2 items + "& N more")
  const itemsLabel = isOrderAcceptedOrBeyond
    ? order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')
    : totalItemTypes > 2
      ? `${order.items[0].quantity}x ${order.items[0].name}, ${order.items[1].quantity}x ${order.items[1].name} & ${totalItemTypes - 2} more`
      : order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ');

  const remainingMs = useCountdownRemaining(order.placedAtTimestamp + ORDER_ACCEPT_WINDOW_MS);
  const timerStyle = TIMER_STYLE[urgencyTier(remainingMs)];

  // --- Dynamic Time Elapsed Calculation ---
  const timeElapsedMs = Math.max(0, Date.now() - order.placedAtTimestamp);
  const elapsedMinutes = Math.floor(timeElapsedMs / (1000 * 60));

  let placedTimeDisplay = order.placedAtLabel;

  if (isPending) {
    if (elapsedMinutes < 1) {
      placedTimeDisplay = 'Just now';
    } else if (elapsedMinutes <= MAX_ACCEPT_MINUTES) {
      placedTimeDisplay = `${elapsedMinutes} ${elapsedMinutes === 1 ? 'min' : 'mins'} ago`;
    } else {
      placedTimeDisplay = 'Cancelled';
    }
  }

  // Automatically trigger cancellation when 10 minutes pass without acceptance
  useEffect(() => {
    if (isPending && elapsedMinutes > MAX_ACCEPT_MINUTES) {
      rejectOrder(order.id);
    }
  }, [isPending, elapsedMinutes, order.id, rejectOrder]);

  return (
    <View className="gap-3 rounded-3xl bg-white p-4 shadow-sm shadow-black/5">
      <View className="flex-row items-center gap-3">
        <ItemAvatarStack items={order.items} />

        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-[15px] font-medium text-ink" numberOfLines={1}>
              {order.customerName}
            </Text>
            {isPlaced && (
              <View
                className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${isAccepted ? 'bg-lime/20' : 'bg-gold/15'
                  }`}
              >
                <View className={`h-1.5 w-1.5 rounded-full ${isAccepted ? 'bg-lime' : 'bg-gold'}`} />
                <Text className={`text-sm font-medium ${isAccepted ? 'text-black' : 'text-ink/70'}`}>
                  {isAccepted ? 'Accepted' : 'Pending'}
                </Text>
              </View>
            )}
          </View>
          <Text className="text-[13px] font-medium text-ink/70">{order.orderNumber}</Text>
        </View>
      </View>

      {/* Item Summary View */}
      <Text className="text-[13px] text-ink/70" numberOfLines={2}>
        <Text className="font-medium text-ink/80">Items: </Text>
        {itemsLabel}
      </Text>

      <View className="flex-row items-center justify-between border-t border-black/5 pt-3">
        <View className="flex-row items-center gap-1.5">
          <AppIcon icon={Time03Icon} size={13} color={`${colors.ink}90`} />
          {/* Dynamic Time Elapsed Label */}
          <Text className="text-[13px] font-medium text-ink/80">{placedTimeDisplay}</Text>
          <Text className="text-[13px] font-semibold text-ink/30">·</Text>
          <Text className="text-[13px] font-semibold text-ink/80">₹{order.total}</Text>
        </View>

        {isPending && (
          <View className={`flex-row items-center gap-1.5 rounded-xl px-4 py-2 ${timerStyle.bg}`}>
            <AppIcon icon={Clock01Icon} size={13} color={timerStyle.icon} />
            <Text className={`text-[11.5px] font-semibold ${timerStyle.text}`} style={{ fontVariant: ['tabular-nums'] }}>
              {formatRemainingTime(remainingMs)}
            </Text>
          </View>
        )}

        {!isPlaced && badge && (
          <View className="flex-row items-center gap-1.5 rounded-xl bg-gray-50 px-4 py-2">
            <AppIcon icon={badge.icon} size={14} color={badge.color} />
            <Text className="text-xs font-medium text-ink/60">{badge.label}</Text>
          </View>
        )}
      </View>

      <View className="flex-row gap-2.5">
        {isPending ? (
          <Pressable
            onPress={() => onAcknowledge(order.id)}
            className="w-full flex-row items-center justify-center gap-1.5 rounded-xl bg-lime-deep py-3.5"
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <Text className="text-[14px] font-medium text-white">Accept Order</Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={onViewOrder}
              className={`flex-row items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white py-3 ${isAccepted ? 'flex-1' : 'w-full'
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