// Full order-by-order breakdown for one settlement — reached from "View
// all orders" on either payout card (PayoutOrdersLink.tsx). A settlement's
// order count only grows (this week alone is 18), so this list needed its
// own screen rather than an inline expand on the card — a card that has to
// grow to fit 18-24 rows stops being a card. Same reasoning and precedent
// as OrderDetailScreen/ProductDetailScreen: a variable-length list gets a
// real pushed screen, not a sheet or an inline accordion.
//
// Payout is read from PLACEHOLDER_PAYOUTS by weekLabel (not a store) — this
// screen is pure read-only display, nothing here is ever mutated the way
// orders/products are, so there's no cross-screen shared-state need that
// would justify a zustand store like useOrdersStore/useCatalogStore.

import { ArrowLeft01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { PLACEHOLDER_PAYOUTS } from '../payouts/data';
import type { AppStackParamList } from '../../navigation/types';
import { PayoutOrderHistoryRow } from './components/PayoutOrderHistoryRow';

type Props = NativeStackScreenProps<AppStackParamList, 'PayoutOrderHistory'>;

export function PayoutOrderHistoryScreen({ route, navigation }: Props) {
  const payout = PLACEHOLDER_PAYOUTS.find((p) => p.weekLabel === route.params.weekLabel);

  if (!payout) {
    navigation.goBack();
    return null;
  }

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
        <Text className="text-sm font-medium text-ink/50">{payout.weekLabel}</Text>
        <Text className="text-2xl font-semibold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
          ₹{payout.netAmount.toLocaleString('en-IN')}
        </Text>
        <View className="mt-1 flex-row items-center gap-1.5">
          <AppIcon icon={CheckmarkCircle02Icon} size={13} color={colors.limeDeep} />
          <Text className="text-xs font-medium text-ink/50">
            {payout.orders.length} orders add up to this payout
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10">
        <View className="rounded-3xl bg-[#F9FAFB] px-4">
          {payout.orders.map((order, index) => (
            <PayoutOrderHistoryRow key={order.orderId} order={order} isLast={index === payout.orders.length - 1} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
