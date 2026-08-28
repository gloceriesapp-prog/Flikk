// PRD screen C3 (Home). The header (ETA, location, search, categories) is
// real UI. The body reacts to the selected tab:
//   'all'  -> nearby stores + essentials + deals promo + coastal picks + Today's Steal Deals (sections/)
//   every other tab is real admin data (GET /home-tabs, data/useHomeTabs.ts)
//     — a handful of well-known names still get their own rich screen
//     (Groceries/Fresh & Fish/Bakery/Protein below); any other admin tab
//     falls through to the generic tile grid (hometab/HomeTabTileGrid.tsx).
// Full discovery/browse (store lists, C4/C5) is separate work, see
// specs/01-customer-app/screens.md.

import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { HomeHeader } from './components/HomeHeader';
import { BakeryTab } from './bakery/BakeryTab';
import { FishProductGrid } from './fish/FishProductGrid';
import { GroceriesTab } from './groceries/GroceriesTab';
import { ProteinTab } from './protein/ProteinTab';
import { AllTabSections } from './sections/AllTabSections';
import { ALL_TAB } from './data/categoryTabs';
import { useHomeTabs } from './data/useHomeTabs';
import { HomeTabTileGrid } from './hometab/HomeTabTileGrid';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

// Tab names that get a hand-built screen instead of the generic tile grid —
// matched case-insensitively against whatever an admin names the tab in
// Home Categories, so renaming "Meat & Fish" there still routes here.
const RICH_SCREEN_BY_NAME: Record<string, 'groceries' | 'meat-fish' | 'bakery' | 'protein'> = {
  groceries: 'groceries',
  'meat & fish': 'meat-fish',
  bakery: 'bakery',
  protein: 'protein',
};

export function HomeScreen({ navigation }: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(ALL_TAB.id);
  const { data: realTabs = [] } = useHomeTabs();
  const selectedRealTab = realTabs.find((t) => t.id === selectedCategoryId);
  const richScreen = selectedRealTab ? RICH_SCREEN_BY_NAME[selectedRealTab.name.trim().toLowerCase()] : undefined;

  // Drives the collapsing ETA/location block in HomeHeader — see
  // components/CollapsibleHeaderTop.tsx for the actual interpolation.
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  return (
    // BottomNavBar is a sibling of the ScrollView, not inside its scrollable
    // content — that's what keeps it floating fixed in place while the page
    // scrolls underneath it.
    <View className="flex-1 bg-white">
      {/* No per-screen StatusBar override needed here anymore — HomeHeader
          is a light pastel fill now (#E8E7FF), not the earlier dark
          gradient, so App.tsx's global "dark" style already gives correct,
          visible icons without Home having to re-assert anything on every
          focus. */}
      <Animated.ScrollView
        className="flex-1"
        contentContainerClassName="pb-28"
        stickyHeaderIndices={[0]}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <HomeHeader
          onChangeLocation={() => navigation.navigate('LocationSearch')}
          onOpenSearch={() => navigation.navigate('Search')}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          scrollY={scrollY}
        />

        {selectedCategoryId === ALL_TAB.id && <AllTabSections />}

        {richScreen === 'groceries' && <GroceriesTab />}
        {richScreen === 'meat-fish' && <FishProductGrid />}
        {richScreen === 'bakery' && <BakeryTab />}
        {richScreen === 'protein' && <ProteinTab />}

        {selectedRealTab && !richScreen && <HomeTabTileGrid tab={selectedRealTab} />}

        {selectedCategoryId !== ALL_TAB.id && !selectedRealTab && (
          <View className="items-center justify-center gap-2 px-6 py-16">
            <Text className="text-base font-semibold text-ink">Store list goes here.</Text>
            <Text className="text-center text-sm text-ink/60">
              Browse/discovery (PRD C4/C5) is the next piece of work.
            </Text>
          </View>
        )}
      </Animated.ScrollView>

      <BottomNavBar />
    </View>
  );
}
