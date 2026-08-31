// "This week: ₹X" — riders check Home far more often than the Earnings
// tab, so the week total belongs here too, not only one tap away. Reads
// the same completedOrders array EarningsScreen does (isWithinLastDays 7),
// no separate weekly total kept in the store to drift out of sync. Tap
// jumps straight to Earnings' week tab via the initialRange param
// (navigation/types.ts's own note).

import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  weekTotal: number;
  onPress: () => void;
}

export function WeeklyEarningsStrip({ weekTotal, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3.5"
    >
      <View>
        <Text className="text-[11px] font-semibold uppercase tracking-wide text-ink/40">This week</Text>
        <Text className="mt-0.5 text-[19px] font-extrabold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
          ₹{weekTotal}
        </Text>
      </View>
      <View className="flex-row items-center gap-1">
        <Text className="text-[12.5px] font-semibold text-ink/45">View earnings</Text>
        <AppIcon icon={ArrowRight01Icon} size={14} color={colors.ink} />
      </View>
    </Pressable>
  );
}
