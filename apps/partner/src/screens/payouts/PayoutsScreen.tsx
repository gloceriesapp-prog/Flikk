// Payouts (P5) — read-only. No `GET /partner/payouts` call yet, same
// no-auth caveat as ../orders/OrdersScreen.tsx. This screen must never
// compute a payout figure client-side — see data.ts.

import { useState } from 'react';
import { Pressable, Text, ScrollView, View } from 'react-native';
import { HeadphonesIcon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { PLACEHOLDER_PAYOUTS } from './data';
import { CurrentWeekPayoutCard } from './components/CurrentWeekPayoutCard';
import { PayoutStatusFilter, type PayoutStatusFilterValue } from './components/PayoutStatusFilter';
import { PayoutWeekCard } from './components/PayoutWeekCard';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Payouts'>;

export function PayoutsScreen(_props: Props) {
  const [statusFilter, setStatusFilter] = useState<PayoutStatusFilterValue>('all');
  const currentWeek = PLACEHOLDER_PAYOUTS[0];
  const history = PLACEHOLDER_PAYOUTS.slice(1);
  const paidCount = PLACEHOLDER_PAYOUTS.filter((p) => p.status === 'paid').length;
  const pendingCount = PLACEHOLDER_PAYOUTS.filter((p) => p.status === 'pending').length;
  const visibleHistory = history.filter((payout) => statusFilter === 'all' || payout.status === statusFilter);

  return (
    <View className="flex-1 bg-white pt-safe">
      {/* One line, not an eyebrow + separate title — settlement already
          happens automatically every week by default, so the header
          doesn't need to explain that twice ("Payouts" / "Weekly
          settlements" said the same thing in two sizes). */}
      <View className="flex-row items-center justify-between px-5 pb-4 pt-3">
        <Text className="text-2xl font-semibold text-ink">Payouts</Text>

        {/* Support — the one thing a shop owner reaches for when a
            settlement figure looks wrong. No backend/contact flow yet
            (specs/05-platform doesn't cover one) — stubbed rather than
            silently doing nothing, same convention as the notification
            bell on the Orders screen. */}
        <Pressable
          onPress={() => {}}
          className="h-11 w-11 items-center justify-center rounded-full bg-gray-100"
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <AppIcon icon={HeadphonesIcon} size={19} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pb-28">
        {currentWeek && <CurrentWeekPayoutCard payout={currentWeek} />}

        <View className="mt-3 gap-3">
        
          <PayoutStatusFilter
            options={[
              { value: 'all', label: 'All', count: PLACEHOLDER_PAYOUTS.length },
              { value: 'paid', label: 'Paid', count: paidCount },
              { value: 'pending', label: 'Pending', count: pendingCount },
            ]}
            selected={statusFilter}
            onSelect={setStatusFilter}
          />
          <Text className="text-base font-semibold text-ink/60">Transaction History</Text>
        </View>

        {visibleHistory.length > 0 ? (
          visibleHistory.map((payout) => <PayoutWeekCard key={payout.weekLabel} payout={payout} />)
        ) : (
          <View className="items-center gap-1 py-10">
            <Text className="text-sm font-semibold text-ink">No settlements here</Text>
            <Text className="text-center text-xs text-ink/50">
              {statusFilter === 'pending'
                ? 'Nothing pending in your past settlements — only this week is still on its way.'
                : 'No paid settlements yet.'}
            </Text>
          </View>
        )}
      </ScrollView>

      <BottomNavBar />
    </View>
  );
}
