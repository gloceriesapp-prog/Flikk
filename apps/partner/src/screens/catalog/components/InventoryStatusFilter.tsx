// Horizontal pill filter between the summary card and the product list —
// same dark-filled-pill/white-outline shape as
// ../../orders/components/OrderStatusFilter.tsx (copied, not shared, same
// no-/packages/shared-yet rule as everywhere else in this app). Options are
// stock-state, not order-state: "All Items" / "In Stock" / "Out of Stock" —
// the one thing a shop owner actually triages a catalog by mid-rush.

import { Pressable, ScrollView, Text, View } from 'react-native';

export type InventoryStatusFilterValue = 'all' | 'in_stock' | 'out_of_stock';

interface FilterOption {
  value: InventoryStatusFilterValue;
  label: string;
  count: number;
}

interface Props {
  options: FilterOption[];
  selected: InventoryStatusFilterValue;
  onSelect: (value: InventoryStatusFilterValue) => void;
}

export function InventoryStatusFilter({ options, selected, onSelect }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5">
      {options.map((option) => {
        const isActive = option.value === selected;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            className={`flex-row items-center gap-2 rounded-full border px-4 py-2.5 ${
              isActive ? 'bg-black' : 'border-gray-200 bg-white'
            }`}
          >
            <Text className={`text-base font-medium ${isActive ? 'text-white' : 'text-ink/70'}`}>{option.label}</Text>
            <View className={`min-w-[20px] items-center rounded-full px-1.5 py-0.5 ${isActive ? 'bg-white/20' : 'bg-gray-100'}`}>
              <Text className={`text-[11px] font-semibold ${isActive ? 'text-white' : 'text-ink/60'}`}>
                {option.count}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
