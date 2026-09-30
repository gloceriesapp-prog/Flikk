// Horizontal scroll of category shortcuts. Controlled by the parent (HomeScreen)
// now — selection needs to reach the body below the header (e.g. showing the
// Fresh Fish grid), so it can't live locally in this component anymore.
// "All" is the only hardcoded tab; everything after it is real admin data
// (see data/categoryTabs.ts's own note).
//
// headerBottomColor is gone — it only ever existed for CategoryTabItem's
// old scoop-cutout mask, which is gone too (that file's own note); nothing
// here needs to know the header's exact color anymore.
//
// border-b border-white/20 — the "add a horizontal line too" ask, a plain
// full-width divider separating this row from whatever scrolls beneath it,
// on top of each tab's own short active-state underline (CategoryTabItem).
//
// isFrosted — HomeHeader's own scroll-driven flip (same COLLAPSE_DISTANCE
// threshold the OS status bar already flips at): white icons/text read
// fine against the gradient, but turn near-invisible once the frosted
// BlurView takes over, so CategoryTabItem needs to know to switch to black.
//
// Auto-scroll-into-view on tap — only ~5 tabs fit on screen at once, so
// tapping the last (partially) visible one used to just select it in
// place with no sign a 6th tab even existed off to the right. Each tab's
// own x/width is captured via onLayout (real measured layout, not a
// guessed tab width — labels vary in length) into layoutsRef; tapping one
// scrolls far enough that the NEXT tab after it is fully visible too, not
// just a sliver of it — a real "here's the next whole option", not a
// half-cut-off tease. Scrolling left works the same way in reverse, for
// tapping back toward an earlier tab that's since scrolled out of view.

import { useRef } from 'react';
import { ScrollView, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { CategoryTabItem } from './CategoryTabItem';
import { ALL_TAB, iconForTabName, type Category } from '../data/categoryTabs';
import { useHomeTabs } from '../data/useHomeTabs';

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
  isFrosted?: boolean;
  // 'all' tab is a light pastel header — its divider must be dark-on-light
  // (border-ink/10) instead of the white/20 that only shows on a dark
  // gradient. Tab icons/text already flip via isFrosted (HomeHeader OR's
  // isLightHeader into it), so only the divider needs this flag.
  light?: boolean;
}

// Small breathing room past whichever edge is the real scroll target
// (the next tab's far edge going forward, the tapped tab's own near edge
// going back) — just enough that the edge isn't flush against the
// container's own boundary.
const EDGE_PADDING = 12;

export function CategoryTabs({ selectedId, onSelect, isFrosted = false, light = false }: Props) {
  const { data: realTabs = [] } = useHomeTabs();
  const tabs: Category[] = [ALL_TAB, ...realTabs.map((t) => ({ id: t.id, label: t.name, icon: iconForTabName(t.name) }))];

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

  function handleSelect(category: Category) {
    onSelect(category.id);

    const layout = layoutsRef.current[category.id];
    const containerWidth = containerWidthRef.current;
    if (!layout || !containerWidth) return;

    const currentScrollX = scrollXRef.current;
    const visibleRight = currentScrollX + containerWidth;

    // Forward target is the NEXT tab's own far edge, not the tapped tab's
    // own — so scrolling reveals the whole next option, fully, not just
    // enough of the tapped one to confirm it's selected. Falls back to
    // the tapped tab's own edge when it's the last tab (nothing after it
    // to reveal).
    const index = tabs.findIndex((t) => t.id === category.id);
    const nextLayout = index >= 0 ? layoutsRef.current[tabs[index + 1]?.id] : undefined;
    const forwardTarget = nextLayout ? nextLayout.x + nextLayout.width : layout.x + layout.width;

    if (forwardTarget + EDGE_PADDING > visibleRight) {
      // The MINIMUM scroll that satisfies "next tab fully visible" — never
      // scroll further than this, or that guarantee breaks. Whenever the
      // screen is wide enough to fit prev+tapped+next tabs together (the
      // normal case), landing here already leaves the previous tab fully
      // visible too, as a side effect of not over-scrolling — no separate
      // "target the previous tab's edge instead" logic needed, and no
      // risk of that logic picking a SMALLER x that leaves the next tab
      // still cut off (which is exactly what broke here last time).
      scrollRef.current?.scrollTo({ x: forwardTarget + EDGE_PADDING - containerWidth, animated: true });
    } else if (layout.x - EDGE_PADDING < currentScrollX) {
      scrollRef.current?.scrollTo({ x: Math.max(layout.x - EDGE_PADDING, 0), animated: true });
    }
  }

  return (
    // border-b divider under the whole row; each tab's own short underline
    // (CategoryTabItem) sits on top of it for the active tab.
    <View className={`mt-2 border-b ${light ? 'border-ink/10' : 'border-white/20'}`} onLayout={handleContainerLayout}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-0.5 px-4"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {tabs.map((category) => (
          <View key={category.id} onLayout={(e) => (layoutsRef.current[category.id] = { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width })}>
            <CategoryTabItem
              category={category}
              isSelected={category.id === selectedId}
              onPress={() => handleSelect(category)}
              isFrosted={isFrosted}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
