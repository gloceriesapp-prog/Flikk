import { Alert02Icon, ArrowRight01Icon, CheckmarkCircle02Icon, Clock01Icon, DeliveryTruck01Icon, Time03Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { useEffect } from 'react';
import type { IconSvgElement } from '@hugeicons/react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { ORDER_ACCEPT_WINDOW_MS, formatRemainingTime } from '../../../features/order-expiry/orderExpiry';
import { useNow } from '../../../features/order-expiry/useCountdownRemaining';
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
  delivered: { label: 'Delivered', icon: CheckmarkCircle02Icon, color: colors.success },
  // Danger token — the only terminal-negative state on a card. Rider
  // couldn't complete the drop; stock left the shop and didn't land.
  failed: { label: 'Delivery failed', icon: Alert02Icon, color: colors.danger },
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

  const now = useNow();
  const remainingMs = Math.max(0, order.placedAtTimestamp + ORDER_ACCEPT_WINDOW_MS - now);
  const timerStyle = TIMER_STYLE[urgencyTier(remainingMs)];

  // --- Dynamic Time Elapsed Calculation ---
  const timeElapsedMs = Math.max(0, now - order.placedAtTimestamp);
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
    // Whole card opens the order detail screen — but only once accepted.
    // A still-pending card's only real action is the Accept Order button;
    // making the rest of the card tappable too would let a store owner
    // accidentally jump to the detail screen before ever deciding to
    // accept. The Accept/Mark Packed/View Order Pressables below are
    // nested inside this one; RN's touch-responder system gives the
    // innermost Pressable priority, so tapping one of those still only
    // fires its own action and never also navigates.
    <Pressable
      onPress={isPending ? undefined : onViewOrder}
      disabled={isPending}
      className="gap-3 rounded-3xl bg-white p-4 shadow-sm shadow-black/5"
      style={({ pressed }) => ({ opacity: pressed && !isPending ? 0.97 : 1 })}
    >
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

      <View className="flex-row items-center justify-between border-t border-black/5 pt-4">
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
          <View className="flex-row items-center gap-1.5">
            <AppIcon icon={badge.icon} size={14} color={badge.color} />
            <Text className="text-[13px] font-medium text-ink/70">{badge.label}</Text>
          </View>
        )}
      </View>

      <View className="flex-row gap-2.5">
        {isPending ? (
          // Real green (success token) — distinct from the black/coral
          // actions below it, so accepting reads as its own unmistakable
          // state, not just "a button of some color".
          <Pressable
            onPress={() => onAcknowledge(order.id)}
            className="w-full flex-row items-center justify-center gap-1.5 rounded-xl bg-[#00a63e] py-3.5"
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <Text className="text-[14px] font-medium text-white">Accept Order</Text>
          </Pressable>
        ) : (
          <>
            {/* Narrower, plain outline — secondary now that Mark Packed is
                the button a store owner actually needs to reach for next. */}
            <Pressable
              onPress={onViewOrder}
              className={`flex-row items-center justify-center gap-1.5 rounded-xl bg-[#F1F2F4] py-3.5 ${isPlaced && isAccepted ? 'flex-[0.8]' : 'w-full'
                }`}
            >
              <Text className="text-[14px] font-medium text-black">View Order</Text>
              <AppIcon icon={ArrowRight01Icon} size={13} color={colors.ink} />
            </Pressable>

            {isPlaced && isAccepted && (
              // Explicit isPlaced guard, not just isAccepted — a stale
              // local acknowledgedOrderIds entry (set before this order's
              // last poll refresh) must never resurrect Mark Packed on an
              // order that's already moved past 'placed' server-side
              // (packed/out_for_delivery/delivered).
              // Coral — this app's own reserved CTA color (CLAUDE.md design
              // tokens: coral is CTA-only, never brand/lime), used here
              // deliberately so the next real action never blends into the
              // black/gray/white chrome around it and gets missed. Wider
              // than View Order (flex-[1.6] vs 0.8) since this is the
              // button that actually needs pressing next.
              <Pressable
                onPress={() => onMarkPacked(order.id)}
                className="flex-[1.6] flex-row items-center justify-center gap-1.5 rounded-xl bg-[#f54900] py-3.5"
              >
                {/* <AppIcon icon={CheckmarkCircle02Icon} size={14} color="#FFFFFF" /> */}
                <Text className="text-[14px] font-medium text-white">Mark Packed</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </Pressable>
  );
}