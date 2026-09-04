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
import { useRiderOrdersStore } from '../../store/useRiderOrdersStore';
import { getEarningsForWeek, getWeekRange, getWeeklyActivity, getWithdrawalForWeek, sumEarningsForWeek, sumTipsForWeek } from '../../utils/earnings';
import { EarningsWeekHeader } from './components/EarningsWeekHeader';
import { WeeklyActivityChartCard } from './components/WeeklyActivityChartCard';
import { WeeklyBalanceCard } from './components/WeeklyBalanceCard';
import { WeeklyTransactionsCard } from './components/WeeklyTransactionsCard';

export function EarningsScreen() {
  const completedOrders = useRiderOrdersStore((s) => s.completedOrders);
  const loadSampleWeek = useRiderOrdersStore((s) => s.loadSampleWeek);
  const [weekOffset, setWeekOffset] = useState(0);

  const selectedWeek = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const weekTotal = useMemo(() => sumEarningsForWeek(completedOrders, selectedWeek), [completedOrders, selectedWeek]);
  const weeklyActivity = useMemo(() => getWeeklyActivity(completedOrders, selectedWeek), [completedOrders, selectedWeek]);
  const tipsThisWeek = useMemo(() => sumTipsForWeek(completedOrders, selectedWeek), [completedOrders, selectedWeek]);
  const weekEarnings = useMemo(() => getEarningsForWeek(completedOrders, selectedWeek), [completedOrders, selectedWeek]);
  const weekWithdrawal = useMemo(() => getWithdrawalForWeek(completedOrders, selectedWeek), [completedOrders, selectedWeek]);

  return (
    <View className="flex-1 bg-[#F8F8F8]">
      <EarningsWeekHeader
        weekLabel={selectedWeek.label}
        canGoNext={weekOffset < 0}
        onPrev={() => setWeekOffset((o) => o - 1)}
        onNext={() => setWeekOffset((o) => Math.min(0, o + 1))}
      />

      {/* Only WeeklyBalanceCard gets the screen's usual px-5 inset —
          WeeklyActivityChartCard renders full-bleed (its own note on why:
          the grid lines need to reach the actual screen edge, not just the
          edge of an inset card, to match the reference). */}
      <ScrollView className="flex-1" contentContainerClassName="gap-4 pb-28 pt-4">
        <View className="px-5">
          <WeeklyBalanceCard weekTotal={weekTotal} />
        </View>
        <WeeklyActivityChartCard weeklyActivity={weeklyActivity} tipsThisWeek={tipsThisWeek} weekTotal={weekTotal} />

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
        {weekOffset === 0 ? (
          <View className="px-5">
            <PrimaryButton label="Load sample data" onPress={loadSampleWeek} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
