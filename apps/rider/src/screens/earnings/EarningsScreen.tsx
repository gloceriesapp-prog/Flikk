// Today's payout summary + a per-delivery breakdown — reads
// useRiderOrdersStore.completedOrders directly, which is now the full
// persisted history (that store's own note), not just today's session.
// A Today/Week/All-time segmented view sits on top of the same array
// instead of three separate stores to keep in sync — "where did my money
// go" (the #1 driver of gig-app 1-star reviews) needs an answer that goes
// beyond "today," so All-time exists specifically for payout disputes
// about an order from days ago.

import { useMemo, useState } from 'react';
import { CheckmarkCircle02Icon, StarIcon, Wallet01Icon } from '@hugeicons/core-free-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { useRiderOrdersStore } from '../../store/useRiderOrdersStore';
import { isToday, isWithinLastDays } from '../../utils/date';
import type { AppTabParamList } from '../../navigation/types';

type RangeTab = 'today' | 'week' | 'all';
const TABS: { id: RangeTab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'all', label: 'All time' },
];

export function EarningsScreen() {
  const completedOrders = useRiderOrdersStore((s) => s.completedOrders);
  const route = useRoute<RouteProp<AppTabParamList, 'Earnings'>>();
  const [tab, setTab] = useState<RangeTab>(route.params?.initialRange ?? 'today');

  const filtered = useMemo(() => {
    return completedOrders.filter((order) => {
      if (!order.deliveredAt) return false;
      if (tab === 'today') return isToday(order.deliveredAt);
      if (tab === 'week') return isWithinLastDays(order.deliveredAt, 7);
      return true;
    });
  }, [completedOrders, tab]);

  // True take-home = fare + tip — this hero total is the authoritative
  // "what did I actually make" figure, unlike Home's separate Earned/Tips
  // cards which deliberately keep the two apart for a quick glance
  // (screens/home/HomeScreen.tsx's own note).
  const totalEarnings = filtered.reduce((sum, order) => sum + order.payout + (order.tip ?? 0), 0);
  const totalTips = filtered.reduce((sum, order) => sum + (order.tip ?? 0), 0);

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View className="bg-white px-5 pb-4 pt-safe-offset-4">
        <Text className="text-xl font-bold text-ink">Earnings</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-4 px-5 pb-28 pt-4">
        <View className="items-center gap-1 rounded-3xl bg-ink py-8">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-lime">
            <AppIcon icon={Wallet01Icon} size={20} color={colors.ink} />
          </View>
          <Text className="mt-2 text-3xl font-bold text-white">₹{totalEarnings}</Text>
          <Text className="text-[13px] text-white/55">
            {filtered.length} {filtered.length === 1 ? 'delivery' : 'deliveries'}
            {totalTips > 0 ? ` · ₹${totalTips} in tips` : ''}
          </Text>
        </View>

        {/* Payout schedule — even a mock, unexplained-payout-timing is its
            own class of 1-star review distinct from unexplained-amount. */}
        <View className="rounded-2xl border border-gray-100 px-4 py-3">
          <Text className="text-[12.5px] text-ink/50">Paid out every Monday, straight to your linked bank account.</Text>
        </View>

        <View className="flex-row gap-2 rounded-2xl bg-white p-1">
          {TABS.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              className={`flex-1 items-center rounded-xl py-2.5 ${tab === t.id ? 'bg-ink' : ''}`}
            >
              <Text className={`text-[13px] font-semibold ${tab === t.id ? 'text-white' : 'text-ink/50'}`}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {filtered.length === 0 ? (
          <View className="items-center gap-1 rounded-2xl bg-white px-6 py-10">
            <Text className="text-center text-base font-semibold text-ink">No deliveries in this range yet</Text>
            <Text className="text-center text-[13px] text-ink/50">Finish a delivery to see it show up here.</Text>
          </View>
        ) : (
          <View className="gap-2">
            <Text className="px-1 text-xs font-bold uppercase tracking-wide text-ink/40">Deliveries</Text>
            {filtered.map((order) => (
              <View key={order.id} className="gap-2 rounded-2xl bg-white p-4">
                <View className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-lime-soft">
                    <AppIcon icon={CheckmarkCircle02Icon} size={16} color={colors.limeDeep} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-bold text-ink">{order.orderNumber}</Text>
                    <Text className="text-[12px] text-ink/45">{order.customerName}</Text>
                  </View>
                  {order.customerRating ? (
                    <View className="flex-row items-center gap-1">
                      <AppIcon icon={StarIcon} size={12} color={colors.gold} />
                      <Text className="text-[12px] font-semibold text-ink/60">{order.customerRating}</Text>
                    </View>
                  ) : null}
                  <Text className="ml-1 text-[15px] font-bold text-ink">₹{order.payout + (order.tip ?? 0)}</Text>
                </View>
                {/* Same itemized breakup as OrderDetailScreen (base/
                    distance/surge) plus tip — the total above should never
                    appear without its own math nearby. */}
                <View className="flex-row flex-wrap gap-3 border-t border-mist pt-2">
                  <Text className="text-[11.5px] text-ink/40">Base ₹{order.baseFare}</Text>
                  <Text className="text-[11.5px] text-ink/40">Distance ₹{order.distanceFare}</Text>
                  {order.surge > 0 ? (
                    <Text className="rounded bg-surge-soft px-1.5 py-0.5 text-[11.5px] font-semibold text-surge">
                      Surge +₹{order.surge}
                    </Text>
                  ) : null}
                  {order.tip ? (
                    <Text className="rounded bg-lime-soft px-1.5 py-0.5 text-[11.5px] font-semibold text-lime-deep">
                      Tip +₹{order.tip}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
