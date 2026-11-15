import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SubCategorySidebarItem } from './SubCategorySidebarItem';
import type { DetailSubCategory } from '../types';

interface Props {
  items: DetailSubCategory[];
  selectedId: string;
  onSelect: (id: string) => void;
}

// A grey rail inset from the screen edge, rounded on every corner; the active
// sub-category lifts out of it as a white card. The rail runs the full height
// and stops just above the bottom safe area, so its rounded bottom shows; the
// entries scroll inside it. Width lives on
// the outer View: a ScrollView's width class doesn't reliably constrain it
// inside a flex-row.
export function SubCategorySidebar({ items, selectedId, onSelect }: Props) {
  const { bottom } = useSafeAreaInsets();
  return (
    <View style={{ width: 84, marginLeft: 10, marginBottom: Math.max(bottom - 12, 8) }}
      className="overflow-hidden rounded-[22px] bg-[#F3F4F6]">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3 px-1.5 pb-6 pt-2">
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
