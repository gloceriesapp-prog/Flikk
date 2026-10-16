import { BackIcon } from '../../components/PartnerIcons';
// Account-scoped detail reads work independently of the queue, including cold-start
// push navigation. Transient failures preserve the last loaded order.

import { Alert02Icon, Cash01Icon, CheckmarkCircle02Icon, Wallet01Icon } from '@hugeicons/core-free-icons';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { ApiError } from '../../api/client';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import { fetchOrderDetail } from '../../api/orders';
import { mapApiOrder } from '../orders/data';
import { useAuthStore } from '../../store/useAuthStore';
import { useOrdersStore } from '../../store/useOrdersStore';
import type { AppStackParamList } from '../../navigation/types';
import { OrderDetailItemRow } from './components/OrderDetailItemRow';
import { OrderDetailSectionHeader } from './components/OrderDetailSectionHeader';
import { OrderTotalCard } from './components/OrderTotalCard';
import { orderDetailQueryOptions } from './orderDetailQuery';

type Props = NativeStackScreenProps<AppStackParamList, 'OrderDetail'>;

// Same flat gray Orders/Payouts/Store settings already use (OrdersScreen.tsx's
// own PAGE_BG, itself matching apps/customer's checkout flow) — cards stay
// solid white on top of it, per an explicit ask to match it here too.
const PAGE_BG = '#F1F2F4';

const STATUS_BADGE_LABEL = {
  placed: 'New',
  packed: 'Awaiting Rider',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  failed: 'Delivery failed',
  cancelled: 'Cancelled',
} as const;

const PAYMENT_MODE_LABEL = { paid_online: 'Paid online', cod: 'Cash on delivery', awaiting_payment: 'Payment pending' } as const;

// "Sep 19, 2:30 PM" — date + time together, unlike order.placedAtTime
// (time-only, shared with IncomingOrderAlert's own "Time" row) since this
// screen can be reopened days later where a bare clock time alone would be
// ambiguous about which day.
function formatDateTime(timestampMs: number): string {
  const date = new Date(timestampMs);
  const datePart = date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' });
  const timePart = date.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });
  return `${datePart}, ${timePart}`;
}

export function OrderDetailScreen({ route, navigation }: Props) {
  const cached = useOrdersStore(state => state.orders.find(order => order.id === route.params.orderId));
  const markPacked = useOrdersStore(state => state.markPacked);
  const epoch = useAuthStore(state => state.sessionEpoch);
  const focused = useIsFocused();
  const sample = route.params.orderId.startsWith('sample-') && __DEV__;
  const queryClient = useQueryClient();
  const options = orderDetailQueryOptions({
    epoch, orderId: route.params.orderId, cached,
    read: async () => { const row = await fetchOrderDetail(route.params.orderId); return mapApiOrder(row, [row]); },
    enabled: !sample && focused,
  });
  const query = useQuery(options);
  useEffect(() => {
    // Simulated orders have no server detail endpoint. Reflect local actions
    // while preserving their snapshot when a real queue refresh drops them.
    if (sample && cached) queryClient.setQueryData(['partner-order-detail', epoch, route.params.orderId], cached);
  }, [sample, cached, queryClient, epoch, route.params.orderId]);
  const order = query.data;
  const unavailable = query.error instanceof ApiError && [403, 404].includes(query.error.status);
  if (!order || unavailable) {
    return <SafeAreaView className="flex-1 gap-5 px-5 pt-5" style={{ backgroundColor: PAGE_BG }}>
      <Pressable accessibilityRole="button" onPress={() => navigation.goBack()}><Text className="font-semibold text-primary">Back to orders</Text></Pressable>
      <View className="gap-4 rounded-3xl bg-white p-6">
        <Text accessibilityLiveRegion="polite" className="text-base text-ink">{unavailable ? 'This order is unavailable for your store.' : query.isError ? 'Could not connect to your order. Please retry.' : 'Getting your order details…'}</Text>
        {query.isError && !unavailable && <Pressable accessibilityRole="button" onPress={() => void query.refetch()}><Text className="font-semibold text-primary">Retry</Text></Pressable>}
      </View>
    </SafeAreaView>;
  }

  const isPlaced = order.status === 'placed';

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: PAGE_BG }} edges={['top']}>
      <View className="flex-row items-center justify-between px-5 py-3">
        <Pressable onPress={() => navigation.goBack()} className="h-10 w-10 items-center justify-center rounded-full bg-white">
          <BackIcon size={22} color={colors.ink} />
        </Pressable>
        <View className="flex-row items-center gap-2">
          <Pressable className="flex-row items-center gap-1.5 rounded-full bg-white px-3.5 py-2.5">
            <Text className="text-[15px] font-medium text-ink">Order ID: {order.orderNumber}</Text>
            {/* <AppIcon icon={Copy01Icon} size={14} color={colors.ink} /> */}
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-6">
        {query.isError && <Pressable accessibilityRole="button" onPress={() => void query.refetch()} className="rounded-2xl bg-white p-4"><Text className="text-danger">Connection interrupted. Showing the last order update. Tap to retry.</Text></Pressable>}
        <View className="gap-3 rounded-3xl bg-white p-4">
          <View>
            <Text className="text-[18px] font-semibold text-black">{order.customerName}</Text>
            <View className="mt-1 flex-row items-center gap-1.5">
              <AppIcon
                icon={order.paymentMode === 'paid_online' ? Wallet01Icon : order.paymentMode === 'awaiting_payment' ? Alert02Icon : Cash01Icon}
                size={13}
                color={`${colors.ink}80`}
              />
              <Text className="text-[13px] font-medium text-ink/60">{PAYMENT_MODE_LABEL[order.paymentMode]}</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between border-t border-black/5 pt-3">
            <Text className="text-[14px] font-medium text-ink/80">
              {order.customerName}
            </Text>
            <Text className="text-[14px] font-medium text-ink/60">{formatDateTime(order.placedAtTimestamp)}</Text>
          </View>
        </View>

        <View className="gap-1 rounded-3xl bg-white p-4">
          <OrderDetailSectionHeader itemCount={order.items.length} />
          <View className="mt-2 gap-1 border-t border-black/5 pt-2">
            {order.items.map((item, index) => (
              <OrderDetailItemRow key={`${order.id}:${index}`} item={item} />
            ))}
          </View>
        </View>

        <OrderTotalCard total={order.total} />
      </ScrollView>

      <View className="px-5 pb-9 pt-2">
        {isPlaced ? (
          // Plain tap button, not a slide-to-confirm gesture — that drag
          // interaction stays specific to the rider app's own "Delivered"
          // action (apps/rider's own SlideToConfirmButton), which is a
          // genuinely higher-stakes, harder-to-undo action (confirming a
          // customer actually received their order) than a store owner
          // marking their own order packed for pickup.
          <Pressable
            onPress={() => {
              markPacked(order.id)
                .then(() => navigation.goBack())
                .catch((err) => {
                  Alert.alert('Could not update order', err instanceof ApiError ? err.message : 'Please try again.');
                });
            }}
            className="h-[62px] w-full items-center justify-center rounded-full bg-[#1447e6] active:opacity-80"
          >
            <Text className="text-lg font-medium text-white">Ready for Pickup</Text>
          </Pressable>
        ) : order.status === 'delivered' ? (
          // Final state — a real green pill with a checkmark, not the same
          // neutral gray every other read-only status uses, so "this order
          // is genuinely done" reads at a glance instead of blending in
          // with "still in progress" states.
          <View className="h-[68px] w-full flex-row items-center justify-center gap-2 rounded-full bg-success/10">
            <AppIcon icon={CheckmarkCircle02Icon} size={18} color={colors.success} />
            <Text className="text-lg font-medium text-success">{STATUS_BADGE_LABEL[order.status]}</Text>
          </View>
        ) : order.status === 'failed' ? (
          // Terminal-negative — danger pill mirroring the delivered one so
          // the owner sees at a glance their stock left and didn't land.
          // Nothing to act on here; the rider owns this transition.
          <View className="h-[68px] w-full flex-row items-center justify-center gap-2 rounded-full bg-danger/10">
            <AppIcon icon={Alert02Icon} size={18} color={colors.danger} />
            <Text className="text-lg font-medium text-danger">{STATUS_BADGE_LABEL[order.status]}</Text>
          </View>
        ) : order.status === 'packed' ? (
          // Real waiting state — a rider hasn't been assigned/picked up
          // yet, genuinely pending on something outside this app's
          // control. A spinner here is honest, not decorative: it's not a
          // static label pretending nothing is happening.
          <View className="h-[68px] w-full flex-row items-center justify-center gap-2.5 rounded-full bg-white">
            <ActivityIndicator size="small" color={colors.ink} />
            <Text className="text-lg font-medium text-ink/60">{STATUS_BADGE_LABEL[order.status]}</Text>
          </View>
        ) : (
          <View className="h-[68px] w-full items-center justify-center rounded-full bg-white">
            <Text className="text-lg font-medium text-ink/60">{STATUS_BADGE_LABEL[order.status]}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
