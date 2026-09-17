// Flat horizontal row, light-blue tiles per the reference UI — sits
// directly below MostShoppedSection. Same real tabs HomeHeader's own top
// CategoryTabs row reads (useHomeTabs -> GET /home-tabs, admin-managed),
// minus ALL_TAB per an explicit ask ("all" is "show everything", not a
// real category to shortcut into). Tapping a tile switches Home's real
// selected tab via onSelectCategory — the exact same state CategoryTabs
// itself drives, not a second/competing selection mechanism.
//
// Same auto-scroll-into-view fix as CategoryTabs.tsx (that file's own
// note on why) — tapping a tile scrolls far enough that the NEXT tile is
// fully visible too, not just a sliver of it.

import { useRef } from 'react';
import { ScrollView, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { iconForTabName } from '../data/categoryTabs';
import { useHomeTabs } from '../data/useHomeTabs';
import { QuickCategoryTile } from './QuickCategoryTile';

// Small breathing room past whichever edge is the real scroll target —
// same value CategoryTabs.tsx uses for the identical logic.
const EDGE_PADDING = 12;

export function QuickCategoryStrip({ onSelectCategory }: { onSelectCategory: (id: string) => void }) {
  const { data: tabs = [] } = useHomeTabs();

  const scrollRef = useRef<ScrollView>(null);
  const layoutsRef = useRef<Record<string, { x: number; width: number }>>({});
  const containerWidthRef = useRef(0);
  const scrollXRef = useRef(0);

  function handleContainerLayout(e: LayoutChangeEvent) {
    containerWidthRef.current = e.nativeEvent.layout.width;
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollXRef.current = e.nativeEvent.contentOffset.x;
  }

  function handleSelect(tabId: string) {
    onSelectCategory(tabId);

    const layout = layoutsRef.current[tabId];
    const containerWidth = containerWidthRef.current;
    if (!layout || !containerWidth) return;

    const currentScrollX = scrollXRef.current;
    const visibleRight = currentScrollX + containerWidth;

    const index = tabs.findIndex((t) => t.id === tabId);
    const nextLayout = index >= 0 ? layoutsRef.current[tabs[index + 1]?.id] : undefined;
    const forwardTarget = nextLayout ? nextLayout.x + nextLayout.width : layout.x + layout.width;

    if (forwardTarget + EDGE_PADDING > visibleRight) {
      // The MINIMUM scroll that satisfies "next tile fully visible" —
      // never scroll further than this, or that guarantee breaks. When
      // the screen is wide enough to fit prev+tapped+next together, this
      // already leaves the previous tile fully visible too, as a side
      // effect of not over-scrolling.
      scrollRef.current?.scrollTo({ x: forwardTarget + EDGE_PADDING - containerWidth, animated: true });
    } else if (layout.x - EDGE_PADDING < currentScrollX) {
      scrollRef.current?.scrollTo({ x: Math.max(layout.x - EDGE_PADDING, 0), animated: true });
    }
  }

  if (tabs.length === 0) return null;

  return (
    <View className="pt-6" onLayout={handleContainerLayout}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-4 px-5"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {tabs.map((tab) => (
          <View key={tab.id} onLayout={(e) => (layoutsRef.current[tab.id] = { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width })}>
            <QuickCategoryTile label={tab.name} icon={iconForTabName(tab.name)} onPress={() => handleSelect(tab.id)} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
