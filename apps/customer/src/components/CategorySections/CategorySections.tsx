// Grouped category grid ("Groceries & Staples", "Snacks & Drinks", etc.) —
// the single shared piece screens/categories/CategoriesScreen.tsx (full
// standalone grid) and screens/home/sections/AllTabSections.tsx (a copy
// below the deals banner) both render, so the two never drift apart. Real
// titles + categories (useCategorySections.ts -> GET /category-sections),
// both managed from admin's own Categories screen — not the old
// CATEGORY_SECTIONS mock. A section with zero categories (a founder just
// created the title, hasn't added any yet) is skipped rather than shown as
// an empty heading. On Home (homeOnly) only titles admin switched "On Home"
// appear, each with its tiles still marked "Show on Home"; the Categories
// screen shows everything.

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { View } from 'react-native';
import type { AppStackParamList } from '../../navigation/types';
import { HomeSectionButton } from '../../screens/home/components/HomeSectionButton';
import { CategorySectionGroup } from './CategorySectionGroup';
import { useCategorySections } from './useCategorySections';

export function CategorySections({ homeOnly = false }: { homeOnly?: boolean }) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data: sections = [] } = useCategorySections();
  const nonEmptySections = sections
    .filter((section) => !homeOnly || section.showOnHome)
    .map((section) => (homeOnly ? { ...section, categories: section.categories.filter((c) => c.showOnHome) } : section))
    .filter((section) => section.categories.length > 0);

  return (
    <View>
      {nonEmptySections.map((section) => (
        <CategorySectionGroup key={section.id} section={section} />
      ))}
      {homeOnly && nonEmptySections.length > 0 && (
        <HomeSectionButton
          label="See all categories"
          items={nonEmptySections.flatMap((section) => section.categories).slice(0, 3)}
          onPress={() => navigation.navigate('Categories')}
        />
      )}
    </View>
  );
}
