import { useAuthStore } from '../../store/useAuthStore';
import { useState } from 'react';
import { ArrowLeft01Icon, CustomerService01Icon } from '@hugeicons/core-free-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { cancelOrder, type ApiOrder } from '../../api/orders';
import { cancelTrip, type TripCancellation, type ApiTrip } from '../../api/trips';
import { useTracking } from './state/useTracking';
import { TrackingFeedback } from './components/TrackingFeedback';
import { TripCancellationResult } from './components/TripCancellationResult';
import { representativeLeg } from '../../utils/tripLegs';
import { CancelOrderCard } from './components/CancelOrderCard';
import { CancelOrderModal } from './components/CancelOrderModal';
import { DeliveryRiderCard } from './components/DeliveryRiderCard';
import { OrderInfoCard } from './components/OrderInfoCard';
import { DeliveryDetailsSection } from './sections/delivery-details/DeliveryDetailsSection';
import { OrderSummarySection } from './sections/order-summary/OrderSummarySection';
import { TrackingTimeline } from './components/TrackingTimeline';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'TrackOrder'>;

function isCancellable(status: string): boolean {
  return status === 'placed' || status === 'packed';
}

function TrackingDetails({ navigation, route }: Props) {
  const customerId = useAuthStore(state => state.customerId);
  const { orderId, isTrip } = route.params;

  const tracking = useTracking(orderId, !!isTrip);
  const { order, trip } = tracking;
  const legs = trip?.orders ?? [];
  const [cancellationResult, setCancellationResult] = useState<TripCancellation>();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const cancellationDetails: TripCancellation | undefined = cancellationResult || legs.some(leg => leg.status === 'cancelled') ? {
    outcome: legs.every(leg => leg.status === 'cancelled') ? 'cancelled' : 'blocked',
    shops: legs.map(leg => ({ order_id: leg.id, store_name: leg.stores?.name ?? 'Shop', status: leg.status,
      outcome: leg.status === 'cancelled' ? 'cancelled' : isCancellable(leg.status) ? 'not_cancelled' : 'blocked',
      refund_status: leg.refund_status,
    })), refund: trip?.cancellation_refund ?? null,
  } : undefined;
  const cancelMutation = useMutation({
    mutationFn: async (reason: string) => {
      if (isTrip) {
        return cancelTrip(orderId, reason);
      } else {
        await cancelOrder(orderId, reason);
      }
    },
    onSuccess: (result) => {
      if (result) {
        setCancellationResult(result);
        queryClient.setQueryData<ApiTrip>(['trip', orderId, customerId], current => current ? { ...current,
          status: result.outcome === 'cancelled' ? 'cancelled' : current.status, cancellation_refund: result.refund,
          orders: current.orders?.map(order => ({ ...order, status: (result.shops.find(shop => shop.order_id === order.id)?.status ?? order.status) as ApiOrder['status'] })),
        } : current);
      }
      void queryClient.invalidateQueries({ queryKey: isTrip ? ['trip-live', orderId, customerId] : ['order-live', orderId, customerId] });
      void queryClient.invalidateQueries({ queryKey: ['my-orders', customerId] });
      queryClient.invalidateQueries({ queryKey: isTrip ? ['trip', orderId, customerId] : ['order', orderId, customerId] });
      setIsCancelModalOpen(false);
    },
    onError: () => {
      Alert.alert('Cancellation not confirmed', 'Your request may have reached us. Refresh tracking or retry to check the outcome.');
    },
  });

  return (
    <View className="flex-1 bg-[#F1F2F4]">
      <View className="flex-row items-center bg-[#F1F2F4] px-4 pb-2 pt-safe-offset-2">
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} hitSlop={12} className="h-11 w-11 items-center justify-center rounded-full bg-white">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <Text className="flex-1 text-center text-[17px] font-semibold text-ink">Track Order</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Get help with this order" onPress={() => navigation.navigate('Support', { target: { orderId, isTrip }, category: 'delivery' })} hitSlop={12} className="h-11 w-11 items-center justify-center rounded-full bg-white">
          <AppIcon icon={CustomerService01Icon} size={22} color={colors.ink} />
        </Pressable>
      </View>

      {tracking.state === 'stale' ? <TrackingFeedback state="stale" retry={() => void tracking.refetch()} busy={tracking.fetching} updatedAt={tracking.updatedAt} /> : null}
      {['loading', 'connection-error', 'request-error', 'unavailable'].includes(tracking.state) ? (
        <TrackingFeedback state={tracking.state} retry={() => void tracking.refetch()} busy={tracking.fetching} />
      ) : isTrip ? (
        (() => {
          const leg = representativeLeg(legs);
          // Preview and expanded summary include every store leg's
          // ordered items; billing uses the trip's combined totals.
          const combinedOrder: ApiOrder = { ...leg, order_items: legs.flatMap((l) => l.order_items) };

          return (
            <ScrollView className="flex-1" contentContainerClassName="items-center gap-3 px-5 pb-8 pt-4">
              <OrderInfoCard order={leg} hideRefund />
              <TripCancellationResult result={cancellationDetails} refund={trip?.cancellation_refund} />

              {legs.some((l) => isCancellable(l.status)) && legs.every((l) => isCancellable(l.status) || l.status === 'cancelled') ? (
                <CancelOrderCard onPress={() => setIsCancelModalOpen(true)} />
              ) : null}

              <DeliveryRiderCard order={leg} />
              <DeliveryDetailsSection address={trip!.addresses} />
              <OrderSummarySection key={trip!.id} items={combinedOrder.order_items} onViewSummary={() => navigation.navigate('OrderSummary', { orderId, isTrip: true })} />

              <View className="w-full rounded-3xl bg-white p-5">
                <TrackingTimeline order={leg} />
              </View>

              <Text className="mt-4 text-center text-sm font-medium text-gray-500">
                {legs.every((l) => l.status === 'delivered')
                  ? "Thanks for shopping, we'll be here when you need us again."
                  : legs.some((l) => l.status === 'failed')
                    ? "Part of this trip couldn't be delivered — see the details above."
                    : "We'll keep this updated as your trip moves along."}
              </Text>
            </ScrollView>
          );
        })()
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="items-center gap-3 px-5 pb-8 pt-4">
          <OrderInfoCard order={order!} />

          {/* Right below the estimate card, per an explicit ask — and
              naturally mutually exclusive with DeliveryRiderCard just
              below: isCancellable is true for exactly 'placed'/'packed',
              DeliveryRiderCard now only renders for 'out_for_delivery'
              (that component's own note on the fix), so exactly one of
              the two ever shows, never both, with no shared state needed
              to coordinate it. */}
          {isCancellable(order!.status) ? <CancelOrderCard onPress={() => setIsCancelModalOpen(true)} /> : null}

          <DeliveryRiderCard order={order!} />

          <DeliveryDetailsSection address={order!.addresses} />
          <OrderSummarySection key={order!.id} items={order!.order_items} onViewSummary={() => navigation.navigate('OrderSummary', { orderId })} />

          <View className="w-full rounded-3xl bg-white p-5">
            <TrackingTimeline order={order!} />
          </View>

          <Text className="mt-4 text-center text-[13.5px] font-medium text-gray-500">
            {order!.status === 'delivered'
              ? "Thanks for shopping, we'll be here when you need us again."
              : order!.status === 'failed'
                ? "This order couldn't be delivered — see the details above."
                : "We'll keep this updated as your order moves along."}
          </Text>
        </ScrollView>
      )}

      {order || trip ? (
        <CancelOrderModal
          visible={isCancelModalOpen}
          onDismiss={() => { if (!cancelMutation.isPending) setIsCancelModalOpen(false); }}
          onConfirm={(reason) => cancelMutation.mutate(reason)}
          confirming={cancelMutation.isPending}
        />
      ) : null}
    </View>
  );
}

export function TrackOrderScreen(props: Props) {
 return <TrackingDetails key={`${props.route.params.isTrip ? 'trip' : 'order'}:${props.route.params.orderId}`} {...props} />;
}
