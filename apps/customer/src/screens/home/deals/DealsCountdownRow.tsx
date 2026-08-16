// Content only — see DealsBannerCard.tsx for why. Countdown target is a
// stable Date (end of today), created once via useState's lazy initializer —
// not useRef, reading ref.current during render is unsafe (React Compiler
// flags it); useState's initializer is the correct tool for "compute once,
// read during render."

import { PercentIcon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { useCountdown } from './useCountdown';

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export function DealsCountdownRow() {
  const [target] = useState(endOfToday);
  const { hours, minutes, seconds } = useCountdown(target);

  return (
    <View className="flex-row items-center justify-between p-4">
      <View className="flex-row items-center gap-2">
        <Text className="text-xs text-ink/70">Deals end in</Text>
        <Text className="text-sm font-extrabold tabular-nums text-danger">
          {hours}:{minutes}:{seconds}
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        <View>
          <Text className="text-right text-xs font-semibold text-ink">Shop early, save more</Text>
          <Text className="text-right text-[11px] text-ink/55">New deals every week</Text>
        </View>
        <View className="h-7 w-7 items-center justify-center rounded-full bg-coral">
          <AppIcon icon={PercentIcon} size={14} color="#FFFFFF" />
        </View>
      </View>
    </View>
  );
}
