// One row in ProfileScreen's menu list — flat, not a card row. Matches the
// Blinkit reference screenshot's own "Other information" section per an
// explicit ask: neutral gray icon circle (not this app's lime badge),
// plain white page background behind every row, generous vertical
// spacing instead of a shared card + hairline dividers, no chevron. Same
// swap applies to every section now, not just this one — a lone lime-badge
// section next to flat gray ones would read as inconsistent, not premium.

import type { IconSvgElement } from '@hugeicons/react-native';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  icon: IconSvgElement;
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function ProfileMenuRow({ icon, label, onPress, danger = false, disabled = false }: Props) {
  return (
    <Pressable onPress={onPress} disabled={disabled} className="flex-row items-center gap-3.5 py-2">
      <View className={`h-10 w-10 items-center justify-center rounded-full ${danger ? 'bg-danger/10' : 'bg-gray-100'}`}>
        <AppIcon icon={icon} size={18} color={danger ? colors.danger : `${colors.ink}CC`} strokeWidth={1.7} />
      </View>
      <Text className={`text-[15px] font-medium ${danger ? 'text-danger' : 'text-ink'}`}>{label}</Text>
    </Pressable>
  );
}
