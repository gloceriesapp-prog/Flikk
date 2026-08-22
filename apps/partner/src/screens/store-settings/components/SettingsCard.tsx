// Generic section wrapper — icon + title header, divider, content below.
// Same grouped-card language as order-detail's "Order details" card and
// catalog's "Products" card, reused here rather than inventing a new
// section style for this screen.

import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import type { IconSvgElement } from '@hugeicons/react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  icon: IconSvgElement;
  title: string;
  children: ReactNode;
}

export function SettingsCard({ icon, title, children }: Props) {
  return (
    <View className="gap-3 rounded-3xl bg-[#F9FAFB] p-4">
      <View className="flex-row items-center gap-2">
        <AppIcon icon={icon} size={16} color={colors.ink} />
        <Text className="text-sm font-bold text-ink/80">{title}</Text>
      </View>
      <View className="gap-3 border-t border-black/5 pt-3">{children}</View>
    </View>
  );
}
