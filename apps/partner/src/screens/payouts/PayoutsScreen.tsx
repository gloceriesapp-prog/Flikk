// Payouts (P5) — read-only. No `GET /partner/payouts` call yet, same
// no-auth caveat as ../orders/OrdersScreen.tsx. This screen must never
// compute a payout figure client-side — see data.ts.

import { Text, ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { PLACEHOLDER_PAYOUTS } from './data';
import { PayoutWeekCard } from './components/PayoutWeekCard';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Payouts'>;

export function PayoutsScreen(_props: Props) {
  const currentWeek = PLACEHOLDER_PAYOUTS[0];

  return (
    <View className="flex-1 bg-white pt-safe">
      <View className="px-5 pb-4 pt-3">
        <Text className="text-xs font-semibold text-ink/50">Payouts</Text>
        <Text className="text-lg font-extrabold text-ink">Weekly settlements</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pb-28">
        {currentWeek && (
          <View className="gap-1 rounded-3xl bg-ink p-5">
            <Text className="text-xs font-semibold text-white/50">{currentWeek.weekLabel}</Text>
            <Text className="text-3xl font-extrabold text-white">₹{currentWeek.amount}</Text>
            <Text className="text-xs font-semibold text-lime">
              {currentWeek.status === 'pending' ? 'Pending settlement' : 'Paid out'} · {currentWeek.orderCount} orders
            </Text>
          </View>
        )}

        <Text className="mt-2 text-sm font-bold text-ink/60">History</Text>
        {PLACEHOLDER_PAYOUTS.slice(1).map((payout) => (
          <PayoutWeekCard key={payout.weekLabel} payout={payout} />
        ))}
      </ScrollView>

      <BottomNavBar />
    </View>
  );
}
