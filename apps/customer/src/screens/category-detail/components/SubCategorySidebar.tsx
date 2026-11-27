import { ScrollView, View } from 'react-native';
import { SubCategorySidebarItem } from './SubCategorySidebarItem';
import type { DetailSubCategory } from '../types';

interface Props {
  items: DetailSubCategory[];
  selectedId: string;
  onSelect: (id: string) => void;
}

// Flat white rail on the left edge with a hairline divider on its right. Each
// entry is a round grey photo over a two-line label; the selected one gets a
// bold label and a blue bar on the rail's right edge. Width lives on the outer
// View: a ScrollView's width class doesn't reliably constrain it in a row.
export function SubCategorySidebar({ items, selectedId, onSelect }: Props) {
  return (
    <View style={{ width: 92 }} className="border-r border-[#EEF0F3] bg-white">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-24 pt-1">
        {items.map((item) => (
          <SubCategorySidebarItem
            key={item.id}
            subCategory={item}
            isSelected={item.id === selectedId}
            onPress={() => onSelect(item.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
