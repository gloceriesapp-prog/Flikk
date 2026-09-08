// +/- stepper for avg_prep_minutes — a number a shop owner adjusts rarely
// and wants to nudge by small steps, not type digits into a bare
// TextInput. Clamped to a sane range (5-60 min) so it can't be dragged to
// something the customer app would show as a nonsense ETA.

import { Pressable, Text, View } from 'react-native';
import { MinusSignIcon, PlusSignIcon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

const MIN_MINUTES = 5;
const MAX_MINUTES = 60;
const STEP = 5;

interface Props {
  minutes: number;
  onChange: (minutes: number) => void;
}

export function PrepTimeStepper({ minutes, onChange }: Props) {
  return (
    <View className="flex-row items-center justify-between rounded-2xl border border-black/10 bg-white px-4 py-3">
      <Text className="text-[15px] font-medium text-ink/70">Avg. prep time</Text>

      <View className="flex-row items-center gap-4">
        <Pressable
          onPress={() => onChange(Math.max(MIN_MINUTES, minutes - STEP))}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <AppIcon icon={MinusSignIcon} size={15} color={colors.ink} />
        </Pressable>

        <Text className="w-16 text-center text-[17px] font-bold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
          {minutes} min
        </Text>

        <Pressable
          onPress={() => onChange(Math.min(MAX_MINUTES, minutes + STEP))}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <AppIcon icon={PlusSignIcon} size={15} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}
