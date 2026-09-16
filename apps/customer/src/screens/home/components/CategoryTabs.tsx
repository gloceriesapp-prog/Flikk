// Horizontal scroll of category shortcuts. Controlled by the parent (HomeScreen)
// now — selection needs to reach the body below the header (e.g. showing the
// Fresh Fish grid), so it can't live locally in this component anymore.
// "All" is the only hardcoded tab; everything after it is real admin data
// (see data/categoryTabs.ts's own note).
//
// headerBottomColor is gone — it only ever existed for CategoryTabItem's
// old scoop-cutout mask, which is gone too (that file's own note); nothing
// here needs to know the header's exact color anymore.
//
// border-b border-white/20 — the "add a horizontal line too" ask, a plain
// full-width divider separating this row from whatever scrolls beneath it,
// on top of each tab's own short active-state underline (CategoryTabItem).
//
// isFrosted — HomeHeader's own scroll-driven flip (same COLLAPSE_DISTANCE
// threshold the OS status bar already flips at): white icons/text read
// fine against the gradient, but turn near-invisible once the frosted
// BlurView takes over, so CategoryTabItem needs to know to switch to black.

import { ScrollView, View } from 'react-native';
import { CategoryTabItem } from './CategoryTabItem';
import { ALL_TAB, iconForTabName, type Category } from '../data/categoryTabs';
import { useHomeTabs } from '../data/useHomeTabs';

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
  isFrosted?: boolean;
}

export function CategoryTabs({ selectedId, onSelect, isFrosted = false }: Props) {
  const { data: realTabs = [] } = useHomeTabs();
  const tabs: Category[] = [ALL_TAB, ...realTabs.map((t) => ({ id: t.id, label: t.name, icon: iconForTabName(t.name) }))];

  return (
    <View className="mt-2 border-b border-white/20">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-0.5">
        {tabs.map((category) => (
          <CategoryTabItem
            key={category.id}
            category={category}
            isSelected={category.id === selectedId}
            onPress={() => onSelect(category.id)}
            isFrosted={isFrosted}
          />
        ))}
      </ScrollView>
    </View>
  );
}
