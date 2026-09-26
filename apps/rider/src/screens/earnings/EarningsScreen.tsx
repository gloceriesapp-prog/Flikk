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
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useActiveMsToday } from '../../hooks/useActiveMsToday';
import {
  breakdownForToday,
  breakdownForWeek,
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
  const { data: earnings, isPending, isError, refetch } = useRiderEarnings();
  const [weekOffset, setWeekOffset] = useState(0);
  const [period, setPeriod] = useState<EarningsPeriod>('today');
  const activeMsToday = useActiveMsToday();

  const rows = earnings ?? [];
  const selectedWeek = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const weeklyActivity = useMemo(() => getWeeklyActivity(rows, selectedWeek), [rows, selectedWeek]);
  const weekEarnings = useMemo(() => getEarningsForWeek(rows, selectedWeek), [rows, selectedWeek]);

  // Today = real current calendar day (independent of the paged week);
  // Week = whichever week the header has selected. See breakdownForToday's
  // own note on why Today isn't "the selected week's today."
  const todayBreakdown = useMemo(() => breakdownForToday(rows), [rows]);
  const weekBreakdown = useMemo(() => breakdownForWeek(rows, selectedWeek), [rows, selectedWeek]);
  const summaryBreakdown = period === 'today' ? todayBreakdown : weekBreakdown;

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8F8F8]">
        <ActivityIndicator />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center gap-1 bg-[#F8F8F8] px-8">
        <Text className="text-center text-[15px] font-semibold text-ink">Couldn't load earnings</Text>
        <Text onPress={() => refetch()} className="text-center text-[13px] font-semibold text-lime-deep">
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
        <WeeklyActivityChartCard weeklyActivity={weeklyActivity} />
        <WeeklyTransactionsCard earnings={weekEarnings} />
      </ScrollView>
    </View>
  );
}
