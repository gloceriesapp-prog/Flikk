// Same bottom-sheet-with-checkmark shape as StoreSortSheet.tsx — a real
// price-range filter (product.price, applied server-side over the whole
// store catalogue), not a "price drop %" filter — no per-product
// discount-percentage field exists to bucket by, only the raw price.

import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { Modal, Pressable, Text } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

export type StorePriceRange = 'all' | 'under_100' | '100_300' | 'above_300';

const OPTIONS: { value: StorePriceRange; label: string }[] = [
  { value: 'all', label: 'All prices' },
  { value: 'under_100', label: 'Under ₹100' },
  { value: '100_300', label: '₹100 – ₹300' },
  { value: 'above_300', label: 'Above ₹300' },
];

interface Props {
  visible: boolean;
  value: StorePriceRange;
  onSelect: (value: StorePriceRange) => void;
  onClose: () => void;
}

export function StorePriceRangeSheet({ visible, value, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-3xl bg-white pb-safe" onPress={(e) => e.stopPropagation()}>
          <Text className="px-5 pt-5 text-[15px] font-semibold text-ink">Price</Text>
          {OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
              className="flex-row items-center gap-3.5 px-5 py-3.5"
            >
              <Text className="flex-1 text-[15px] font-medium text-ink">{option.label}</Text>
              {value === option.value && <AppIcon icon={CheckmarkCircle02Icon} size={20} color={colors.ink} strokeWidth={1.8} />}
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
