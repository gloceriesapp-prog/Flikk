// Grouped category grid ("Grocery & Kitchen", "Snacks & Drinks", etc.) —
// the single shared piece screens/categories/CategoriesScreen.tsx (full
// standalone grid) and screens/home/sections/AllTabSections.tsx (a copy
// below the deals banner) both render, so the two never drift apart.

import { View } from 'react-native';
import { CategorySectionGroup } from './CategorySectionGroup';
import { CATEGORY_SECTIONS } from './data';

export function CategorySections() {
  return (
    <View>
      {CATEGORY_SECTIONS.map((section) => (
        <CategorySectionGroup key={section.title} section={section} />
      ))}
    </View>
  );
}
