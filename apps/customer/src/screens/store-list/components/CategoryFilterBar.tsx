// Sits directly under StoreHeader — search + wishlist icon pills, then a
// horizontal row of real store categories (derived from useAllStores.ts's
// own data, not a fabricated list) as filter chips. "All" always leads;
// selecting a category actually filters AllStoresSection's list
// (StoreListScreen owns selectedCategory, both this bar and the list read
// it), not a decorative row that does nothing on tap. The heart icon is a
// local-only toggle (no wishlist screen/persistence exists yet) — same
// convention ProductCardView's own bookmark button already uses elsewhere
// in this app, kept consistent rather than inventing new placeholder
// behavior here.

import { useState } from 'react';
import { FavouriteIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
  onSearch: () => void;
}

export function CategoryFilterBar({ categories, selected, onSelect, onSearch }: Props) {
  const [isFavourited, setIsFavourited] = useState(false);
  const chips = ['All', ...categories];

  return (
    <View className="flex-row items-center gap-2.5 px-5 py-4">
      <Pressable onPress={onSearch} hitSlop={8} className="h-11 w-11 items-center justify-center rounded-full border border-gray-200">
        <AppIcon icon={Search01Icon} size={18} color={colors.ink} />
      </Pressable>

      <Pressable
        onPress={() => setIsFavourited((prev) => !prev)}
        hitSlop={8}
        className="h-11 w-11 items-center justify-center rounded-full border border-gray-200"
      >
        <AppIcon icon={FavouriteIcon} size={17} color={isFavourited ? colors.danger : colors.ink} strokeWidth={isFavourited ? 0 : 1.8} />
      </Pressable>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pl-1">
        {chips.map((chip) => {
          const isActive = chip === selected;
          return (
            <Pressable
              key={chip}
              onPress={() => onSelect(chip)}
              className={`items-center justify-center rounded-full px-4 ${isActive ? 'bg-ink' : 'border border-gray-200 bg-white'}`}
              style={{ height: 44 }}
            >
              <Text className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-ink/70'}`}>{chip}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
