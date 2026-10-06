// Searches Purchase History by item or store name. Rolling hints decorate
// the empty input; the Filter action opens the order status/time sheet.

import { FilterIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { PurchaseSearchHint } from './PurchaseSearchHint';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onOpenFilter: () => void;
  isFilterActive: boolean;
}

export function PurchaseSearchBar({ value, onChangeText, onOpenFilter, isFilterActive }: Props) {
  const [isInputFocused, setIsInputFocused] = useState(false);

  return (
    <View className="h-[52px] flex-row items-center rounded-full bg-white border border-gray-100 px-4">
      <AppIcon icon={Search01Icon} size={18} color={colors.ink} />
      <View className="ml-2.5 h-full flex-1" style={{ minWidth: 0, overflow: 'hidden' }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
          accessibilityLabel="Search your grocery orders"
          className="h-full w-full text-[15px] text-ink"
          style={{ paddingVertical: 0 }}
        />
        {value.length === 0 && !isInputFocused && <PurchaseSearchHint />}
      </View>
      {/* Real "Filter" label next to the icon, not the icon alone —
          OrderFilterSheet's own two sections (status + time) aren't
          obvious from a bare funnel glyph. */}
      <Pressable
        onPress={onOpenFilter}
        hitSlop={8}
        className="-mr-1.5 h-9 flex-row items-center gap-1.5 rounded-full px-3"
        style={{ flexShrink: 0, backgroundColor: isFilterActive ? colors.ink : 'transparent' }}
      >
        <AppIcon icon={FilterIcon} size={17} color={isFilterActive ? '#FFFFFF' : colors.ink} strokeWidth={1.8} />
        <Text className="text-[13.5px] font-semibold" style={{ color: isFilterActive ? '#FFFFFF' : colors.ink }}>
          Filter
        </Text>
      </Pressable>
    </View>
  );
}
