// Reads the saved delivery address from useLocationStore (see
// src/screens/location/) and lets the user tap through to change it via the
// same LocationSearch screen used during onboarding. Plain two-line text
// stack (no icon badge) — "Deliver now" muted above the bold address +
// chevron, matching the reference exactly. Shows only the city, not the
// full street address — location.city is set at the source (geocoding.ts's
// own reverse-geocode result), not parsed back out of addressLabel here.
//
// White/light text — HomeHeader's background is a dark radial gradient,
// not a light pastel one.

import { ChevronDownIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { useLocationStore } from '../../../store/useLocationStore';

interface Props {
  onPress: () => void;
}

export function LocationSelector({ onPress }: Props) {
  const location = useLocationStore((s) => s.location);
  const label = location?.city || 'Set your location';

  return (
    <Pressable onPress={onPress} className="max-w-[190px]">
      <Text className="text-base font-medium text-white/60">Deliver now</Text>
      <View className="flex-row items-center gap-1">
        <Text className="text-lg font-semibold text-white" numberOfLines={1}>
          {label}
        </Text>
        <AppIcon icon={ChevronDownIcon} size={16} color="#FFFFFF" strokeWidth={2.2} />
      </View>
    </Pressable>
  );
}
