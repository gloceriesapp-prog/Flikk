// Reads the saved delivery address from useLocationStore (see
// src/screens/location/) and lets the user tap through to change it via the
// same LocationSearch screen used during onboarding. Circular icon badge +
// "Current Location" label above the address — matches the reference.

import { ChevronDownIcon, Location01Icon } from '@hugeicons/core-free-icons';
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
    <Pressable onPress={onPress} className="flex-row items-center gap-3">
      <View className="h-10 w-10 items-center justify-center bg-gray-50 rounded-full">
        <AppIcon icon={Location01Icon} size={18} color={colors.ink} />
      </View>

      <View className="max-w-[190px]">
        <Text className="text-xs font-medium text-ink/60">Current Location</Text>
        <View className="flex-row items-center gap-1">
          <Text className="text-[15px] font-semibold text-ink" numberOfLines={1}>
            {label}
          </Text>
          <AppIcon icon={ChevronDownIcon} size={13} color={colors.ink} />
        </View>
      </View>
    </Pressable>
  );
}
