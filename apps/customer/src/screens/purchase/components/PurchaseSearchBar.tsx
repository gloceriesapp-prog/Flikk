// Searches Purchase History by item or store name. A stable hint decorates
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
    <View className="h-[52px] flex-row items-center rounded-2xl bg-[#EEF0F4] px-3.5">
      <AppIcon icon={Search01Icon} size={18} color={colors.ink} />
      <View className="ml-2.5 h-full flex-1" style={{ minWidth: 0, overflow: 'hidden' }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
          accessibilityLabel="Search your grocery orders"
          returnKeyType="search"
          maxLength={100}
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
        accessibilityRole="button"
        accessibilityLabel="Filter orders"
        accessibilityState={{ selected: isFilterActive }}
        hitSlop={8}
        className={`-mr-1.5 h-9 shrink-0 flex-row items-center gap-1.5 rounded-full border bg-white px-3 ${isFilterActive ? 'border-ink/25' : 'border-transparent'}`}
      >
        <AppIcon icon={FilterIcon} size={17} color={colors.ink} strokeWidth={1.8} />
        <Text className="text-[13.5px] font-semibold text-ink">
          Filter
        </Text>
      </Pressable>
    </View>
  );
}
