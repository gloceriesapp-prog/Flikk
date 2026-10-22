// Delivered orders show a one-tap rating prompt until the review is saved.
// Active/cancelled orders retain their status and tracking entry point.

import { ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { getPurchaseArrivalLabel, getPurchaseDeliveredDateLabel } from '../orderArrival';
import type { PurchaseOrder } from '../data';
import { OrderProductPreview } from './OrderProductPreview';
import { useOrderRating } from '../../../features/order-rating/useOrderRating';
import { OrderRatingStars } from './OrderRatingStars';

interface Props {
  order: PurchaseOrder;
  onPress: () => void;
  previewOnly?: boolean;
  now: number;
}

function statusFor(order: PurchaseOrder) {
  if (order.status === 'cancelled') return { color: colors.danger, headline: 'Cancelled' };
  if (order.status === 'failed') return { color: colors.danger, headline: 'Delivery failed' };
  if (order.status === 'delivered') return { color: colors.success, headline: 'Delivered' };
  if (order.status === 'placed' || order.status === 'packed') return { color: colors.success, headline: 'Packing' };
  return { color: colors.success, headline: 'On the way' };
}

export function OrderRow({ order, onPress, previewOnly = false, now }: Props) {
  const rating = useOrderRating(order.orderId, order.status === 'delivered', previewOnly);
  const status = statusFor(order);
  const arrivingLabel = getPurchaseArrivalLabel(order, now);
  const deliveredDateLabel = getPurchaseDeliveredDateLabel(order);

  return (
    <View className="mb-3 rounded-2xl bg-[#FFFFFF] p-3.5">
      {previewOnly && <Text className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink/40">Sample order</Text>}
      {/* Active and cancelled orders retain their status; delivered cards use
          the delivery headline below instead of repeating the same status. */}
      {order.status !== 'delivered' && <View className="flex-row items-center justify-between">
          <Text className="text-[13px] font-semibold text-ink/70">
            {order.items.length} item{order.items.length === 1 ? '' : 's'}
          </Text>

        <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${status.color}1A` }}>
          <Text className="text-[12.5px] font-semibold" style={{ color: status.color }} numberOfLines={1}>
            {status.headline}
          </Text>
        </View>
      </View>}
      <OrderProductPreview items={order.items} />

      <Pressable onPress={onPress} disabled={previewOnly} accessibilityRole="button" className="mt-3 flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-[20px] font-bold leading-[26px] tracking-[-0.4px]" style={{ color: order.status === 'delivered' ? '#000000' : status.color }} numberOfLines={2}>
            {arrivingLabel}
          </Text>
          {deliveredDateLabel && (
            <Text className="mt-1 text-[12px] font-medium text-ink/45">{deliveredDateLabel}</Text>
          )}
        </View>

        <View className="h-8 w-8 items-center justify-center rounded-full bg-white">
          <AppIcon icon={ArrowRight02Icon} size={16} color={colors.ink} strokeWidth={1.8} />
        </View>
      </Pressable>

      {rating.visible && (
        <View className="mt-4 border-t border-ink/5 pt-3">
          <Text className="text-[13px] font-semibold text-ink/70">Rate your order</Text>
          <OrderRatingStars rating={rating.rating} onChange={score => void rating.rate(score)} disabled={rating.isSaving} />
          {rating.isSaving && <Text className="text-xs text-ink/55">Saving your rating…</Text>}
          {rating.error && <Text accessibilityRole="alert" className="text-xs text-red-600">{rating.error}</Text>}
        </View>
      )}
    </View>
  );
}
