// Top-of-Home block: ETA, location, avatar, search. Everything below this is
// the future browse/discovery surface (PRD C3/C4) — not built yet.
//
// Background is a 4-stop gradient that swaps per selected category
// (categoryHeaderGradients.ts) — All stays the deep emerald jewel-tone
// (same family as SeasonalSection.tsx's own card), Groceries/Fresh/
// Meat & Fish/Regional/Bakery each get their own distinct premium
// palette, per an explicit ask for more "premium-ness" when switching
// tabs. activeCategoryName is resolved by HomeScreen.tsx (it already has
// the real tab list from useHomeTabs); this component only needs the
// name to look up, not the tab list itself.
//
// The gradient's bottomColor is threaded down into CategoryTabs so the
// selected tab's own "scoop" cutout (CategoryTabItem.tsx) matches
// whatever color the header actually is right there — a hardcoded scoop
// color would show a visible seam against every non-'all' gradient.
//
// ETA/location and the avatar (now part of the same row via
// DeliveryModeSwitcher, not a separate always-visible element) both
// collapse away on scroll — search and category tabs stay fixed.

import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { SharedValue } from 'react-native-reanimated';
import { CollapsibleHeaderTop } from './CollapsibleHeaderTop';
import { HomeSearchBar } from './HomeSearchBar';
import { CategoryTabs } from './CategoryTabs';
import { gradientForTabName } from '../data/categoryHeaderGradients';

interface Props {
  onChangeLocation: () => void;
  onOpenSearch: () => void;
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  // Resolved by HomeScreen.tsx from its own real tab list — 'all' when
  // the All tab is selected. Drives which gradient renders.
  activeCategoryName: string;
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
  activeCategoryName,
  scrollY,
  showCategoryTabs = true,
}: Props) {
  const gradient = gradientForTabName(activeCategoryName);

  return (
    <LinearGradient colors={gradient.colors} locations={gradient.stops} className="overflow-hidden">
      <View className="pt-safe">
        <View className="px-6 pt-5">
          <CollapsibleHeaderTop scrollY={scrollY} onChangeLocation={onChangeLocation} />
        </View>

        <View className="px-6">
          <HomeSearchBar onPress={onOpenSearch} />
        </View>

        {showCategoryTabs && (
          <CategoryTabs selectedId={selectedCategoryId} onSelect={onSelectCategory} headerBottomColor={gradient.bottomColor} />
        )}
      </View>
    </LinearGradient>
  );
}
