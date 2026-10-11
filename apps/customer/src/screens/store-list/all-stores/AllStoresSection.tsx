// The full vertical store list — now the single virtualized surface for the
// whole StoreListScreen (M3). The screen used to render every store via a
// plain `.map()` inside one Animated.ScrollView, which virtualizes nothing;
// this is now one FlashList whose ListHeaderComponent carries everything above
// the list (promo + filter + Nearest + Popular, passed in as `header`) and
// whose ListFooterComponent is the BrandFooter — so only the store cards, the
// one genuinely unbounded list, recycle. Same `@shopify/flash-list` +
// BrandFooter-as-footer convention as StoreDetailScreen.tsx / CoconutOilScreen
// already use here.
//
// FlashList isn't a NativeWind-patched core component (same gotcha
// StoreDetailScreen documents), so spacing is plain style / wrapping Views,
// not a className on the list. The animated scroll handler and the collapsing
// StoreHeader stay with the parent: StoreListScreen owns scrollY and renders
// StoreHeader pinned above this list. FlashList v2 dropped `stickyHeaderIndices`
// (it extends ScrollViewProps but doesn't apply it to the list), so the old
// sticky index-0 header is a pinned sibling there instead — same always-at-top
// result now that bounces are off.
//
// `stores` is passed in (StoreListScreen owns the single useAllStores() call,
// since StoreFilterBar/StoreFilterSheet need the same data to build their
// category options) rather than fetched again here — one real fetch,
// filtered/sorted one way, not a second independent query for the same rows.

import type { ComponentType, ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { type ScrollHandlerProcessed } from 'react-native-reanimated';
import { FlashList, type FlashListProps } from '@shopify/flash-list';
import { BrandFooter } from '../../../components/BrandFooter';
import { StoreCard } from '../components/StoreCard';
import type { RealStore } from './useAllStores';

// No reanimated-driven animated FlashList ships with the library — the one it
// exports wraps RN's own Animated and types its props as `any`, which can't
// carry a reanimated scroll handler under strict mode. Build one and re-apply
// the RealStore item type the generic erases through createAnimatedComponent.
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList as unknown as ComponentType<FlashListProps<RealStore>>,
);

interface Props {
  stores: RealStore[];
  // Everything that scrolls above the store cards (promo + filter + Nearest +
  // Popular), rendered once as the list header rather than as list items.
  header: ReactElement;
  onScroll: ScrollHandlerProcessed;
  isError: boolean;
  isRefetching: boolean;
  onRefresh: () => void;
}

export function AllStoresSection({ stores, header, onScroll, isError, isRefetching, onRefresh }: Props) {
  return (
    <AnimatedFlashList
      data={stores}
      keyExtractor={(store) => store.id}
      onScroll={onScroll}
      scrollEventThrottle={16}
      // Same as the old Animated.ScrollView: kill iOS rubber-banding and
      // Android overscroll so a pull-past-the-top can't drag the pinned header.
      bounces={false}
      overScrollMode="never"
      showsVerticalScrollIndicator={false}
      // Pull-to-refresh (M5) — refetch the stores query; `isRefetching` is the
      // background-refetch flag (not the initial load), exactly the spinner's
      // lifetime.
      refreshing={isRefetching}
      onRefresh={onRefresh}
      contentContainerStyle={{ paddingBottom: 112 }}
      ListHeaderComponent={
        <>
          {header}
          <View className="px-5 pb-4 pt-6">
            <Text className="text-[18px] font-bold text-ink tracking-[-0.35px]">All stores</Text>
          </View>
        </>
      }
      // On error the list used to silently vanish (data defaulted to []); now
      // it surfaces the failure with a retry, matching NearestToYouSection's
      // copy/pattern.
      ListEmptyComponent={
        <View className="px-5 pb-6">
          <Text className="text-sm text-ink/60">
            {isError ? 'Could not load stores. Please try again.' : 'No stores match your filters.'}
          </Text>
          {isError && (
            <Pressable onPress={onRefresh} accessibilityRole="button" className="mt-3">
              <Text className="font-semibold text-[#155DFC]">Try again</Text>
            </Pressable>
          )}
        </View>
      }
      ListFooterComponent={<BrandFooter />}
      renderItem={({ item }) => (
        <View className="px-5 pb-4">
          <StoreCard store={item} />
        </View>
      )}
    />
  );
}
