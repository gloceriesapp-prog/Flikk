// Chicken cut size picker (Product.cutOptions). Same price for every cut;
// the choice is part of the cart line (cartLineId) and reaches the store on
// order_items.cut_size. bulkMinKg explains bulk orders before the customer
// adds that much.

import { Pressable, Text, View } from 'react-native';
import { CUT_SIZES, CUT_SIZE_LABEL, type CutSize } from '../../store/cartIdentity';

const CUT_HINT: Record<CutSize, string> = { small: 'Curry cut', medium: 'Regular', large: 'Fry / biryani' };

interface Props {
  selected: CutSize;
  onSelect: (cut: CutSize) => void;
  bulkMinKg?: number;
}

export function ProductCutOptions({ selected, onSelect, bulkMinKg }: Props) {
  return (
    <View className="gap-2.5">
      <Text className="text-[13px] font-semibold text-ink/60">Cut size</Text>
      <View className="flex-row gap-2">
        {CUT_SIZES.map((cut) => {
          const isSelected = cut === selected;
          return (
            <Pressable
              key={cut}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(cut)}
              className="flex-1 gap-0.5 rounded-[14px] border px-2 py-2.5"
              style={{ borderColor: isSelected ? '#2457F5' : '#DADADA', backgroundColor: isSelected ? '#F3F6FF' : '#FFFFFF' }}
            >
              <Text className="text-center text-[13px] font-semibold text-ink" numberOfLines={1}>{CUT_SIZE_LABEL[cut]}</Text>
              <Text className="text-center text-[11px] font-medium text-ink/50" numberOfLines={1}>{CUT_HINT[cut]}</Text>
            </Pressable>
          );
        })}
      </View>
      {bulkMinKg ? (
        <Text className="text-[12px] font-medium leading-[17px] text-ink/60">
          Bulk orders welcome: {bulkMinKg} kg or more is sent to the shop as a bulk order, and the shop confirms it before preparing.
        </Text>
      ) : null}
    </View>
  );
}
