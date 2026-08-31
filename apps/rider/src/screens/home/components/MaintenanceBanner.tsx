// Soft, dismissible notice — never a blocking screen (see
// data/appConfig.ts's own note). Dismissal is local component state, not
// persisted — reappears next cold start, which is fine for a rare,
// short-lived notice like "app update available" or "brief slowdown
// expected."

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Cancel01Icon, InformationCircleIcon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { MAINTENANCE_MESSAGE } from '../../../data/appConfig';

export function MaintenanceBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (!MAINTENANCE_MESSAGE || dismissed) return null;

  return (
    <View className="flex-row items-start gap-2.5 rounded-2xl bg-gold/15 px-4 py-3">
      <AppIcon icon={InformationCircleIcon} size={16} color={colors.gold} />
      <Text className="flex-1 text-[12.5px] font-medium text-ink/75">{MAINTENANCE_MESSAGE}</Text>
      <Pressable onPress={() => setDismissed(true)} hitSlop={8}>
        <AppIcon icon={Cancel01Icon} size={14} color={`${colors.ink}80`} />
      </Pressable>
    </View>
  );
}
