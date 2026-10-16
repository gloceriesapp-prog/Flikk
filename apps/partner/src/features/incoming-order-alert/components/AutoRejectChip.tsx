// The foreground attention window closes this alert; only the backend's
// authoritative acceptance deadline can reject an unanswered order.

import { Clock01Icon } from '@hugeicons/core-free-icons';
import { Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';

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
      <View className="flex-row items-center gap-1.5 rounded-full bg-white px-3 py-1.5">
        <AppIcon icon={Clock01Icon} size={13} color="#000000" />
        <Text className="text-[13px] font-semibold text-black" style={{ fontVariant: ['tabular-nums'] }}>
          {formatCountdown(secondsLeft)}
        </Text>
      </View>
      <Text className="text-[11px] font-medium text-black/50">Alert closes in</Text>
    </View>
  );
}
