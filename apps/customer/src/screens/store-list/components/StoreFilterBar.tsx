// Replaces CategoryFilterBar entirely (search icon, heart icon, always-
// visible category chip row on a lavender panel) — swapped for this
// light-gray pill row instead. Sits directly on the screen's own plain
// background, no colored panel behind it: this is the app's existing base
// tone (StoreListScreen.tsx is bg-[#FAFAFA], the pills below are bg-white
// on top of that), reused as-is rather than introducing a new one.
//
// Search dropped per an explicit ask (StoreHeader.tsx's own note on why
// it doesn't carry a search icon of its own needs revisiting if this ever
// comes back) — the heart/favourite icon takes that slot instead. No
// longer a local-only decorative toggle: it's now a real filter,
// controlled from StoreListScreen (same lifted-state shape as
// openNowOnly) — tapping it fills red and switches the list to only the
// stores liked from their own StoreCard.tsx heart button
// (useLikedStoresStore, shared between both).
//
// No standalone sliders/filter icon anymore, per an explicit ask — it was
// a redundant fourth way to open the exact same StoreFilterSheet the
// Sort by/Category/Rating chips already open, not a distinct action of
// its own. Those three chips (plus Open now, a plain instant toggle with
// no sheet/dropdown arrow) are the only entry points into it now.
//
// Every pill — heart, and all four chips — shares the same height (48px)
// and corner radius, per an explicit ask to fix the inconsistent sizes/
// backgrounds an earlier pass had drifted into (bg-gray-200 on some,
// bg-gray-100 on others, mismatched radii). CHIP_MIN_WIDTH keeps the
// shorter labels ("Rating", "Category") from looking visibly smaller than
// "Fastest delivery" once that's selected — they still grow past it for
// longer text, just don't shrink below that floor.
//
// Outlined-pill style (white fill, thin border, rest state) replacing the
// old solid-gray/solid-ink fill. Active state is a light hairline border
// plus a light tinted background (ACTIVE_BORDER/ACTIVE_BG) — no heavy/
// thick border and no shadow-glow (an earlier pass tried that, per an
// explicit ask it read as too heavy) — same thin 1px border either way,
// just a different color+fill for the selected state. Same options as
// before (heart/Sort by/Open now/Category/Rating) — this is a restyle,
// not a feature change.
//
// The heart chip follows this exact same generic active treatment for its
// container (light border + light bg, not a red-bordered chip) — only the
// heart ICON itself turns solid red when liked, since red-heart-means-
// liked is its own, separate, universally understood signal from "this
// filter chip is active."

import { ArrowDown01Icon, FavouriteIcon } from '@hugeicons/core-free-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { MinRating, StoreSort } from './StoreFilterSheet';

// Same indigo family as StoreHeader.tsx/StorePromoBanner.tsx's own
// gradient — the active-chip glow ties back to the same premium identity
// rather than introducing an unrelated accent color.
const ACTIVE_BORDER = '#4C5FE0';
const ACTIVE_TEXT = '#2A3494';
const ACTIVE_BG = '#EEF0FE';

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

// Reduced from 48/108 — per an explicit ask/reference, a more compact
// pill (matches a real reference screenshot's own proportions) reads as
// tighter/premium rather than oversized.
const CHIP_HEIGHT = 38;
const CHIP_MIN_WIDTH = 84;

interface Props {
  sort: StoreSort;
  minRating: MinRating;
  selectedCategory: string;
  openNowOnly: boolean;
  likedOnly: boolean;
  onOpenFilterSheet: () => void;
  onToggleOpenNow: () => void;
  onToggleLikedOnly: () => void;
}

export function StoreFilterBar({
  sort,
  minRating,
  selectedCategory,
  openNowOnly,
  likedOnly,
  onOpenFilterSheet,
  onToggleOpenNow,
  onToggleLikedOnly,
}: Props) {
  // One shared style function instead of five near-identical ternary
  // chains — same thin 1px border either way, just a light gray at rest
  // vs. ACTIVE_BORDER + a light ACTIVE_BG tint when selected. No shadow —
  // "light border with light bg", not a heavier glow/elevation treatment.
  function chipStyle(active: boolean) {
    return {
      height: CHIP_HEIGHT,
      minWidth: CHIP_MIN_WIDTH,
      borderWidth: 1,
      borderColor: active ? ACTIVE_BORDER : '#E5E7EB',
      backgroundColor: active ? ACTIVE_BG : '#FFFFFF',
    };
  }

  return (
    // Heart moved inside the same ScrollView as the other four chips (was
    // a fixed sibling outside it) — per an explicit ask, the whole row
    // scrolls together as one horizontal strip instead of only the last
    // four chips scrolling past a pinned heart.
    //
    // Horizontal inset lives on the ScrollView's own contentContainer
    // (px-5), not a padding wrapper around the ScrollView itself — a
    // padded wrapper only insets the box at rest; once actually scrolled,
    // the real edges of the *content* are what matter, and those still
    // need their own start/end padding or the last chip ends up flush
    // against (and visually clipped by) the screen edge.
    <View className="py-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5">
        <Pressable
          onPress={onToggleLikedOnly}
          hitSlop={8}
          className="flex-row items-center justify-center gap-1 rounded-xl px-4"
          style={chipStyle(likedOnly)}
        >
          <Text className="text-[13px] font-medium"
            style={{ color: likedOnly ? ACTIVE_TEXT : colors.ink }}>
            Favourite
          </Text>
          {/* Only the icon itself turns solid red when liked — the chip's
              own border/bg still follow the same generic active treatment
              as every other chip (this file's own header note). */}
          <AppIcon
            icon={FavouriteIcon}
            size={15}
            color={likedOnly ? colors.danger : colors.ink}
            fill={likedOnly ? colors.danger : undefined}
            strokeWidth={likedOnly ? 0 : 1.8}
          />
        </Pressable>

        <Pressable
          onPress={onOpenFilterSheet}
          className="flex-row items-center justify-center gap-1 rounded-xl px-4"
          style={chipStyle(sort !== 'relevance')}
        >
          <Text className="text-[13px] font-medium"
            style={{ color: sort !== 'relevance' ? ACTIVE_TEXT : colors.ink }}>
            {SORT_LABEL[sort]}
          </Text>
          <AppIcon icon={ArrowDown01Icon} size={12} color={sort !== 'relevance' ? ACTIVE_TEXT : `${colors.ink}99`} strokeWidth={2} />
        </Pressable>

        <Pressable
          onPress={onToggleOpenNow}
          className="items-center justify-center rounded-xl px-4"
          style={chipStyle(openNowOnly)}
        >
          <Text className="text-[13px] font-medium"
            style={{ color: openNowOnly ? ACTIVE_TEXT : colors.ink }}>
            Open now
          </Text>
        </Pressable>

        <Pressable
          onPress={onOpenFilterSheet}
          className="flex-row items-center justify-center gap-1 rounded-xl px-4"
          style={chipStyle(selectedCategory !== 'All')}
        >
          <Text
            className="text-[13px] font-medium"
            style={{ color: selectedCategory !== 'All' ? ACTIVE_TEXT : colors.ink }}
          >
            {selectedCategory === 'All' ? 'Category' : selectedCategory}
          </Text>
          <AppIcon
            icon={ArrowDown01Icon}
            size={12}
            color={selectedCategory !== 'All' ? ACTIVE_TEXT : `${colors.ink}99`}
            strokeWidth={2}
          />
        </Pressable>

        <Pressable
          onPress={onOpenFilterSheet}
          className="flex-row items-center justify-center gap-1 rounded-xl px-4"
          style={chipStyle(minRating > 0)}
        >
          <Text className="text-[13px] font-medium"
            style={{ color: minRating > 0 ? ACTIVE_TEXT : colors.ink }}>
            {RATING_LABEL[minRating]}
          </Text>
          <AppIcon icon={ArrowDown01Icon} size={12} color={minRating > 0 ? ACTIVE_TEXT : `${colors.ink}99`} strokeWidth={2} />
        </Pressable>
      </ScrollView>
    </View>
  );
}
