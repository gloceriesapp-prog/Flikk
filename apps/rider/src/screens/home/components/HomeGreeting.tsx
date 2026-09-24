// Name + service-zone, collapsed onto one line — "Hi, Ganesh · Serving
// Kaup · Outer Udupi" reads as one identity statement instead of two
// stacked blocks. Name is the rider's real name from GET /rider/profile
// (useRiderProfile) — falls back to "Rider" until that fetch resolves or
// for a rider who hasn't set a name (auth is phone-only, so name is
// nullable). No emoji — a real icon (AppIcon/Location01Icon) marks the
// zone instead, not a wave glyph next to the name.

import { Location01Icon } from '@hugeicons/core-free-icons';
import { Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { ZONE_LABEL } from '../../../data/appConfig';
import { useRiderProfile } from '../../profile/useRiderProfile';

function firstName(fullName: string): string {
  return fullName.split(' ')[0];
}

export function HomeGreeting() {
  const { data: profile } = useRiderProfile();
  const name = profile?.name || 'Rider';
  return (
    <View className="flex-row items-center gap-1.5">
      <Text className="text-[16px] font-semibold text-ink">Hi, {firstName(name)},</Text>
      <AppIcon icon={Location01Icon} size={12} color={colors.limeDeep} />
      <Text className="flex-1 text-[13px] font-medium text-lime-deep" numberOfLines={1}>
        {ZONE_LABEL}
      </Text>
    </View>
  );
}
