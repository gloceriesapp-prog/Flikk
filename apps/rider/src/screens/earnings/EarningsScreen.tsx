import { useQuery } from '@tanstack/react-query';
import { fetchRiderCashBalance, fetchRiderEarningSummary, type EarningDay } from '../../api/earnings';
import { formatCash } from '../../components/CollectCashBanner';
// Earnings tab — week-navigation header, the selected week's balance
// (base + extra-stop split), that week's daily activity chart, and a
// transactions list showing every settled order/trip that week with its
// real base vs extra-stop breakdown.
//
// Data is server-derived (GET /rider/earnings via useRiderEarnings) — one
// rider_earnings row per settled order or whole trip. No client-seeded
// sample data here anymore; the screen renders loading/error/empty states
// off the query instead. bg-[#F8F8F8] matches apps/customer's checkout bg.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useActiveMsToday } from '../../hooks/useActiveMsToday';
import {
  getEarningsForWeek,
  getWeekRange,
  getWeeklyActivity,
  relativeWeekLabel,
} from '../../utils/earnings';
import { useRiderEarnings } from './useRiderEarnings';
import { EarningsSummaryCard, type EarningsPeriod } from './components/EarningsSummaryCard';
import { EarningsWeekHeader } from './components/EarningsWeekHeader';
import { WeeklyActivityChartCard } from './components/WeeklyActivityChartCard';
import { WeeklyTransactionsCard } from './components/WeeklyTransactionsCard';

export function EarningsScreen() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [period, setPeriod] = useState<EarningsPeriod>('today');
  const activeMsToday = useActiveMsToday();

  const selectedWeek = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const from = selectedWeek.start.toISOString();
  const until = new Date(selectedWeek.start.getTime() + 7 * 86400000).toISOString();
  const query = useRiderEarnings(from, until);
  const { data: earnings, isPending, isError, refetch } = query;
  const todayRange = useMemo(() => {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const start = new Date(`${day}T00:00:00+05:30`);
    return { from: start.toISOString(), until: new Date(start.getTime() + 86400000).toISOString() };
  }, []);
  const today = useQuery({ queryKey: ['riderEarningsSummary', todayRange.from, todayRange.until], queryFn: () => fetchRiderEarningSummary(todayRange.from, todayRange.until) });
  const cash = useQuery({ queryKey: ['riderCashBalance'], queryFn: fetchRiderCashBalance });
  const total = (days: EarningDay[] = []) => days.reduce((sum, day) => ({
    total: sum.total + Number(day.total), base: sum.base + Number(day.base),
    extraStop: sum.extraStop + Number(day.extra), count: sum.count + Number(day.orders),
  }), { total: 0, base: 0, extraStop: 0, count: 0 });
  const summaryBreakdown = period === 'today' ? total(today.data) : total(query.summary.data);
  const weekEarnings = getEarningsForWeek(earnings, selectedWeek);
  // Chart values are server aggregates for the entire week, independent
  // of how many transaction pages have been loaded.
  const weeklyActivity = getWeeklyActivity([], selectedWeek).map((day, index) => {
    const date = new Date(selectedWeek.start.getTime() + index * 86400000);
    const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    return { ...day, total: Number(query.summary.data?.find(row => row.day === key)?.total ?? 0) };
  });

  if (isPending || (period === 'today' && today.isPending)) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8F8F8]">
        <ActivityIndicator />
      </View>
    );
  }

  if ((isError && earnings.length === 0) || (period === 'today' && today.isError)) {
    return (
      <View className="flex-1 items-center justify-center gap-1 bg-[#F8F8F8] px-8">
        <Text className="text-center text-[15px] font-semibold text-ink">Couldn’t load earnings</Text>
        <Text onPress={() => { void refetch(); void today.refetch(); }} className="text-center text-[13px] font-semibold text-lime-deep">
          Tap to retry
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F8F8F8]">
      <EarningsWeekHeader
        weekLabel={relativeWeekLabel(weekOffset)}
        canGoNext={weekOffset < 0}
        onPrev={() => setWeekOffset((o) => o - 1)}
        onNext={() => setWeekOffset((o) => Math.min(0, o + 1))}
      />

      {/* EarningsSummaryCard + WeeklyTransactionsCard get the screen's usual
          px-5 inset — WeeklyActivityChartCard renders full-bleed (its own
          note on why: the grid lines need to reach the actual screen edge,
          not just the edge of an inset card, to match the reference). */}
      <ScrollView className="flex-1" contentContainerClassName="gap-4 pb-28 pt-4">
        <View className="px-5">
          <EarningsSummaryCard
            period={period}
            onPeriodChange={setPeriod}
            breakdown={summaryBreakdown}
            activeMs={period === 'today' ? activeMsToday : null}
          />
        </View>
        {cash.data && cash.data.outstanding > 0 ? (
          <View className="mx-5 rounded-2xl bg-surge-soft px-4 py-3">
            <Text className="text-[15px] font-extrabold text-ink">Cash to hand over: ₹{formatCash(cash.data.outstanding)}</Text>
            <Text className="mt-0.5 text-[12px] font-medium text-ink/60">
              Collected on {cash.data.count} cash-on-delivery {cash.data.count === 1 ? 'order' : 'orders'}. Settled with the Gloceries team.
            </Text>
          </View>
        ) : null}
        <WeeklyActivityChartCard weeklyActivity={weeklyActivity} />
        <WeeklyTransactionsCard earnings={weekEarnings} />
        {query.hasNextPage && <Pressable disabled={query.isFetchingNextPage} onPress={() => { void query.fetchNextPage(); }} className="items-center py-4"><Text className="font-semibold text-lime-deep">{query.isFetchingNextPage ? 'Loading…' : query.isFetchNextPageError ? 'Retry loading more' : 'Load more transactions'}</Text></Pressable>}
      </ScrollView>
    </View>
  );
}
