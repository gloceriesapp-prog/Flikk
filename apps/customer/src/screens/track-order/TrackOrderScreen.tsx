// Reached from ReceiptScreen's "Track Order" button and Purchase's own
// Live Order card. Status-only, 4-stage timeline (placed -> packed ->
// out_for_delivery -> delivered), no live map/GPS — CLAUDE.md scopes v1
// tracking to status-only, deliberately, even though a rider app exists in
// this product.
//
// Real order now (GET /orders/:id, api/orders.ts) — polled every 8s while
// the order hasn't reached a terminal status (delivered/cancelled), so a
// partner marking an order packed (or a rider moving it further, once that
// app exists) shows up here without the customer needing to pull-to-refresh
// or reopen the screen. Polling stops on its own once terminal, no manual
// cleanup needed beyond the effect's own unmount.
//
// Trip-aware (route.params.isTrip, set by CheckoutScreen's own isMultiStore
// branch): a multi-store checkout is one trip made of N real per-store
// orders (backend/migrations/014_trips.sql) — this screen fetches the
// combined trip (api/trips.ts's fetchTrip) instead of a single order, and
// renders one OrderInfoCard/DeliveryRiderCard/TrackingTimeline PER LEG,
// each showing that store's own real, independent status, under one
// shared trip banner (one payment, one delivery fee — trips.total, not
// duplicated per leg). A single-store order keeps using fetchOrder exactly
// as before this existed.

import { ArrowLeft01Icon, CustomerService01Icon, Store01Icon } from '@hugeicons/core-free-icons';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { fetchOrder } from '../../api/orders';
import { fetchTrip } from '../../api/trips';
import { DeliveryRiderCard } from './components/DeliveryRiderCard';
import { OrderInfoCard } from './components/OrderInfoCard';
import { TrackingTimeline } from './components/TrackingTimeline';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'TrackOrder'>;

const POLL_INTERVAL_MS = 8000;

function isTerminal(status?: string): boolean {
  return status === 'delivered' || status === 'cancelled';
}

export function TrackOrderScreen({ navigation, route }: Props) {
  const { orderId, isTrip } = route.params;

  const { data: order, isLoading: isOrderLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => fetchOrder(orderId),
    enabled: !isTrip,
    refetchInterval: (query) => (isTerminal(query.state.data?.status) ? false : POLL_INTERVAL_MS),
  });

  const { data: trip, isLoading: isTripLoading } = useQuery({
    queryKey: ['trip', orderId],
    queryFn: () => fetchTrip(orderId),
    enabled: !!isTrip,
    // A trip as a whole is only "done" once every leg independently is —
    // trips.status itself stays coarse (014_trips.sql's own note), so the
    // real signal to stop polling is every child order's own status.
    refetchInterval: (query) => {
      const legs = query.state.data?.orders ?? [];
      return legs.length > 0 && legs.every((leg) => isTerminal(leg.status)) ? false : POLL_INTERVAL_MS;
    },
  });

  const isLoading = isTrip ? isTripLoading : isOrderLoading;
  const legs = trip?.orders ?? [];

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View className="flex-row items-center bg-white px-2 pb-2 pt-safe-offset-2">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="h-11 w-11 items-center justify-center">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <Text className="flex-1 text-center text-xl font-semibold text-ink">Track Order</Text>
        {/* No support screen exists yet — wire this to a real destination
            once one does, same no-op ProfileScreen's own Support tile uses
            today. */}
        <Pressable onPress={() => {}} hitSlop={12} className="h-11 w-11 items-center justify-center">
          <AppIcon icon={CustomerService01Icon} size={22} color={colors.ink} />
        </Pressable>
      </View>

      {isLoading || (isTrip ? !trip : !order) ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : isTrip ? (
        <ScrollView className="flex-1" contentContainerClassName="items-center gap-5 px-5 pb-8 pt-4">
          {/* One combined banner — one payment, one delivery fee for the
              whole trip (trip.total/trip.delivery_fee, never duplicated
              per leg — backend/src/lib/trips.ts's own calcTripTotal), even
              though each store below tracks its own real progress
              independently. */}
          <View className="w-full gap-1 rounded-3xl bg-lime-soft p-5">
            <Text className="text-xs font-bold uppercase tracking-wide text-lime-deep">
              {legs.length}-store trip · one delivery
            </Text>
            <Text className="text-2xl font-semibold text-ink">₹{trip!.total.toFixed(0)}</Text>
            <Text className="text-sm font-medium text-ink/50">
              Includes one ₹{trip!.delivery_fee.toFixed(0)} delivery fee for every store below.
            </Text>
          </View>

          {legs.map((leg, index) => (
            <View key={leg.id} className="w-full gap-3">
              <View className="flex-row items-center gap-2 px-1">
                <AppIcon icon={Store01Icon} size={15} color={colors.ink} />
                <Text className="text-[13px] font-bold text-ink" numberOfLines={1}>
                  Stop {index + 1} of {legs.length} · {leg.stores?.name ?? 'Store'}
                </Text>
              </View>

              <OrderInfoCard order={leg} />
              <DeliveryRiderCard order={leg} />

              <View className="w-full rounded-3xl bg-white p-5">
                <TrackingTimeline order={leg} />
              </View>
            </View>
          ))}

          <Text className="px-6 text-center text-sm font-medium text-gray-500">
            {legs.every((leg) => leg.status === 'delivered')
              ? "Thanks for shopping, we'll be here when you need us again."
              : "We'll keep every store above updated as your trip moves along."}
          </Text>
        </ScrollView>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="items-center gap-5 px-5 pb-8 pt-4">
          <OrderInfoCard order={order!} />

          <DeliveryRiderCard order={order!} />

          <View className="w-full rounded-3xl bg-white p-5">
            <TrackingTimeline order={order!} />
          </View>

          <Text className="px-6 text-center text-sm font-medium text-gray-500">
            {order!.status === 'delivered'
              ? "Thanks for shopping, we'll be here when you need us again."
              : "We'll keep this updated as your order moves along."}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
