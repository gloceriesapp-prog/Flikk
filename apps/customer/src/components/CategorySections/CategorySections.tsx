// Grouped category grid ("Groceries & Staples", "Snacks & Drinks", etc.) —
// the single shared piece screens/categories/CategoriesScreen.tsx (full
// standalone grid) and screens/home/sections/AllTabSections.tsx (a copy
// below the deals banner) both render, so the two never drift apart. Real
// titles + categories (useCategorySections.ts -> GET /category-sections),
// both managed from admin's own Categories screen — not the old
// CATEGORY_SECTIONS mock. A section with zero categories (a founder just
// created the title, hasn't added any yet) is skipped rather than shown as
// an empty heading.

import { View } from 'react-native';
import { CategorySectionGroup } from './CategorySectionGroup';
import { useCategorySections } from './useCategorySections';

export function CategorySections() {
  const { data: sections = [] } = useCategorySections();
  const nonEmptySections = sections.filter((section) => section.categories.length > 0);

  return (
    <View>
      {nonEmptySections.map((section) => (
        <CategorySectionGroup key={section.id} section={section} />
      ))}
    </View>
  );
}
