// Full order-by-order breakdown for one settlement — reached from "View
// all orders" on either payout card (PayoutOrdersLink.tsx). A settlement's
// order count only grows (a busy week can be 18-24+), so this list needed
// its own screen rather than an inline expand on the card — a card that
// has to grow to fit that many rows stops being a card. Same reasoning
// and precedent as OrderDetailScreen/ProductDetailScreen: a variable-
// length list gets a real pushed screen, not a sheet or an inline
// accordion.
//
// Real GET /partner/payouts/:id/orders (api/payouts.ts) — every order
// line, and the gross/commission/net split on each, is jobs/
// weeklyPayouts.ts's own real per-order data, never computed here. This
// screen is pure read-only display, nothing here is ever mutated the way
// orders/products are, so react-query alone (no zustand store) is enough.
//
// isSample (route params) is the one exception — screens/payouts/data.ts's
// own sample fallback for a brand-new store with zero real payouts yet
// passes a fake "sample-*" id that GET /partner/payouts/:id/orders would
// 404 on, so this screen builds its breakdown from buildSamplePayoutOrders
// instead of fetching, using the same isSample gate every other payout
// surface already checks before treating numbers as real money.

import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { fetchPayoutOrders } from '../../api/payouts';
import { buildSamplePayoutOrders } from '../payouts/data';
import type { AppStackParamList } from '../../navigation/types';
import { PayoutOrderHistoryRow } from './components/PayoutOrderHistoryRow';

type Props = NativeStackScreenProps<AppStackParamList, 'PayoutOrderHistory'>;

export function PayoutOrderHistoryScreen({ route, navigation }: Props) {
  const { payoutId, weekLabel, isSample, sampleTotals } = route.params;
  const { data: fetchedOrders, isLoading: isFetchLoading } = useQuery({
    queryKey: ['payout-orders', payoutId],
    queryFn: () => fetchPayoutOrders(payoutId),
    enabled: !isSample,
  });
  const orders = isSample && sampleTotals ? buildSamplePayoutOrders(sampleTotals) : fetchedOrders;
  // enabled: false leaves react-query's own isLoading permanently true
  // (the query never actually runs) — the sample path has its data ready
  // synchronously above, so it's never actually loading regardless of
  // what that flag says.
  const isLoading = !isSample && isFetchLoading;

  const netTotal = (orders ?? []).reduce((sum, o) => sum + o.netAmount, 0);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="relative flex-row items-center px-5 py-3">
        <Pressable
          onPress={() => navigation.goBack()}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <AppIcon icon={ArrowLeft01Icon} size={18} color={colors.ink} />
        </Pressable>
        <Text className="absolute left-0 right-0 text-center text-lg font-semibold text-ink">Settlement orders</Text>
      </View>

      <View className="gap-1 px-5 pb-4 pt-1">
        <Text className="text-sm font-medium text-ink/50">{weekLabel}</Text>
        <Text className="text-2xl font-semibold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
          ₹{netTotal.toLocaleString('en-IN')}
        </Text>
        <View className="mt-1 flex-row items-center gap-1.5">
          <AppIcon icon={CheckmarkCircle02Icon} size={13} color={colors.limeDeep} />
          <Text className="text-xs font-medium text-ink/50">{(orders ?? []).length} orders add up to this payout</Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10">
          <View className="rounded-3xl bg-[#F9FAFB] px-4">
            {(orders ?? []).map((order, index) => (
              <PayoutOrderHistoryRow key={order.orderNumber} order={order} isLast={index === (orders?.length ?? 0) - 1} />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
