// Top-of-Home block: ETA, location, avatar, search. Everything below this is
// the future browse/discovery surface (PRD C3/C4) — not built yet.
//
// Background is a lime -> transparent vertical gradient over a white base,
// not a flat fill — strong lime at the very top, fading out by the time it
// reaches the search bar, so the search bar's white pill and the page below
// both read as "the same surface," not a hard color seam.
//
// ETA/location and the avatar both collapse away on scroll
// (CollapsibleHeaderTop / CollapsibleAvatar) — search and category tabs
// stay fixed.

import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { SharedValue } from 'react-native-reanimated';
import { colors } from '../../../theme/tokens';
import { CollapsibleAvatar } from './CollapsibleAvatar';
import { CollapsibleHeaderTop } from './CollapsibleHeaderTop';
import { HomeSearchBar } from './HomeSearchBar';
import { CategoryTabs } from './CategoryTabs';

interface Props {
  onChangeLocation: () => void;
  onOpenSearch: () => void;
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  scrollY: SharedValue<number>;
}

export function HomeHeader({
  onChangeLocation,
  onOpenSearch,
  selectedCategoryId,
  onSelectCategory,
  scrollY,
}: Props) {
  return (
    <View className="overflow-hidden rounded-b-[28px] bg-white">
      {/* LinearGradient isn't one of NativeWind's auto-patched components — a
          className here is silently ignored, so positioning must go through
          the real style prop or the gradient collapses to zero size. */}
      <LinearGradient
        colors={[colors.lime, `${colors.lime}00`]}
        locations={[0, 0.85]}
        style={StyleSheet.absoluteFill}
      />

      <View className="pb-4 pt-safe">
        <View className="flex-row items-start justify-between px-6 pt-2">
          <View className="flex-1">
            <CollapsibleHeaderTop scrollY={scrollY} onChangeLocation={onChangeLocation} />
          </View>
          <CollapsibleAvatar scrollY={scrollY} />
        </View>

        <View className="px-6">
          <HomeSearchBar onPress={onOpenSearch} />
        </View>

        <CategoryTabs selectedId={selectedCategoryId} onSelect={onSelectCategory} />
      </View>
    </View>
  );
}
