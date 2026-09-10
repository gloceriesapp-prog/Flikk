// Full category grid, grouped by section. Reached from BottomNavBar's own
// "Categories" tab (src/components/BottomNavBar/BottomNavBar.tsx) — it's a
// bottom-nav destination, not a pushed detail screen, so no back arrow (per
// an explicit ask); title alone, medium weight rather than extrabold.

import { Search01Icon } from '@hugeicons/core-free-icons';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { CategorySections } from '../../components/CategorySections/CategorySections';
import { colors } from '../../theme/tokens';
import { BrandFooter } from '../../components/BrandFooter';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Categories'>;

export function CategoriesScreen({ navigation }: Props) {
  return (
    // BottomNavBar is a sibling of the ScrollView, not inside its scrollable
    // content — same pattern as HomeScreen.tsx, keeps it floating fixed
    // while the grid scrolls underneath it.
    <View className="flex-1 bg-white pt-safe">
      {/* App.tsx's global StatusBar is "dark", but HomeScreen sets it to
          "light" for its own dark header and expo-status-bar's style is one
          global native call, not scoped per screen — it doesn't reset on
          navigation (same issue CartScreen.tsx already documents/fixes).
          Landing here from Home left white icons invisible against this
          screen's white background; this re-asserts dark (visible) icons,
          same fix, same reason, on both Android and iOS. */}
      <StatusBar style="dark" />

      <View className="flex-row items-center justify-between px-5 pb-2 pt-2">
        <Text className="text-xl font-medium text-ink">Categories</Text>
        <Pressable onPress={() => navigation.navigate('Search')} hitSlop={10} className="h-9 w-9 items-center justify-center">
          <AppIcon icon={Search01Icon} size={22} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-28">
        <CategorySections />
        <BrandFooter />
      </ScrollView>

      <BottomNavBar />
    </View>
  );
}
