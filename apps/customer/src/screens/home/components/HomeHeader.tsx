// Top-of-Home block: ETA, location, avatar, search. Everything below this is
// the future browse/discovery surface (PRD C3/C4) — not built yet.
//
// Flat #103C1F background — was a react-native-svg RadialGradient (off-
// center circle from #1e3316 to #101c10); switched to a flat fill per an
// explicit ask for this exact color instead of a gradient sheen.
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

import { View } from 'react-native';
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
    // #4B4B4B
    <View className="overflow-hidden" style={{ backgroundColor: '#103C1F' }}>
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
