// Sits directly below the "Purchase" title — a real typeable search box
// (filters PurchaseScreen's own order list by store name / item name,
// client-side, both fields already on PurchaseOrder) plus a filter icon at
// the right end that opens OrderStatusFilterSheet. Same TextInput-directly-
// styled pattern search/components/SearchHeader.tsx already uses in this
// app, not a fake pill that opens a separate screen.

import { FilterIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { Pressable, TextInput, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onOpenFilter: () => void;
  isFilterActive: boolean;
}

export function PurchaseSearchBar({ value, onChangeText, onOpenFilter, isFilterActive }: Props) {
  return (
    <View className="flex-row items-center gap-2.5 px-5 pb-2 pt-1">
      <View className="flex-1 flex-row items-center gap-2 rounded-full bg-gray-100 px-4">
        <AppIcon icon={Search01Icon} size={17} color={`${colors.ink}80`} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Search your orders"
          placeholderTextColor={`${colors.ink}66`}
          className="h-11 flex-1 text-[15px] text-ink"
        />
      </View>

      <Pressable
        onPress={onOpenFilter}
        hitSlop={8}
        className="h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: isFilterActive ? colors.ink : `${colors.ink}14` }}
      >
        <AppIcon icon={FilterIcon} size={18} color={isFilterActive ? '#FFFFFF' : colors.ink} strokeWidth={1.8} />
      </Pressable>
    </View>
  );
}
