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
import { estimateDeliveryTime, formatEta } from '../../../utils/estimateDelivery';
import type { PurchaseOrder } from '../data';
import { ItemThumbnailStack } from './ItemThumbnailStack';
import { RateOrderModal } from './RateOrderModal';

interface Props {
  order: PurchaseOrder;
  onPress: () => void;
}

function statusFor(order: PurchaseOrder) {
  if (order.status === 'cancelled') return { color: colors.danger, headline: 'Cancelled' };
  if (order.status === 'failed') return { color: colors.danger, headline: 'Delivery failed' };
  if (order.status === 'delivered') return { color: colors.success, headline: 'Delivered' };
  return { color: colors.success, headline: 'On the way' };
}

export function OrderRow({ order, onPress }: Props) {
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const status = statusFor(order);
  const isFinished = order.status === 'delivered' || order.status === 'cancelled' || order.status === 'failed';

  // Live orders show a real forward-looking ETA; a finished order instead
  // shows when it actually finished — order.etaLabel already carries that
  // real terminal timestamp (data.ts's own note), no separate computation
  // needed for that branch.
  const arrivingLabel = isFinished
    ? order.etaLabel
    : `Arriving on ${formatEta(estimateDeliveryTime(order.placedAtIso, order.avgPrepMinutes))}`;

  const placedAt = new Date(order.placedAtIso);
  const placedAtLabel = `${placedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${placedAt.toLocaleDateString('en-IN', { weekday: 'short' })} · ${placedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;

  const { data: existingReview, refetch: refetchReview } = useQuery({
    queryKey: ['review', order.orderId],
    queryFn: () => fetchReviewForOrder(order.orderId),
    enabled: order.status === 'delivered',
  });

  return (
    <View className="mb-3 rounded-2xl bg-[#FFFFFF] p-3.5">
      {/* Row 1: photo stack + item count on the left, the status pill
          pinned to the right end of the SAME line. Row 2: "Arriving on…"
          on the left, the expand arrow pinned to the right end of THAT
          line instead — not stacked under the pill — so the arrow reads
          as acting on the arrival info specifically, one row down from
          status the way the reference lays it out. */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          <ItemThumbnailStack items={order.items} />
          <Text className="text-[13px] font-semibold text-ink/70">
            {order.items.length} item{order.items.length === 1 ? '' : 's'}
          </Text>
        </View>

        <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${status.color}1A` }}>
          <Text className="text-[12.5px] font-semibold" style={{ color: status.color }} numberOfLines={1}>
            {status.headline}
          </Text>
        </View>
      </View>

      <Pressable onPress={onPress} className="mt-3 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-[13.5px] font-semibold text-ink/80" numberOfLines={1}>
            {arrivingLabel}
          </Text>
          <Text className="mt-0.5 text-[12px] font-medium text-ink/45">{placedAtLabel}</Text>
        </View>

        <View className="h-8 w-8 items-center justify-center rounded-full bg-white">
          <AppIcon icon={ArrowRight02Icon} size={16} color={colors.ink} strokeWidth={1.8} />
        </View>
      </Pressable>

      {order.status === 'delivered' && (
        <Pressable
          onPress={() => !existingReview && setIsRatingModalOpen(true)}
          disabled={!!existingReview}
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

      <RateOrderModal
        visible={isRatingModalOpen}
        orderId={order.orderId}
        storeName={order.storeName}
        onClose={() => setIsRatingModalOpen(false)}
        onSubmitted={() => {
          setIsRatingModalOpen(false);
          void refetchReview();
        }}
      />
    </View>
  );
}
