// Chilled / room temperature (Product.servingOptions). Same price either
// way. Two offered: a two-button choice that becomes part of the cart line
// and reaches the store on order_items.serving. One offered: just says so.

import { Pressable, Text, View } from 'react-native';
import { SERVING_LABEL, type Serving } from '../../store/cartIdentity';

interface Props {
  options: Serving[];
  selected?: Serving;
  onSelect: (serving: Serving) => void;
}

export function ProductServingOptions({ options, selected, onSelect }: Props) {
  if (options.length === 1) {
    return <Text className="text-[13px] font-medium text-ink/60">Served {SERVING_LABEL[options[0]!].toLowerCase()}</Text>;
  }
  return (
    <View className="gap-2.5">
      <Text className="text-[13px] font-semibold text-ink/60">Serve it</Text>
      <View className="flex-row gap-2">
        {options.map((serving) => {
          const isSelected = serving === selected;
          return (
            <Pressable
              key={serving}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(serving)}
              className="flex-1 items-center rounded-[12px] border px-3 py-2.5"
              style={{ borderColor: isSelected ? '#2457F5' : '#DADADA', backgroundColor: isSelected ? '#F3F6FF' : '#FFFFFF' }}
            >
              <Text className="text-[13px] font-semibold text-ink">{SERVING_LABEL[serving]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
