// Product-category chip grid — same "pick from a fixed set" convention as
// StoreCategoryPicker (store-settings), just no "Others" escape hatch: this
// list (PRODUCT_CATEGORIES) mirrors admin's own Add/Edit product form
// exactly, on purpose (see data.ts's own note), so a store owner is never
// off a vocabulary a founder isn't also using.

import { Pressable, Text, View } from 'react-native';
import { PRODUCT_CATEGORIES } from '../data';

interface Props {
  selected: string;
  onSelect: (category: string) => void;
}

export function ProductCategoryPicker({ selected, onSelect }: Props) {
  return (
    <View className="flex-row flex-wrap gap-2.5">
      {PRODUCT_CATEGORIES.map((category) => {
        const isActive = selected === category;
        return (
          <Pressable
            key={category}
            onPress={() => onSelect(category)}
            className="basis-[48%] grow items-center rounded-2xl bg-[#F9FAFB] px-3 py-3.5"
            style={{ backgroundColor: isActive ? '#101C10' : '#F9FAFB' }}
          >
            <Text className={`text-sm font-medium ${isActive ? 'text-white' : 'text-ink/70'}`}>{category}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
