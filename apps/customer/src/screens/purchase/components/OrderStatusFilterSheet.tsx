// Bottom sheet opened by PurchaseSearchBar's filter icon — All / Live /
// Past, a real filter over PurchaseScreen's own status field (nothing
// fabricated: 'placed'/'packed'/'out_for_delivery' = Live, 'delivered'/
// 'cancelled' = Past, same split PurchaseScreen already computes for its
// section headers). Same bottom-sheet-with-checkmark shape ProfileScreen's
// own Appearance picker uses, for consistency.

import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { Modal, Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

export type OrderStatusFilter = 'all' | 'live' | 'past';

const OPTIONS: { value: OrderStatusFilter; label: string }[] = [
  { value: 'all', label: 'All orders' },
  { value: 'live', label: 'Live only' },
  { value: 'past', label: 'Past only' },
];

interface Props {
  visible: boolean;
  value: OrderStatusFilter;
  onSelect: (value: OrderStatusFilter) => void;
  onClose: () => void;
}

export function OrderStatusFilterSheet({ visible, value, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-3xl bg-white pb-safe" onPress={(e) => e.stopPropagation()}>
          <Text className="px-5 pt-5 text-[15px] font-semibold text-ink">Filter orders</Text>
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
