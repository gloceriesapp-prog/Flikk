import { ScrollView, View } from 'react-native';
import { SubCategorySidebarItem } from './SubCategorySidebarItem';
import type { DetailSubCategory } from '../types';

interface Props {
  items: DetailSubCategory[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function SubCategorySidebar({ items, selectedId, onSelect }: Props) {
  return (
    // Width lives on this fixed-size outer View, not the ScrollView's
    // className — a ScrollView's width class doesn't reliably constrain it
    // inside a flex-row sibling, the same class of gotcha as LinearGradient/
    // BlurView elsewhere in this app needing style instead of className.
    <View style={{ width: 72 }} className="border-r border-mist bg-white">
      <ScrollView showsVerticalScrollIndicator={false}>
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
