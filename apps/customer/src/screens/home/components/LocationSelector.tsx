// Reads the saved delivery address from useLocationStore (see
// src/screens/location/) and lets the user tap through to change it via the
// same LocationSearch screen used during onboarding.

import { ChevronDownIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { useLocationStore } from '../../../store/useLocationStore';

interface Props {
  onPress: () => void;
}

export function LocationSelector({ onPress }: Props) {
  const location = useLocationStore((s) => s.location);
  const label = location?.addressLabel ?? 'Set your location';

  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-1">
      <View className="max-w-[180px]">
        <Text className="text-[15px] font-bold text-ink" numberOfLines={1}>
          {label}
        </Text>
      </View>
      <AppIcon icon={ChevronDownIcon} size={14} color={colors.ink} />
    </Pressable>
  );
}
