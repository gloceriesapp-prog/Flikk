// Reads the saved delivery address from useLocationStore (see
// src/screens/location/) and lets the user tap through to change it via the
// same LocationSearch screen used during onboarding. Two-line text stack —
// a small icon + "Delivering to" muted above the bold address + chevron.
// "Delivering to" reads clearer than the old "Deliver now" (which sat right
// above an address and read like a leftover CTA, not a label for what's
// below it). Shows the full reverse-geocoded line (addressLabel — same
// value LocationSearchScreen/geocoding.ts already resolve, just wasn't
// being displayed here before), same "Home - 123, Block A, Sector 5..."
// one-line-truncated pattern Blinkit/Instamart use in their own header —
// city alone doesn't tell a returning user *which* saved address is
// active when they have more than one in the same city.
//
// Dark text/icon — HomeHeader's background is a light pastel fill now
// (#E8E7FF), not the earlier dark gradient; the chevron was still hardcoded
// white from that era and read as invisible against the light bg.

import { ChevronDownIcon, Navigation03Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { useLocationStore } from '../../../store/useLocationStore';

interface Props {
  onPress: () => void;
}

export function LocationSelector({ onPress }: Props) {
  const location = useLocationStore((s) => s.location);
  const label = location?.addressLabel || location?.city || 'Set your location';

  return (
    <Pressable onPress={onPress} className="max-w-[230px]">
      <View className="flex-row items-center gap-1">
        <AppIcon icon={Navigation03Icon} size={12} color="rgba(255,255,255,0.6)" strokeWidth={2} />
        <Text className="text-base font-medium text-white/60">Delivering to</Text>
      </View>
      <View className="flex-row items-center gap-1">
        <Text className="text-lg font-semibold text-white" numberOfLines={1}>
          {label}
        </Text>
        <AppIcon icon={ChevronDownIcon} size={16} color={colors.ink} strokeWidth={2.2} />
      </View>
    </Pressable>
  );
}
