// Full category grid, grouped by section. Reached from BottomNavBar's own
// "Categories" tab (src/components/BottomNavBar/BottomNavBar.tsx) — it's a
// bottom-nav destination, not a pushed detail screen, so no back arrow.
//
// Plain left-aligned title + search icon — per an explicit ask to drop
// the premium gradient/location-row header this screen briefly had
// (CategoriesHeader.tsx, deleted) in favor of a simple section title,
// same shape as before that header existed. Not sticky — a bare title
// bar doesn't need to stay pinned while the grid scrolls under it.
// BottomNavBar's own direction-based hide/show (navHidden) is unrelated
// to the header and stays, same logic every bottom-tab screen uses.

import { Search01Icon } from '@hugeicons/core-free-icons';
import { StatusBar } from 'expo-status-bar';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedScrollHandler, useSharedValue, withTiming } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { CategorySections } from '../../components/CategorySections/CategorySections';
import { BrandFooter } from '../../components/BrandFooter';
import { StoreTypesSection } from '../home/store-types/StoreTypesSection';
import { colors } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Categories'>;

export function CategoriesScreen({ navigation }: Props) {
  const prevScrollY = useSharedValue(0);
  const navHidden = useSharedValue(0);
  const SCROLL_HIDE_THRESHOLD = 6;

  const scrollHandler = useAnimatedScrollHandler((event) => {
    const y = event.contentOffset.y;
    const delta = y - prevScrollY.value;
    if (y < 40) {
      navHidden.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
    } else if (delta > SCROLL_HIDE_THRESHOLD) {
      navHidden.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    } else if (delta < -SCROLL_HIDE_THRESHOLD) {
      navHidden.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
    }
    prevScrollY.value = y;
  });

  return (
    <View className="flex-1 bg-white pt-safe">
      {/* Plain white background again — no gradient header to keep icons
          legible against, same reasoning CategoriesHeader's own removal
          reverses. */}
      <StatusBar style="dark" />

      <View className="flex-row items-center justify-between px-5 pb-2 pt-2">
        <Text className="text-[20px] font-bold text-ink/90">Categories</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Search" onPress={() => navigation.navigate('Search')} hitSlop={10} className="h-9 w-9 items-center justify-center">
          <AppIcon icon={Search01Icon} size={22} color={colors.ink} />
        </Pressable>
      </View>

      <Animated.ScrollView className="flex-1" contentContainerClassName="pb-28" onScroll={scrollHandler} scrollEventThrottle={16}>
        {/* "Shop by Store Type" — same real section Home's "All" tab
            already shows (useStoreTypes -> GET /stores), reused here per
            an explicit ask rather than a second copy of the same query. */}
        <StoreTypesSection />
        <CategorySections />
        <BrandFooter />
      </Animated.ScrollView>

      <BottomNavBar hidden={navHidden} />
    </View>
  );
}
