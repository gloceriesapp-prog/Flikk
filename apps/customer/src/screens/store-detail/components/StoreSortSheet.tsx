// Same bottom-sheet-with-checkmark shape as purchase/components/
// OrderStatusFilterSheet.tsx — opened by StoreProductFilterBar's "Sort by"
// chip. Only real, computable orderings (product.price, already on every
// real product) — no "popularity"/"trending" option since no such signal
// exists anywhere in the schema (CLAUDE.md: no fabricated data).

import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { Modal, Pressable, Text } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

export type StoreProductSort = 'relevance' | 'price_low' | 'price_high';

const OPTIONS: { value: StoreProductSort; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
];

interface Props {
  visible: boolean;
  value: StoreProductSort;
  onSelect: (value: StoreProductSort) => void;
  onClose: () => void;
}

export function StoreSortSheet({ visible, value, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-3xl bg-white pb-safe" onPress={(e) => e.stopPropagation()}>
          <Text className="px-5 pt-5 text-[15px] font-semibold text-ink">Sort by</Text>
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
