// Dashboard — the online/offline toggle lives here (not buried in
// Profile/Settings), same as every real rider app: this is the single
// control that decides whether new orders can reach this rider at all.
// Below it: today's snapshot (deliveries done, earnings so far — reads
// useRiderOrdersStore.completedOrders, real local state) and, once an
// order is active, a banner straight into it instead of making the rider
// dig through the Orders tab to find what they're already doing.

import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRiderOrdersStore } from '../../store/useRiderOrdersStore';
import { ActiveDeliveryCard } from './components/ActiveDeliveryCard';
import { DeliveryHistoryRow } from './components/DeliveryHistoryRow';
import { FilterChipRow, type DeliveryFilter } from './components/FilterChipRow';
import { GoalProgressCard } from './components/GoalProgressCard';
import { HomeGreeting } from './components/HomeGreeting';
import { LastRatingCallout } from './components/LastRatingCallout';
import { MaintenanceBanner } from './components/MaintenanceBanner';
import { PerformanceRow } from './components/PerformanceRow';
import { StatCard } from './components/StatCard';
import { StatusHeaderBar } from './components/StatusHeaderBar';
import { WeeklyEarningsStrip } from './components/WeeklyEarningsStrip';
import { useElapsedMs } from '../../hooks/useElapsedMs';
import { formatDurationShort, isToday, isWithinLastDays } from '../../utils/date';
import { computePerformanceStats } from '../../utils/performance';
import type { AppStackParamList, AppTabParamList } from '../../navigation/types';

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const tabNavigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const isOnline = useRiderOrdersStore((s) => s.isOnline);
  const onlineSince = useRiderOrdersStore((s) => s.onlineSince);
  const goOnline = useRiderOrdersStore((s) => s.goOnline);
  const goOffline = useRiderOrdersStore((s) => s.goOffline);
  const activeOrders = useRiderOrdersStore((s) => s.activeOrders);
  const completedOrders = useRiderOrdersStore((s) => s.completedOrders);
  const cancelledOrders = useRiderOrdersStore((s) => s.cancelledOrders);
  const todayOrders = completedOrders.filter((order) => order.deliveredAt && isToday(order.deliveredAt));
  const weekOrders = completedOrders.filter((order) => order.deliveredAt && isWithinLastDays(order.deliveredAt, 7));
  // "Earned" is the fare only (its own card); tips get their own card
  // instead of being folded silently in — a real tip is the customer's own
  // money on top of the fare, not part of what the delivery itself earned
  // (data/mockOrders.ts's own note), so a rider should be able to tell the
  // two apart at a glance, not just see one merged number.
  const todayEarnings = todayOrders.reduce((sum, order) => sum + order.payout, 0);
  const weekEarnings = weekOrders.reduce((sum, order) => sum + order.payout, 0);
  const todayTips = todayOrders.reduce((sum, order) => sum + (order.tip ?? 0), 0);
  const performanceStats = computePerformanceStats(completedOrders, cancelledOrders);
  const onlineElapsedMs = useElapsedMs(onlineSince);
  const [filter, setFilter] = useState<DeliveryFilter>('all');

  const showActive = filter === 'all' || filter === 'active';
  const showCompleted = filter === 'all' || filter === 'completed';
  const showCancelled = filter === 'all' || filter === 'cancelled';
  const hasAnything = activeOrders.length + todayOrders.length + cancelledOrders.length > 0;
  const selectedCount =
    filter === 'active' ? activeOrders.length : filter === 'completed' ? todayOrders.length : filter === 'cancelled' ? cancelledOrders.length : 1;

  return (
    <ScrollView className="flex-1 bg-gray-100" contentContainerClassName="gap-3 px-5 pb-28 pt-safe-offset-4">
      <MaintenanceBanner />
      <HomeGreeting />

      {/* The one control this whole screen exists for, plus always-reachable
          Help/SOS — matches real rider apps keeping these on Home, not
          buried in Profile/Settings. */}
      <StatusHeaderBar isOnline={isOnline} onToggle={(value) => (value ? goOnline() : goOffline())} />
      <Text className="-mt-2 px-1 text-[12.5px] text-ink/45">
        {isOnline ? 'Ready to receive new orders' : 'Go online to start getting orders'}
      </Text>

      <View className="flex-row gap-2">
        <StatCard value={todayOrders.length} label="Deliveries" />
        <StatCard value={`₹${todayEarnings}`} label="Earned today" />
        <StatCard value={formatDurationShort(onlineElapsedMs)} label="Online for" />
        <StatCard value={`₹${todayTips}`} label="Tips" />
      </View>

      <PerformanceRow stats={performanceStats} />

      <GoalProgressCard todayEarnings={todayEarnings} />

      <WeeklyEarningsStrip
        weekTotal={weekEarnings}
        onPress={() => tabNavigation.navigate('Earnings', { initialRange: 'week' })}
      />

      {completedOrders[0] ? <LastRatingCallout order={completedOrders[0]} /> : null}

      <FilterChipRow
        value={filter}
        onChange={setFilter}
        counts={{
          all: activeOrders.length + todayOrders.length + cancelledOrders.length,
          active: activeOrders.length,
          completed: todayOrders.length,
          cancelled: cancelledOrders.length,
        }}
      />

      {!hasAnything || selectedCount === 0 ? (
        <View className="items-center gap-1 rounded-2xl border border-gray-100 bg-white px-6 py-10">
          <Text className="text-center text-base font-semibold text-ink">Nothing here yet</Text>
          <Text className="text-center text-[13px] text-ink/50">
            {filter === 'all' ? 'Deliveries you accept today will show up here.' : `No ${filter} deliveries yet.`}
          </Text>
        </View>
      ) : (
        <>
          {showActive && activeOrders.length > 0 ? (
            <View className="gap-2.5">
              {filter === 'all' ? <Text className="px-1 text-xs font-bold uppercase tracking-wide text-ink/40">Active</Text> : null}
              {activeOrders.map((order) => (
                <ActiveDeliveryCard key={order.id} order={order} onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })} />
              ))}
            </View>
          ) : null}

          {showCompleted && todayOrders.length > 0 ? (
            <View className="gap-2">
              {filter === 'all' ? <Text className="px-1 text-xs font-bold uppercase tracking-wide text-ink/40">Completed</Text> : null}
              {todayOrders.map((order) => (
                <DeliveryHistoryRow key={order.id} order={order} />
              ))}
            </View>
          ) : null}

          {showCancelled && cancelledOrders.length > 0 ? (
            <View className="gap-2">
              {filter === 'all' ? <Text className="px-1 text-xs font-bold uppercase tracking-wide text-ink/40">Cancelled</Text> : null}
              {cancelledOrders.map((order) => (
                <DeliveryHistoryRow key={order.id} order={order} />
              ))}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
