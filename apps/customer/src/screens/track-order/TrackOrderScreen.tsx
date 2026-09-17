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
// combined trip (api/trips.ts's fetchTrip) instead of a single order.
//
// One combined card now, not one per store leg (each leg used to get its
// own OrderInfoCard/DeliveryRiderCard/OrderItemsCard/TrackingTimeline,
// which is real internal accuracy the customer doesn't actually need to
// see — a customer who ordered from two stores in one trip cares "where's
// my stuff", not "which of the two stores is currently packed vs still
// placed"). The store names each leg came from still show up top, in
// plain text — real, not hidden, just not the whole screen's structure.
//
// Status/ETA/rider/timeline are all driven by the REPRESENTATIVE leg —
// the one furthest behind (lowest stage in the real placed/packed/
// out_for_delivery/delivered order, backend/src/lib/orderStateMachine.ts).
// That's a real, honest choice, not an average or a guess: a rider doing
// a multi-stop pickup can't be "out for delivery" for the trip as a whole
// until every store's leg is at least that far along, so whichever leg is
// least advanced is genuinely what's gating the whole trip right now.
// Items are the real union of every leg's own order_items — nothing
// invented, just combined into one list instead of N separate ones.

import { ArrowLeft01Icon, CustomerService01Icon, Store01Icon } from '@hugeicons/core-free-icons';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { fetchOrder, type ApiOrder } from '../../api/orders';
import { fetchTrip } from '../../api/trips';
import { joinStoreNames, representativeLeg } from '../../utils/tripLegs';
import { DeliveryRiderCard } from './components/DeliveryRiderCard';
import { OrderInfoCard } from './components/OrderInfoCard';
import { OrderItemsCard } from './components/OrderItemsCard';
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
    <View className="flex-1 bg-[#F1F2F4]">
      <View className="flex-row items-center bg-[#F1F2F4] px-4 pb-2 pt-safe-offset-2">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="h-11 w-11 items-center justify-center rounded-full bg-white">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <Text className="flex-1 text-center text-[17px] font-semibold text-ink">Track Order</Text>
        {/* No support screen exists yet — wire this to a real destination
            once one does, same no-op ProfileScreen's own Support tile uses
            today. */}
        <Pressable onPress={() => {}} hitSlop={12} className="h-11 w-11 items-center justify-center rounded-full bg-white">
          <AppIcon icon={CustomerService01Icon} size={22} color={colors.ink} />
        </Pressable>
      </View>

      {isLoading || (isTrip ? !trip : !order) ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : isTrip ? (
        (() => {
          const leg = representativeLeg(legs);
          const storeNames = legs.map((l) => l.stores?.name ?? 'Store');
          // Real union of every leg's own order_items, combined into the
          // one items card — leg's other fields (id, placed_at, etc.)
          // ride along unchanged since OrderItemsCard only ever reads
          // order.order_items.
          const combinedOrder: ApiOrder = { ...leg, order_items: legs.flatMap((l) => l.order_items) };

          return (
            <ScrollView className="flex-1" contentContainerClassName="items-center gap-3 px-5 pb-8 pt-4">
              {/* One combined banner — one payment, one delivery fee for
                  the whole trip (trip.total/trip.delivery_fee, never
                  duplicated per leg — backend/src/lib/trips.ts's own
                  calcTripTotal). Store names sit right here, up top, in
                  plain text — real transparency about this being a
                  multi-store trip, without turning the rest of the screen
                  into N separate per-store sections. */}
              <View className="w-full gap-2 rounded-3xl bg-lime-soft p-5">
                {/* Translucent chip, not a solid one — this row is a label
                    sitting on top of the banner, not another block of
                    equal visual weight to the price below it. */}
                <View className="flex-row items-center gap-1.5 self-start rounded-full bg-white/40 px-2.5 py-1">
                  <AppIcon icon={Store01Icon} size={12} color={colors.ink + '99'} />
                  <Text className="text-[11px] font-bold uppercase tracking-wide text-lime-deep" numberOfLines={1}>
                    From {joinStoreNames(storeNames)}
                  </Text>
                </View>
                <Text className="text-2xl font-semibold text-ink">₹{trip!.total.toFixed(0)}</Text>
                <Text className="text-sm font-medium text-ink/50">
                  {legs.length}-store trip · one delivery · ₹{trip!.delivery_fee.toFixed(0)} delivery fee
                </Text>
              </View>

              <OrderInfoCard order={leg} />
              <DeliveryRiderCard order={leg} />
              <OrderItemsCard order={combinedOrder} />

              <View className="w-full rounded-3xl bg-white p-5">
                <TrackingTimeline order={leg} />
              </View>

              <Text className="mt-4 mb-6 px-6 text-center text-sm font-medium text-gray-500">
                {legs.every((l) => l.status === 'delivered')
                  ? "Thanks for shopping, we'll be here when you need us again."
                  : "We'll keep this updated as your trip moves along."}
              </Text>
            </ScrollView>
          );
        })()
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="items-center gap-3 px-5 pb-8 pt-4">
          <OrderInfoCard order={order!} />

          <DeliveryRiderCard order={order!} />

          <OrderItemsCard order={order!} />

          <View className="w-full rounded-3xl bg-white p-5">
            <TrackingTimeline order={order!} />
          </View>

          <Text className="mt-4 mb-6 px-6 text-center text-[13.5px] font-medium text-gray-500">
            {order!.status === 'delivered'
              ? "Thanks for shopping, we'll be here when you need us again."
              : "We'll keep this updated as your order moves along."}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
