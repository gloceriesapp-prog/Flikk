import { refundPresentation } from '../../../features/customer-care/refundPresentation';

import { useMemo, useState } from 'react';
import { formatDeliveryWindow } from '../../../store/preorder';
import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { riderDeliveryFailureReasonLabel } from '@gloceries/shared';
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
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

function arrivalDeadline(order: ApiOrder): number | null {
  const deadline = estimateDeliveryTime(
    order.placed_at,
    order.estimated_delivery_minutes,
    order.estimated_delivery_at
  ).getTime();

  return Number.isFinite(deadline) ? deadline : null;
}

export function OrderInfoCard({
  order,
  hideRefund = false,
}: Props) {
  const isCancelled = order.status === 'cancelled';
  const isFailed = order.status === 'failed';
  const isDelivered = order.status === 'delivered';
  const isActive = !isCancelled && !isFailed && !isDelivered;
  const isOutForDelivery = order.status === 'out_for_delivery';
  const hasArrived = isOutForDelivery && !!order.rider_arrived_at;

  const [isReasonOpen, setIsReasonOpen] = useState(
    isCancelled || isFailed
  );

  const deadline = isOutForDelivery && !hasArrived ? arrivalDeadline(order) : null;

  const deadlines = useMemo(
    () => (deadline === null ? [] : [deadline]),
    [deadline]
  );

  const now = usePurchaseClock(deadlines);

  const minutes = deadline === null ? 0 : Math.ceil((deadline - now) / 60_000);
  const scheduledWindow = order.deliver_from && order.deliver_until
    ? formatDeliveryWindow(order.deliver_from, order.deliver_until)
    : null;

  let heading = 'Order getting packed';
  let subtitle = scheduledWindow ? `Scheduled delivery · ${scheduledWindow}` : 'The store is preparing your order.';
  if (hasArrived) {
    heading = 'Arrived at location';
    subtitle = `${order.riders?.name?.trim() || 'Your rider'} has reached your location`;
  } else if (isOutForDelivery) {
    heading = minutes > 0 ? `Arriving in ${minutes} minute${minutes === 1 ? '' : 's'}` : 'Out for delivery';
    subtitle = 'Your order is on its way.';
  }

  const label = isCancelled
    ? 'Order Cancelled'
    : isFailed
      ? 'Delivery Failed'
      : 'Delivered At';

  const deliveredAt = order.delivered_at
    ? new Date(order.delivered_at)
    : null;

  const timeText =
    isDelivered &&
    deliveredAt &&
    Number.isFinite(deliveredAt.getTime())
      ? clockTime(deliveredAt)
      : '—';

  const reasonTitle = isCancelled
    ? 'Order cancelled'
    : isFailed
      ? 'Delivery failed'
      : 'Delivered';

  const reasonMessage = isCancelled
    ? (order.cancel_reason ??
        'This order was cancelled and is no longer being prepared or delivered.')
    : isFailed
      ? `This order couldn't be delivered${
          order.cancel_reason &&
          order.cancel_reason !== 'other'
            ? ` — ${riderDeliveryFailureReasonLabel(
                order.cancel_reason
              ).toLowerCase()}`
            : ''
        }.`
      : 'This order has already been delivered.';

  const refundLine =
    (isCancelled || isFailed) && order.provider_payment_id
      ? refundPresentation(order.refund_status, order.provider_refund_id).message
      : isFailed && order.payment_method === 'cod'
        ? 'Cash on Delivery — nothing was charged for this order.'
        : null;

  return (
    <>
      {isActive ? (
        <View className="w-full rounded-3xl bg-[#F3FAF5] p-5" accessibilityLiveRegion="polite">
          <Text
            className="mt-2 text-[26px] font-bold leading-[33px] tracking-[-0.5px]"
            style={{
              color: ARRIVAL_GREEN,
              fontVariant: ['tabular-nums'],
            }}
          >
            {heading}
          </Text>

          <Text className="mt-1 text-[14px] font-medium text-[#64766B]">
            {subtitle}
          </Text>
        </View>
      ) : (
        <View className="w-full rounded-3xl bg-white p-5">
          <Text className="text-[15.5px] font-medium text-ink">
            {label}
          </Text>

          <View className="mt-2 flex-row items-center gap-2.5">
            <Text
              className={`text-[18px] font-semibold ${
                isCancelled || isFailed
                  ? 'text-danger'
                  : 'text-black'
              }`}
            >
              {timeText}
            </Text>

            <Pressable
              onPress={() => setIsReasonOpen((open) => !open)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Order status details"
              accessibilityState={{ expanded: isReasonOpen }}
              className="h-6 w-6 items-center justify-center"
            >
              <AppIcon
                icon={InformationCircleIcon}
                size={18}
                color={colors.ink + '80'}
              />
            </Pressable>
          </View>
        </View>
      )}

      {/* Show details only for completed, cancelled, or failed orders */}
      {isReasonOpen && !isActive && (
        <View className="w-full rounded-3xl bg-white p-5">
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 text-[15px] font-semibold text-ink">
              {reasonTitle}
            </Text>

            <AppIcon
              icon={
                isCancelled || isFailed
                  ? Cancel01Icon
                  : CheckmarkCircle02Icon
              }
              size={20}
              color={
                isCancelled || isFailed
                  ? colors.danger
                  : ARRIVAL_GREEN
              }
            />
          </View>

          <Text className="mt-1.5 text-[14.5px] font-medium leading-5 text-ink/70">
            {reasonMessage}
          </Text>

          {refundLine && !hideRefund ? (
            <Text
              className="mt-2.5 text-[13.5px] font-semibold leading-5"
              style={{
                color:
                  order.refund_status === 'failed'
                    ? colors.danger
                    : colors.success,
              }}
            >
              {refundLine}
            </Text>
          ) : null}
        </View>
      )}
    </>
  );
}
