// Earnings tab — trimmed to exactly three sections per an explicit ask:
// a week-navigation header, the selected week's balance, and that week's
// daily activity chart. Everything that used to be below this (stat
// tiles, the amber summary card, Withdraw Funds, the Transactions list)
// was removed wholesale, not hidden — see git history if any of it's
// needed again. bg-[#FAFAFA] matches apps/customer's own checkout screen
// background, per the same ask.

import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useActiveMsToday } from '../../hooks/useActiveMsToday';
import { useRiderOrdersStore } from '../../store/useRiderOrdersStore';
import { breakdownForToday, breakdownForWeek, getEarningsForWeek, getWeekRange, getWeeklyActivity, getWithdrawalForWeek, relativeWeekLabel, sumTipsForWeek } from '../../utils/earnings';
import { EarningsSummaryCard, type EarningsPeriod } from './components/EarningsSummaryCard';
import { EarningsWeekHeader } from './components/EarningsWeekHeader';
import { WeeklyActivityChartCard } from './components/WeeklyActivityChartCard';
import { WeeklyTransactionsCard } from './components/WeeklyTransactionsCard';

export function EarningsScreen() {
  const completedOrders = useRiderOrdersStore((s) => s.completedOrders);
  const loadSampleWeek = useRiderOrdersStore((s) => s.loadSampleWeek);
  const [weekOffset, setWeekOffset] = useState(0);
  const [period, setPeriod] = useState<EarningsPeriod>('today');
  const activeMsToday = useActiveMsToday();

  const selectedWeek = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const weeklyActivity = useMemo(() => getWeeklyActivity(completedOrders, selectedWeek), [completedOrders, selectedWeek]);
  const tipsThisWeek = useMemo(() => sumTipsForWeek(completedOrders, selectedWeek), [completedOrders, selectedWeek]);
  const weekEarnings = useMemo(() => getEarningsForWeek(completedOrders, selectedWeek), [completedOrders, selectedWeek]);
  const weekWithdrawal = useMemo(() => getWithdrawalForWeek(completedOrders, selectedWeek), [completedOrders, selectedWeek]);

  // Today = real current calendar day (independent of the paged week);
  // Week = whichever week the header has selected. See breakdownForToday's
  // own note on why Today isn't "the selected week's today."
  const todayBreakdown = useMemo(() => breakdownForToday(completedOrders), [completedOrders]);
  const weekBreakdown = useMemo(() => breakdownForWeek(completedOrders, selectedWeek), [completedOrders, selectedWeek]);
  const summaryBreakdown = period === 'today' ? todayBreakdown : weekBreakdown;

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
        <WeeklyActivityChartCard weeklyActivity={weeklyActivity} tipsThisWeek={tipsThisWeek} />

        <WeeklyTransactionsCard earnings={weekEarnings} withdrawal={weekWithdrawal} />

        {/* Preview/testing aid only — seeds a week's worth of varied
            delivered orders (useRiderOrdersStore.loadSampleWeek's own
            note) so the bar chart has something real to render. Only
            offered for the current week (weekOffset === 0) — a past week
            is real history, not something to fake data into. Deliberately
            NOT gated on weekTotal === 0: if Home's own "Load sample data"
            (or any earlier tap of this same button) already put a delivery
            or two on the board, weekTotal stops being 0 and the button
            would disappear with no way left to seed the rest of the
            week's bars — exactly the "sample data isn't showing, and I
            can't find the button to add it" bug this was hiding. */}
        {weekOffset === 0 && __DEV__ ? (
          <View className="px-5">
            <PrimaryButton label="Load sample data" onPress={loadSampleWeek} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
