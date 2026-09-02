// Horizontal scroll of category shortcuts. Controlled by the parent (HomeScreen)
// now — selection needs to reach the body below the header (e.g. showing the
// Fresh Fish grid), so it can't live locally in this component anymore.
// "All" is the only hardcoded tab; everything after it is real admin data
// (see data/categoryTabs.ts's own note).

import { ScrollView } from 'react-native';
import { CategoryTabItem } from './CategoryTabItem';
import { ALL_TAB, iconForTabName, type Category } from '../data/categoryTabs';
import { useHomeTabs } from '../data/useHomeTabs';

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
  // Passed straight through to every CategoryTabItem — see
  // HomeHeader.tsx's own note on why the scoop needs this.
  headerBottomColor: string;
}

export function CategoryTabs({ selectedId, onSelect, headerBottomColor }: Props) {
  const { data: realTabs = [] } = useHomeTabs();
  const tabs: Category[] = [ALL_TAB, ...realTabs.map((t) => ({ id: t.id, label: t.name, icon: iconForTabName(t.name) }))];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-0.5"
      className="mt-2"
    >
      {tabs.map((category) => (
        <CategoryTabItem
          key={category.id}
          category={category}
          isSelected={category.id === selectedId}
          onPress={() => onSelect(category.id)}
          headerBottomColor={headerBottomColor}
        />
      ))}
    </ScrollView>
  );
}
