import { useAuthStore } from '../../../store/useAuthStore';
// Order card. Real white card on PurchaseScreen's own #FCFCFB background.
//
// Status lives as a tinted pill in the card's own top-right corner, level
// with the photo stack. The arrow-right on the "Arriving on…" line is no
// longer an inline expand/collapse toggle — tapping the card (or the
// arrow, same handler) now always opens TrackOrderScreen, live order or
// finished one, which is where the real item list lives now (an explicit
// ask to move it off this card entirely, not just visually declutter it).
//
// The star-rating row only renders for delivered orders — real submission
// now (RateOrderModal -> POST /reviews, backend/src/routes/reviews.ts).
// GET /reviews/order/:orderId (fetchReviewForOrder) tells this row whether
// the order's already been rated, so a re-render after re-opening Purchase
// shows the real star count instead of re-offering the prompt.

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight02Icon, StarIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { fetchReviewForOrder } from '../../../api/reviews';
import { getPurchaseArrivalLabel, getPurchaseDeliveredDateLabel } from '../orderArrival';
import type { PurchaseOrder } from '../data';
import { OrderProductPreview } from './OrderProductPreview';
import { RateOrderModal } from './RateOrderModal';

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
  const customerId = useAuthStore(state => state.customerId);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const status = statusFor(order);
  const arrivingLabel = getPurchaseArrivalLabel(order, now);
  const deliveredDateLabel = getPurchaseDeliveredDateLabel(order);

  const { data: existingReview, refetch: refetchReview } = useQuery({
    queryKey: ['review', order.orderId, customerId],
    queryFn: () => fetchReviewForOrder(order.orderId),
    enabled: order.status === 'delivered' && !previewOnly,
  });

  return (
    <View className="mb-3 rounded-2xl bg-[#FFFFFF] p-3.5">
      {previewOnly && <Text className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink/40">Sample order</Text>}
      {/* Metadata stays above the full-width product preview. */}
      <View className="flex-row items-center justify-between">
          <Text className="text-[13px] font-semibold text-ink/70">
            {order.items.length} item{order.items.length === 1 ? '' : 's'}
          </Text>

        <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${status.color}1A` }}>
          <Text className="text-[12.5px] font-semibold" style={{ color: status.color }} numberOfLines={1}>
            {status.headline}
          </Text>
        </View>
      </View>
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

      {order.status === 'delivered' && (
        <View className="mt-3 flex-row items-center justify-between gap-3 border-t border-ink/5 pt-3">
          <Text numberOfLines={1} className="flex-1 text-[12px] font-medium text-ink/60">{order.storeName}</Text>
          <Text className="text-[13px] font-semibold text-ink">Paid ₹{order.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
        </View>
      )}

      {order.status === 'delivered' && (
        <Pressable
          onPress={() => !existingReview && setIsRatingModalOpen(true)}
          disabled={previewOnly || !!existingReview}
          className="mt-3 flex-row items-center gap-2 rounded-xl bg-[#FDF6E9] px-3 py-2"
        >
          <View className="flex-row">
            {[1, 2, 3, 4, 5].map((i) => (
              <AppIcon
                key={i}
                icon={StarIcon}
                size={13}
                color={colors.gold}
                fill={existingReview ? (i <= existingReview.rating ? colors.gold : 'transparent') : colors.gold}
                strokeWidth={existingReview ? 1.2 : 0}
              />
            ))}
          </View>
          <Text className="flex-1 text-[12px] font-semibold text-ink/70">
            {existingReview ? 'You rated this order' : 'Rate your order'}
          </Text>
        </Pressable>
      )}

      {!previewOnly && <RateOrderModal
        visible={isRatingModalOpen}
        orderId={order.orderId}
        storeName={order.storeName}
        onClose={() => setIsRatingModalOpen(false)}
        onSubmitted={() => {
          setIsRatingModalOpen(false);
          void refetchReview();
        }}
      />}
    </View>
  );
}
