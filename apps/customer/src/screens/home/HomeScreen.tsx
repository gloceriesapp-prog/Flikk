// PRD screen C3 (Home). The header (ETA, location, search, categories) is
// real UI. The body reacts to the selected category:
//   'all'         -> nearby stores + essentials + deals promo + coastal picks + Today's Steal Deals (sections/)
//   'fresh-fish'  -> the Fresh Fish grid (fish/) — id kept from before the
//                    category-tab rename, label is now "Meat & Fish"
//   'groceries'   -> sub-category grid + promo banner + farm teaser (groceries/)
//   'bakery'      -> same pattern, bakery data (bakery/)
//   'protein'     -> same pattern, protein data + its own banner photo (protein/)
//   everything else -> placeholder ('fresh', 'household' from the
//                    category-tab rename have no dedicated tab screen yet)
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
import { HOME_CATEGORIES } from './data/categoryTabs';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

const CATEGORIES_WITH_REAL_CONTENT = ['all', 'fresh-fish', 'groceries', 'bakery', 'protein'];

export function HomeScreen({ navigation }: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(HOME_CATEGORIES[0]?.id ?? 'all');

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

        {selectedCategoryId === 'all' && <AllTabSections />}

        {selectedCategoryId === 'fresh-fish' && <FishProductGrid />}

        {selectedCategoryId === 'groceries' && <GroceriesTab />}

        {selectedCategoryId === 'bakery' && <BakeryTab />}

        {selectedCategoryId === 'protein' && <ProteinTab />}

        {!CATEGORIES_WITH_REAL_CONTENT.includes(selectedCategoryId) && (
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
