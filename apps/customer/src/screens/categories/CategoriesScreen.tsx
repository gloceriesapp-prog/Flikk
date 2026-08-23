// Full category grid, grouped by section. Reached from BottomNavBar's
// "Categories" tab — see src/components/BottomNavBar/BottomNavBar.tsx.

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { CategorySections } from '../../components/CategorySections/CategorySections';
import { colors } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Categories'>;

export function CategoriesScreen({ navigation }: Props) {
  return (
    // BottomNavBar is a sibling of the ScrollView, not inside its scrollable
    // content — same pattern as HomeScreen.tsx, keeps it floating fixed
    // while the grid scrolls underneath it.
    <View className="flex-1 bg-white pt-safe">
      <View className="flex-row items-center gap-3 px-5 pb-2 pt-2">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="h-11 w-11 items-center justify-center">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <Text className="text-xl font-extrabold text-ink">Categories</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-28">
        <CategorySections />
      </ScrollView>

      <BottomNavBar />
    </View>
  );
}
