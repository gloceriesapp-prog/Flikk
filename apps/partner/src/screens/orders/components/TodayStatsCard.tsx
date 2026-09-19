// Three separate bordered boxes side by side, per the sketch reference —
// not one card split by internal dividers (the previous version). Each box
// owns its own rounded border; a small gap between them (not a shared
// edge) is what reads as "3 distinct boxes" instead of one segmented card.
// Label sits small top-left, the number large and bold below it — same
// layout the sketch shows for every box.
//
// Every value is real GET /partner/stats/today (OrdersScreen.tsx, api/
// stats.ts) — a real IST-calendar-day-scoped server computation, not
// derived from useOrdersStore's queue (that queue has no date scoping at
// all, which is why "Orders today" never actually meant "today" before
// this). earningTotal specifically only ever counts orders that reached
// 'delivered' — a cancelled or refunded order never gets there, so it can
// never inflate this number (backend route's own note on exactly why).

import { Text, View } from 'react-native';

interface Props {
  orderCount: number;
  pendingCount: number;
  earningTotal: number;
}

interface StatBoxProps {
  label: string;
  value: string;
}

function StatBox({ label, value }: StatBoxProps) {
  return (
    <View className="flex-1 gap-0.5 rounded-2xl bg-white px-4 py-3.5 shadow-sm shadow-black/5">
      <Text className="text-sm font-medium tracking-tight text-ink/60" numberOfLines={1}>
        {label}
      </Text>
      <Text className="text-2xl font-semibold text-ink" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function TodayStatsCard({ orderCount, pendingCount, earningTotal }: Props) {
  return (
    <View className="mx-5 flex-row gap-3">
      <StatBox label="Orders today" value={String(orderCount)} />
      <StatBox label="Today's earning" value={`₹${earningTotal}`} />
      <StatBox label="Pending" value={String(pendingCount)} />
    </View>
  );
}
