// Top-of-Home block: ETA, location, avatar, search. Everything below this is
// the future browse/discovery surface (PRD C3/C4) — not built yet.
//
// Background is a radial gradient — circle centered at (85%, -10%), i.e.
// just off the top-right corner, from #1e3316 at the center out to
// #101c10 (near-black forest green). expo-linear-gradient only does
// linear gradients, so this is react-native-svg's RadialGradient instead
// (already a dependency). cx/cy/r are percentages of the header's own
// bounding box (objectBoundingBox units, react-native-svg's default) — r
// is set past 100% since the center sits outside the box (matches CSS
// radial-gradient's own farthest-corner sizing for an off-center circle).
//
// Because the background is dark, everything that sits directly on it is
// light/white — see LocationSelector.tsx, DeliveryModeSwitcher.tsx, and
// CategoryTabItem.tsx's own notes on their unselected-state colors. Their
// selected/filled states (white search bar, white category card, solid
// pill) already had their own opaque backgrounds and needed no change.
//
// ETA/location and the avatar (now part of the same row via
// DeliveryModeSwitcher, not a separate always-visible element) both
// collapse away on scroll — search and category tabs stay fixed.

import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { SharedValue } from 'react-native-reanimated';
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
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="headerRadial" cx="85%" cy="-10%" r="140%">
            <Stop offset="0%" stopColor="#1e3316" />
            <Stop offset="100%" stopColor="#101c10" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#headerRadial)" />
      </Svg>

      <View className="pt-safe">
        <View className="px-6 pt-2">
          <CollapsibleHeaderTop scrollY={scrollY} onChangeLocation={onChangeLocation} />
        </View>

        <View className="px-6">
          <HomeSearchBar onPress={onOpenSearch} />
        </View>

        {showCategoryTabs && <CategoryTabs selectedId={selectedCategoryId} onSelect={onSelectCategory} />}
      </View>
    </View>
  );
}
