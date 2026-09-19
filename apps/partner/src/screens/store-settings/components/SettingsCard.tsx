// Generic section wrapper — bare icon + title header, divider, content
// below. No colored circle badge behind the icon — per an explicit ask to
// drop that and keep just the logo/icon itself. Same grouped-card language
// as order-detail's "Order details" card and catalog's "Products" card,
// reused here rather than inventing a new section style for this screen.

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
    <View className="gap-3.5 rounded-3xl bg-white p-4 shadow-sm shadow-black/5">
      <View className="flex-row items-center gap-2.5">
        <AppIcon icon={icon} size={18} color={colors.ink} />
        <Text className="text-[16px] font-bold text-ink/85">{title}</Text>
      </View>
      <View className="gap-3.5 border-t border-black/5 pt-3.5">{children}</View>
    </View>
  );
}
