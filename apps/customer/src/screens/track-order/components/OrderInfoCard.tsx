import { useMemo, useState } from 'react';
import { Cancel01Icon, CheckmarkCircle02Icon, Clock01Icon, InformationCircleIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import type { ApiOrder } from '../../../api/orders';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { estimateDeliveryTime } from '../../../utils/estimateDelivery';
import { usePurchaseClock } from '../../purchase/usePurchaseClock';

interface Props {
  order: ApiOrder;
  hideRefund?: boolean;
}

const ARRIVAL_GREEN = '#187B49';

function clockTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
}

function arrivalDeadline(order: ApiOrder): number | null {
  if (['delivered', 'cancelled', 'failed'].includes(order.status)) return null;
  if (!Number.isFinite(new Date(order.placed_at).getTime())) return null;
  const deadline = estimateDeliveryTime(order.placed_at, order.estimated_delivery_minutes, order.estimated_delivery_at).getTime();
  return Number.isFinite(deadline) ? deadline : null;
}

export function OrderInfoCard({ order, hideRefund = false }: Props) {
  const isCancelled = order.status === 'cancelled';
  const isFailed = order.status === 'failed';
  const isDelivered = order.status === 'delivered';
  const isActive = !isCancelled && !isFailed && !isDelivered;
  const [isReasonOpen, setIsReasonOpen] = useState(isCancelled || isFailed);
  const deadline = arrivalDeadline(order);
  const deadlines = useMemo(() => deadline === null ? [] : [deadline], [deadline]);
  // Reuse the minute-boundary clock: it pauses in the background and stops
  // at zero. Polling and rerenders cannot restart the original ETA.
  const now = usePurchaseClock(deadlines);
  const minutes = deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 60_000));
  const arrivalText = minutes === null ? 'Arrival estimate unavailable' :
    `Arriving in ${minutes} minute${minutes === 1 ? '' : 's'}`;

  const label = isCancelled ? 'Order Cancelled' : isFailed ? 'Delivery Failed' : 'Delivered At';
  const deliveredAt = order.delivered_at ? new Date(order.delivered_at) : null;
  const timeText = isDelivered && deliveredAt && Number.isFinite(deliveredAt.getTime()) ? clockTime(deliveredAt) : '—';
  const reasonTitle = isCancelled ? 'Order cancelled' : isFailed ? 'Delivery failed' : isDelivered ? 'Delivered' : 'About your arrival estimate';
  const reasonMessage = isCancelled
    ? (order.cancel_reason ?? 'This order was cancelled and is no longer being prepared or delivered.')
    : isFailed
      ? "This order couldn't be delivered. Check your order details for updates."
      : isDelivered
        ? 'This order has already been delivered.'
        : 'The estimate is based on the delivery time recorded when your order was placed. Actual arrival may vary.';
  const refundLine =
    isCancelled && order.razorpay_payment_id
      ? order.refund_status === 'completed'
        ? `₹${order.total.toFixed(0)} has been refunded to your original payment method.`
        : order.refund_status === 'failed'
          ? 'We could not process your refund automatically — please contact support.'
          : `Refund of ₹${order.total.toFixed(0)} is on its way — usually settles within a few business days.`
      : null;

  return (
    <>
      {isActive ? (
        <View className="w-full rounded-3xl border border-[#E0EFE5] bg-[#F3FAF5] p-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <AppIcon icon={Clock01Icon} size={17} color={ARRIVAL_GREEN} />
              <Text className="text-[12px] font-semibold text-[#538067]">Estimated arrival</Text>
            </View>
            <Pressable onPress={() => setIsReasonOpen((open) => !open)} hitSlop={10}
              accessibilityRole="button" accessibilityLabel="About your arrival estimate" accessibilityState={{ expanded: isReasonOpen }}
              className="h-7 w-7 items-center justify-center">
              <AppIcon icon={InformationCircleIcon} size={18} color="#538067" />
            </Pressable>
          </View>
          <Text className="mt-2 text-[26px] font-bold leading-[33px] tracking-[-0.5px]"
            style={{ color: ARRIVAL_GREEN, fontVariant: ['tabular-nums'] }}>{arrivalText}</Text>
          <Text className="mt-2 text-[12px] font-medium text-[#64766B]">
            {order.status === 'out_for_delivery' ? 'Your order is on its way' : 'Your order is being prepared'}
          </Text>
        </View>
      ) : (
        <View className="w-full rounded-3xl bg-white p-5">
          <Text className="text-[15.5px] font-medium text-ink">{label}</Text>
          <View className="mt-2 flex-row items-center gap-2.5">
            <Text className={`text-[18px] font-semibold ${isCancelled || isFailed ? 'text-danger' : 'text-black'}`}>{timeText}</Text>
            <Pressable onPress={() => setIsReasonOpen((open) => !open)} hitSlop={10}
              accessibilityRole="button" accessibilityLabel="Order status details" accessibilityState={{ expanded: isReasonOpen }}
              className="h-6 w-6 items-center justify-center">
              <AppIcon icon={InformationCircleIcon} size={18} color={colors.ink + '80'} />
            </Pressable>
          </View>
        </View>
      )}
      {isReasonOpen && (
        <View className="w-full rounded-3xl bg-white p-5">
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 text-[15px] font-semibold text-ink">{reasonTitle}</Text>
            <AppIcon icon={isCancelled || isFailed ? Cancel01Icon : isDelivered ? CheckmarkCircle02Icon : Clock01Icon}
              size={20} color={isCancelled || isFailed ? colors.danger : ARRIVAL_GREEN} />
          </View>
          <Text className="mt-1.5 text-[14.5px] font-medium leading-5 text-ink/70">{reasonMessage}</Text>
          {refundLine && !hideRefund ? <Text className="mt-2.5 text-[13.5px] font-semibold leading-5"
            style={{ color: order.refund_status === 'failed' ? colors.danger : colors.success }}>{refundLine}</Text> : null}
        </View>
      )}
    </>
  );
}
