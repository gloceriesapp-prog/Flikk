// The big balance display — split out of EarningsWeekHeader.tsx into its
// own file per an explicit ask, so the nav row and the number it's
// controlling aren't coupled in one component. "Dark white" card per the
// same ask: an off-white fill (#F3F2ED, not pure #FFFFFF), no border, no
// shadow — flat, not elevated.

import { Text, View } from 'react-native';

interface Props {
  weekTotal: number;
}

export function WeeklyBalanceCard({ weekTotal }: Props) {
  return (
    <View className="items-center gap-1.5 rounded-3xl px-5 py-7">
      <Text className="text-[38px] font-extrabold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
        ₹{weekTotal.toLocaleString('en-IN')}
      </Text>
      <Text className="text-[12px] font-medium uppercase tracking-wider text-ink/40">Your weekly earnings</Text>
    </View>
  );
}
