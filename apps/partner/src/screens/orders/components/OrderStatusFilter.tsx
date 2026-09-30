// Horizontal pill filter above the order list, same shape as the
// reference (dark filled pill = active, white outlined = inactive, a
// count badge on each). Labels are full plain words ("New Orders", not
// "New") rather than the reference's terse fragments. 'out_for_delivery'/
// 'delivered' are included and read-only — see ../data.ts's own note on
// why this app can display those statuses even though it can't transition
// an order into or out of either.

import { Pressable, ScrollView, Text, View } from 'react-native';

export type OrderStatusFilterValue = 'all' | 'placed' | 'packed' | 'out_for_delivery' | 'delivered' | 'failed';

interface FilterOption {
  value: OrderStatusFilterValue;
  label: string;
  count: number;
}

interface Props {
  options: FilterOption[];
  selected: OrderStatusFilterValue;
  onSelect: (value: OrderStatusFilterValue) => void;
}

export function OrderStatusFilter({ options, selected, onSelect }: Props) {
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
