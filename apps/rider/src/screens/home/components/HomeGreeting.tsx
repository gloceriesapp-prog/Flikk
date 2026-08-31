// Name + service-zone, collapsed onto one line — "Hi, Ganesh · Serving
// Kaup · Outer Udupi" reads as one identity statement instead of two
// stacked blocks. Name is a placeholder (DUMMY_RIDER_NAME,
// data/appConfig.ts's own note on why — auth is phone-only, no real name
// yet). No emoji — a real icon (AppIcon/Location01Icon) marks the zone
// instead, not a wave glyph next to the name.

import { Location01Icon } from '@hugeicons/core-free-icons';
import { Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { DUMMY_RIDER_NAME, ZONE_LABEL } from '../../../data/appConfig';

function firstName(fullName: string): string {
  return fullName.split(' ')[0];
}

export function HomeGreeting() {
  return (
    <View className="flex-row items-center gap-1.5">
      <Text className="text-[16px] font-bold text-ink">Hi, {firstName(DUMMY_RIDER_NAME)},</Text>
      <AppIcon icon={Location01Icon} size={12} color={colors.limeDeep} />
      <Text className="flex-1 text-[13px] font-semibold text-lime-deep" numberOfLines={1}>
        {ZONE_LABEL}
      </Text>
    </View>
  );
}
