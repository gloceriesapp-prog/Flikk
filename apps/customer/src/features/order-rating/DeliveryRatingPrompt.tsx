import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { fetchReviewForOrder, type ApiReview } from '../../api/reviews';
import { RateOrderModal } from '../../screens/purchase/components/RateOrderModal';
import { mapOrderGroup } from '../../screens/purchase/data';
import { useAuthStore } from '../../store/useAuthStore';
import { groupOrdersByTrip } from '../../utils/tripLegs';
import { purchaseHistoryOptions } from '../purchases/historyQuery';
import { orderReviewKey } from './useOrderRating';

export function DeliveryRatingPrompt({ enabled }: { enabled: boolean }) {
  const customerId = useAuthStore(state => state.customerId);
  const client = useQueryClient();
  const [opening, setOpening] = useState(0);
  const [dismissedOpening, setDismissedOpening] = useState(-1);
  const eligible = enabled && !!customerId && dismissedOpening !== opening;

  useEffect(() => {
    let wasBackgrounded = AppState.currentState === 'background';
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background') wasBackgrounded = true;
      if (state === 'active' && wasBackgrounded) {
        wasBackgrounded = false;
        setOpening(value => value + 1);
      }
    });
    return () => subscription.remove();
  }, []);

  const history = useInfiniteQuery({
    ...purchaseHistoryOptions(customerId),
    enabled: enabled && !!customerId,
    refetchOnWindowFocus: 'always',
  });
  const delivered = useMemo(() => groupOrdersByTrip(history.data?.pages.flatMap(page => page.items) ?? [])
    .map(mapOrderGroup)
    .filter(order => order.status === 'delivered')
    .sort((a, b) => Date.parse(b.deliveredAtIso ?? b.placedAtIso) - Date.parse(a.deliveredAtIso ?? a.placedAtIso)),
  [history.data]);

  const pending = useQuery({
    queryKey: ['delivery-rating-candidate', customerId, opening, delivered.map(order => order.orderId)],
    enabled: eligible && delivered.length > 0,
    staleTime: Infinity,
    gcTime: 60_000,
    queryFn: async ({ signal }) => {
      for (const { orderId } of delivered) {
        if (signal.aborted) return null;
        const queryKey = orderReviewKey(orderId, customerId);
        if (client.getQueryData<ApiReview>(queryKey)) continue;
        const review = await client.fetchQuery({
          queryKey,
          queryFn: () => fetchReviewForOrder(orderId),
        });
        if (!review) return orderId;
      }
      return null;
    },
  });

  const order = delivered.find(order => order.orderId === pending.data);
  if (!eligible || !order) return null;

  return (
    <RateOrderModal
      key={order.orderId}
      orderId={order.orderId}
      storeName={order.storeName}
      onClose={() => setDismissedOpening(opening)}
    />
  );
}
