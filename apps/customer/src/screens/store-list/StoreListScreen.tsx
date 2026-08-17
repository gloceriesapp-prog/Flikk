// Reached from BottomNavBar's "Store" tab. Top section is literally
// HomeHeader — same component Home uses, not a re-styled copy — per the ask
// to "keep the top section as it is." That means this screen owns its own
// scrollY/category state to drive it, same pattern as HomeScreen.tsx.
// Category tabs are hidden here (showCategoryTabs=false) — there's nothing
// for them to filter, just the one vertical store list below.

import { useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { HomeHeader } from '../home/components/HomeHeader';
import { HOME_CATEGORIES } from '../home/data/categories';
import { StoreCard } from './components/StoreCard';
import { STORE_LISTINGS } from './data';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Store'>;

export function StoreListScreen({ navigation }: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(HOME_CATEGORIES[0]?.id ?? 'all');

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  return (
    // BottomNavBar is a sibling of the ScrollView, not inside its scrollable
    // content — same reason as HomeScreen.tsx: keeps it floating fixed while
    // the page scrolls underneath it.
    <View className="flex-1 bg-white">
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
          showCategoryTabs={false}
        />

        <View className="gap-5 px-5 pt-6">
          {STORE_LISTINGS.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </View>
      </Animated.ScrollView>

      <BottomNavBar />
    </View>
  );
}
