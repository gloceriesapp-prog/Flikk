// Sits directly below PurchaseHeader's location row — a real typeable
// search box (filters PurchaseScreen's own order list by store name / item
// name, client-side, both fields already on PurchaseOrder) plus a filter
// icon that opens OrderStatusFilterSheet. One seamless white pill (not a
// pill + a separate outside button) to match the app's other premium
// header search bars (HomeSearchBar/StoreHeader) — the filter icon sits
// where those bars put a decorative mic, except this one is real (there's
// no voice search anywhere in this app to fake).

import { FilterIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, TextInput, View } from 'react-native';
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
    <View className="h-[52px] flex-row items-center rounded-full bg-white border border-gray-100 px-4">
      <AppIcon icon={Search01Icon} size={18} color={colors.ink} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search your orders"
        placeholderTextColor={`${colors.ink}66`}
        className="ml-2.5 h-full flex-1 text-[15px] text-ink"
      />
      {/* Real "Filter" label next to the icon, not the icon alone —
          OrderFilterSheet's own two sections (status + time) aren't
          obvious from a bare funnel glyph. */}
      <Pressable
        onPress={onOpenFilter}
        hitSlop={8}
        className="-mr-1.5 h-9 flex-row items-center gap-1.5 rounded-full px-3"
        style={{ backgroundColor: isFilterActive ? colors.ink : 'transparent' }}
      >
        <AppIcon icon={FilterIcon} size={17} color={isFilterActive ? '#FFFFFF' : colors.ink} strokeWidth={1.8} />
        <Text className="text-[13.5px] font-semibold" style={{ color: isFilterActive ? '#FFFFFF' : colors.ink }}>
          Filter
        </Text>
      </Pressable>
    </View>
  );
}
