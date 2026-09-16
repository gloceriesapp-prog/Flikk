// One tile — light blue rounded-square backdrop + icon, per the reference
// UI. Icon/label are the exact same ones HomeHeader's own top CategoryTabs
// row uses for this tab (iconForTabName, categoryTabs.ts) — not a second,
// possibly-drifting icon mapping. Tapping calls onSelectCategory, the same
// setSelectedCategoryId HomeScreen already threads into CategoryTabs, so
// this tile switches Home's real tab body — it doesn't navigate anywhere.

import type { IconSvgElement } from '@hugeicons/react-native';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';

const TILE_WIDTH = 76;
// Light periwinkle-blue — this strip's own tile bg, per the reference UI.
const TILE_BG = '#E9EEFB';

interface Props {
  label: string;
  icon: IconSvgElement;
  onPress: () => void;
}

export function QuickCategoryTile({ label, icon, onPress }: Props) {
  return (
    <Pressable onPress={onPress} className="items-center gap-1.5" style={{ width: TILE_WIDTH }}>
      <View className="aspect-square w-full items-center justify-center rounded-2xl" style={{ backgroundColor: TILE_BG }}>
        <AppIcon icon={icon} size={30} color="#3B4A9C" strokeWidth={1.6} />
      </View>
      <Text className="text-center text-[12.5px] font-semibold text-ink" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
