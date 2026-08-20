// Three separate bordered boxes side by side, per the sketch reference —
// not one card split by internal dividers (the previous version). Each box
// owns its own rounded border; a small gap between them (not a shared
// edge) is what reads as "3 distinct boxes" instead of one segmented card.
// Label sits small top-left, the number large and bold below it — same
// layout the sketch shows for every box. All values derived live from
// today's PLACEHOLDER_ORDERS (see OrdersScreen.tsx), not separate
// hardcoded numbers that could drift out of sync with the queue below it.

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
    <View className="flex-1 gap-1 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm shadow-black/5">
      <Text className="text-xs font-semibold text-ink/50" numberOfLines={1}>
        {label}
      </Text>
      <Text className="text-2xl font-extrabold text-ink" numberOfLines={1}>
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
