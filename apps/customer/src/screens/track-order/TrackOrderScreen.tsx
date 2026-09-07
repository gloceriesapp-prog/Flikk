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

import { ArrowLeft01Icon, CustomerService01Icon } from '@hugeicons/core-free-icons';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { fetchOrder } from '../../api/orders';
import { DeliveryRiderCard } from './components/DeliveryRiderCard';
import { OrderInfoCard } from './components/OrderInfoCard';
import { TrackingTimeline } from './components/TrackingTimeline';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'TrackOrder'>;

const POLL_INTERVAL_MS = 8000;

export function TrackOrderScreen({ navigation, route }: Props) {
  const { orderId } = route.params;

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => fetchOrder(orderId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'delivered' || status === 'cancelled' ? false : POLL_INTERVAL_MS;
    },
  });

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View className="flex-row items-center bg-white px-2 pb-2 pt-safe-offset-2">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="h-11 w-11 items-center justify-center">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <Text className="flex-1 text-center text-xl font-bold text-ink">Track Order</Text>
        {/* No support screen exists yet — wire this to a real destination
            once one does, same no-op ProfileScreen's own Support tile uses
            today. */}
        <Pressable onPress={() => {}} hitSlop={12} className="h-11 w-11 items-center justify-center">
          <AppIcon icon={CustomerService01Icon} size={22} color={colors.ink} />
        </Pressable>
      </View>

      {isLoading || !order ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="items-center gap-5 px-5 pb-8 pt-4">
          <OrderInfoCard order={order} />

          <DeliveryRiderCard order={order} />

          <View className="w-full rounded-3xl bg-white p-5">
            <TrackingTimeline order={order} />
          </View>

          <Text className="px-6 text-center text-sm font-medium text-gray-500">
            {order.status === 'delivered'
              ? "Thanks for shopping, we'll be here when you need us again."
              : "We'll keep this updated as your order moves along."}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
