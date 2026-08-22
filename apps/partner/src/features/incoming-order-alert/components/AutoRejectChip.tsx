// The countdown, read as a digital "01:00" chip — not a ring, not a bar,
// matching the reference exactly. Real mm:ss formatting, not a fixed
// "00:" prefix — the timer now starts at a full minute (AUTO_DECLINE_SECONDS
// in useIncomingOrderAlert.ts), so a plain zero-padded seconds string would
// print "00:60" at the very start instead of "01:00".

import { Clock01Icon } from '@hugeicons/core-free-icons';
import { Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  secondsLeft: number;
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function AutoRejectChip({ secondsLeft }: Props) {
  return (
    <View className="items-end gap-1">
      <View className="flex-row items-center gap-1.5 rounded-full bg-lime-soft px-3 py-1.5">
        <AppIcon icon={Clock01Icon} size={13} color={colors.limeDeep} />
        <Text className="text-sm font-bold text-lime-deep" style={{ fontVariant: ['tabular-nums'] }}>
          {formatCountdown(secondsLeft)}
        </Text>
      </View>
      <Text className="text-sm font-medium text-ink/60">Auto reject in</Text>
    </View>
  );
}
