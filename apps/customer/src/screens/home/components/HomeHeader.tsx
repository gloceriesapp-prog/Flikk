// Top-of-Home block: ETA, location, avatar, search. Everything below this is
// the future browse/discovery surface (PRD C3/C4) — not built yet.
//
// Background is a #FFC857 -> #FFE58F -> transparent vertical gradient, strong
// at the bottom (nearest the search bar) fading to nothing by the top — a
// deliberate departure from specs/00-foundation/design-system.md's
// "not yellow (Blinkit)" rule, per an explicit ask with exact hex values.
// Not the earlier lime gradient; if this needs reverting, the old values
// were `colors.lime` -> transparent, strong at the *top* instead.
//
// ETA/location and the avatar both collapse away on scroll
// (CollapsibleHeaderTop / CollapsibleAvatar) — search and category tabs
// stay fixed.

import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { SharedValue } from 'react-native-reanimated';
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
  // Home shows the category tabs row; other screens reusing this header
  // (e.g. store-list/StoreListScreen.tsx) may not want it — there's nothing
  // for the tabs to filter there.
  showCategoryTabs?: boolean;
}

export function HomeHeader({
  onChangeLocation,
  onOpenSearch,
  selectedCategoryId,
  onSelectCategory,
  scrollY,
  showCategoryTabs = true,
}: Props) {
  return (
    <View className="overflow-hidden bg-white">
      {/* LinearGradient isn't one of NativeWind's auto-patched components — a
          className here is silently ignored, so positioning must go through
          the real style prop or the gradient collapses to zero size. */}
      <LinearGradient
        colors={['#FFC857', '#FFE58F', '#FFE58F00']}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <View className="pt-safe">
        <View className="flex-row items-start justify-between px-6 pt-2">
          <View className="flex-1">
            <CollapsibleHeaderTop scrollY={scrollY} onChangeLocation={onChangeLocation} />
          </View>
          <CollapsibleAvatar scrollY={scrollY} />
        </View>

        <View className="px-6">
          <HomeSearchBar onPress={onOpenSearch} />
        </View>

        {showCategoryTabs && <CategoryTabs selectedId={selectedCategoryId} onSelect={onSelectCategory} />}
      </View>
    </View>
  );
}
