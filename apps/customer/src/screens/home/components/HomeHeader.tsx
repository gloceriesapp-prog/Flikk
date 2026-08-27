// Top-of-Home block: ETA, location, avatar, search. Everything below this is
// the future browse/discovery surface (PRD C3/C4) — not built yet.
//
// Flat #DDF7E8 fill, per an explicit ask to drop the gradient this used
// briefly (indigo/lime/pale-blue) in favor of one single pale-mist color.
//
// This is now a LIGHT background, but LocationSelector.tsx,
// DeliveryModeSwitcher.tsx, and CategoryTabItem.tsx are all still styled
// for the earlier dark header (white/light text, low-opacity white pills)
// — that combination reads as low-to-failing contrast (white-ish text on
// pale mint). Left as asked rather than silently darkening the text to
// compensate; flagging it since it wasn't part of this specific request.
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
    <View className="overflow-hidden" style={{ backgroundColor: '#E8E7FF' }}>
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
