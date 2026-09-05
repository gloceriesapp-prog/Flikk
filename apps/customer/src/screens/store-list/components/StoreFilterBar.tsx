// Replaces CategoryFilterBar entirely (search icon, heart icon, always-
// visible category chip row on a lavender panel) — swapped for this
// light-gray pill row instead. Sits directly on the screen's own plain
// background, no colored panel behind it: this is the app's existing base
// tone (StoreListScreen.tsx is bg-[#FAFAFA], the pills below are bg-white
// on top of that), reused as-is rather than introducing a new one.
//
// Search dropped per an explicit ask (StoreHeader.tsx's own note on why
// it doesn't carry a search icon of its own needs revisiting if this ever
// comes back) — the heart/favourite icon takes that slot instead, same
// local-only toggle CategoryFilterBar's old one was (no wishlist-for-
// stores screen/persistence exists, same as that one — not a regression
// introduced here, just restoring the same decorative affordance).
//
// No standalone sliders/filter icon anymore, per an explicit ask — it was
// a redundant fourth way to open the exact same StoreFilterSheet the
// Sort by/Category/Rating chips already open, not a distinct action of
// its own. Those three chips (plus Open now, a plain instant toggle with
// no sheet/dropdown arrow) are the only entry points into it now.
//
// Every pill — heart, and all four chips — shares the same height (48px),
// corner radius, rest-state background (bg-gray-100) and active-state
// background (bg-ink), per an explicit ask to fix the inconsistent sizes/
// backgrounds an earlier pass had drifted into (bg-gray-200 on some,
// bg-gray-100 on others, mismatched radii). CHIP_MIN_WIDTH keeps the
// shorter labels ("Rating", "Category") from looking visibly smaller than
// "Fastest delivery" once that's selected — they still grow past it for
// longer text, just don't shrink below that floor.

import { ArrowDown01Icon, FavouriteIcon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { MinRating, StoreSort } from './StoreFilterSheet';

const SORT_LABEL: Record<StoreSort, string> = {
  relevance: 'Sort by',
  rating: 'Top rated',
  fastest: 'Fastest delivery',
};

const RATING_LABEL: Record<MinRating, string> = {
  0: 'Rating',
  4: '4.0+',
  4.5: '4.5+',
};

const CHIP_HEIGHT = 48;
const CHIP_MIN_WIDTH = 108;

interface Props {
  sort: StoreSort;
  minRating: MinRating;
  selectedCategory: string;
  openNowOnly: boolean;
  onOpenFilterSheet: () => void;
  onToggleOpenNow: () => void;
}

export function StoreFilterBar({ sort, minRating, selectedCategory, openNowOnly, onOpenFilterSheet, onToggleOpenNow }: Props) {
  const [isFavourited, setIsFavourited] = useState(false);

  return (
    <View className="flex-row items-center gap-2.5 px-5 py-4">
      <Pressable
        onPress={() => setIsFavourited((prev) => !prev)}
        hitSlop={8}
        className="items-center justify-center rounded-full bg-gray-200"
        style={{ height: CHIP_HEIGHT, width: CHIP_HEIGHT }}
      >
        <AppIcon icon={FavouriteIcon} size={19} color={isFavourited ? colors.danger : colors.ink} strokeWidth={isFavourited ? 0 : 1.8} />
      </Pressable>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5">
        <Pressable
          onPress={onOpenFilterSheet}
          className={`flex-row items-center justify-center gap-1 rounded-full px-5 ${sort !== 'relevance' ? 'bg-ink' : 'bg-gray-200'}`}
          style={{ height: CHIP_HEIGHT, minWidth: CHIP_MIN_WIDTH }}
        >
          <Text className={`text-[15px] font-medium ${sort !== 'relevance' ? 'text-white' : 'text-ink'}`}>{SORT_LABEL[sort]}</Text>
          <AppIcon icon={ArrowDown01Icon} size={14} color={sort !== 'relevance' ? '#FFFFFF' : `${colors.ink}99`} strokeWidth={2} />
        </Pressable>

        <Pressable
          onPress={onToggleOpenNow}
          className={`items-center justify-center rounded-full px-5 ${openNowOnly ? 'bg-ink' : 'bg-gray-200'}`}
          style={{ height: CHIP_HEIGHT, minWidth: CHIP_MIN_WIDTH }}
        >
          <Text className={`text-[15px] font-medium ${openNowOnly ? 'text-white' : 'text-ink'}`}>Open now</Text>
        </Pressable>

        <Pressable
          onPress={onOpenFilterSheet}
          className={`flex-row items-center justify-center gap-1 rounded-full px-5 ${selectedCategory !== 'All' ? 'bg-ink' : 'bg-gray-200'}`}
          style={{ height: CHIP_HEIGHT, minWidth: CHIP_MIN_WIDTH }}
        >
          <Text className={`text-[15px] font-medium ${selectedCategory !== 'All' ? 'text-white' : 'text-ink'}`}>
            {selectedCategory === 'All' ? 'Category' : selectedCategory}
          </Text>
          <AppIcon icon={ArrowDown01Icon} size={14} color={selectedCategory !== 'All' ? '#FFFFFF' : `${colors.ink}99`} strokeWidth={2} />
        </Pressable>

        <Pressable
          onPress={onOpenFilterSheet}
          className={`flex-row items-center justify-center gap-1 rounded-full px-5 ${minRating > 0 ? 'bg-ink' : 'bg-gray-200'}`}
          style={{ height: CHIP_HEIGHT, minWidth: CHIP_MIN_WIDTH }}
        >
          <Text className={`text-[15px] font-medium ${minRating > 0 ? 'text-white' : 'text-ink'}`}>{RATING_LABEL[minRating]}</Text>
          <AppIcon icon={ArrowDown01Icon} size={14} color={minRating > 0 ? '#FFFFFF' : `${colors.ink}99`} strokeWidth={2} />
        </Pressable>
      </ScrollView>
    </View>
  );
}
