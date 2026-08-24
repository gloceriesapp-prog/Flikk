// Horizontal scroll of category shortcuts. Controlled by the parent (HomeScreen)
// now — selection needs to reach the body below the header (e.g. showing the
// Fresh Fish grid), so it can't live locally in this component anymore.

import { ScrollView } from 'react-native';
import { CategoryTabItem } from './CategoryTabItem';
import { HOME_CATEGORIES } from '../data/categoryTabs';

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
}

export function CategoryTabs({ selectedId, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-0.5"
      className="mt-2"
    >
      {HOME_CATEGORIES.map((category) => (
        <CategoryTabItem
          key={category.id}
          category={category}
          isSelected={category.id === selectedId}
          onPress={() => onSelect(category.id)}
        />
      ))}
    </ScrollView>
  );
}
