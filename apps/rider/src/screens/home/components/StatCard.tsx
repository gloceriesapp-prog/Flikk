// One shared card for all four Home stats (deliveries/earnings/online
// time/tips). No icon — the number is the whole point, an icon just
// repeats what the label already says. Label sits above the value (small,
// normal-case, muted) rather than below in caps — reads closer to a plain
// stat sheet than a shouted badge. adjustsFontSizeToFit on both lines is
// what guarantees no wrap regardless of value length ("2h 11m" vs "0").

import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

interface Props {
  value: ReactNode;
  label: string;
}

export function StatCard({ value, label }: Props) {
  return (
    <View className="flex-1 gap-1 rounded-2xl  bg-white px-2.5 py-3">
      <Text className="text-[11px] font-medium text-ink/45" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label}
      </Text>
      <Text
        className="text-[19px] font-medium text-ink"
        style={{ fontVariant: ['tabular-nums'] }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.55}
      >
        {value}
      </Text>
    </View>
  );
}
