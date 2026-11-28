// Home's header category row: picture + label per tab, All first. Tapping a
// tab swaps the Home body to that category in place (HomeScreen.tsx) instead
// of opening a page. Pictures reuse the Quick categories artwork rules.

import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useCopyImage } from '../../../api/appConfig';
import { AppIcon } from '../../../components/AppIcon';
import { AppImage } from '../../../components/AppImage';
import { colors } from '../../../theme/tokens';
import { ALL_TAB, PREORDER_TAB, buildHomeCategories } from '../data/categoryTabs';
import { useHomeTabs } from '../data/useHomeTabs';
import { GROCERY_QUICK_CATEGORY_IMAGE, quickCategoryArtwork } from '../quick-categories/data';
import { fadeProgress, useHeaderTint, useTintToWhite } from '../header-theme/homeHeaderTheme';
import { isUdupiTab } from '../mode-switch/useHomeModeStore';
import { SelectedTabShape, TAB_RADIUS } from './SelectedTabShape';

// Folder-tab look: every tab is a soft card (a pale wash of the header
// colour) with a rounded top; the picked one is white and flares into the
// white page below (SelectedTabShape).
const SOFT_MIX = 0.86;
const GAP = 3;
// Narrowest a tab may get when the row is shared out evenly.
const MIN_TAB_WIDTH = 70;

// Few enough tabs to fit: split the full row width evenly between them (no
// leftover space after the last). Too many: undefined, each tab keeps its
// own width and the row scrolls.
export function evenTabWidth(rowWidth: number, count: number): number | undefined {
  if (!rowWidth || !count) return undefined;
  const width = Math.floor((rowWidth - GAP * (count - 1)) / count);
  return width >= MIN_TAB_WIDTH ? width : undefined;
}
// Rounded top, straight foot; the picked tab's flare sweeps over the foot of
// its neighbours.
const SOFT_SHAPE = { borderTopLeftRadius: TAB_RADIUS, borderTopRightRadius: TAB_RADIUS };

// The row wears the header colour (header-theme/) and whitens with scrollY.
export function HomeCategoryTabs({ activeId, onSelect, scrollY }: {
  activeId: string;
  onSelect: (id: string) => void;
  scrollY?: SharedValue<number>;
}) {
  const restingScroll = useSharedValue(0);
  const scroll = scrollY ?? restingScroll;
  const tint = useHeaderTint();
  const rowStyle = useTintToWhite(scroll, tint);
  const softStyle = useTintToWhite(scroll, tint, SOFT_MIX);
  // Once scrolled the row is white, so the picked tab's white shape would
  // vanish. It hands over to a tinted card with an accent bar and tinted
  // label, cross-fading with the same scroll progress.
  const restShapeStyle = useAnimatedStyle(() => ({ opacity: 1 - fadeProgress(scroll.value) }));
  const activeCardStyle = useAnimatedStyle(() => ({
    opacity: fadeProgress(scroll.value),
    backgroundColor: interpolateColor(0.84, [0, 1], [tint.value, '#FFFFFF']),
  }));
  const accentStyle = useAnimatedStyle(() => ({ opacity: fadeProgress(scroll.value), backgroundColor: tint.value }));
  const activeLabelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(fadeProgress(scroll.value), [0, 1], [colors.ink, tint.value]),
  }));
  const { data: allTabs = [] } = useHomeTabs();
  // Udupi has its own switch at the top of Home.
  const tabs = allTabs.filter((tab) => !isUdupiTab(tab));
  // Each tab's measured size, for the picked tab's curved shape.
  const [sizes, setSizes] = useState<Record<string, { width: number; height: number }>>({});
  const groceryImage = useCopyImage('home.quickCategories.groceryImageUrl', GROCERY_QUICK_CATEGORY_IMAGE);
  // Admin App content; blank keeps the basket icon.
  const allImage = useCopyImage('home.categoryTabs.allImageUrl', '');
  const preorderImage = useCopyImage('home.categoryTabs.preorderImageUrl', '');
  const scrollRef = useRef<ScrollView>(null);
  // Each tab is as wide as its label, so remember where each one landed.
  const tabX = useRef(new Map<string, number>());
  // Pre-order is built in, always last.
  const categories = [...buildHomeCategories(tabs), PREORDER_TAB];
  const [rowWidth, setRowWidth] = useState(0);
  const tabWidth = evenTabWidth(rowWidth, categories.length);

  // Keep the selected tab in view, with a little of the previous one showing.
  useEffect(() => {
    const x = tabX.current.get(activeId);
    if (x !== undefined) scrollRef.current?.scrollTo({ x: Math.max(0, x - 40), animated: true });
  }, [activeId]);

  

  return (
    <Animated.View className="pt-2" style={rowStyle}>
      <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} scrollEnabled={!tabWidth}
        onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
        contentContainerClassName={`items-end ${tabWidth ? '' : 'pr-3'}`} contentContainerStyle={{ gap: GAP }}>
        {categories.map((category, index) => {
          const tab = tabs.find((item) => item.id === category.id);
          const isGrocery = !!tab && (tab.contentKey === 'grocery' || ['grocery', 'groceries'].includes(tab.name.trim().toLowerCase()));
          const { imageUrl } = category.id === ALL_TAB.id ? { imageUrl: allImage || undefined } : category.id === PREORDER_TAB.id ? { imageUrl: preorderImage || undefined } : quickCategoryArtwork({
            tabImage: tab?.imageUrl,
            isGrocery,
            groceryImage,
            festivalImage: tab?.festival?.headerImageUri ?? undefined,
          });
          const selected = category.id === activeId;
          const size = sizes[category.id];
          return (
            <Pressable
              key={category.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={category.label}
              onPress={() => onSelect(category.id)}
              onLayout={(event) => {
                const { x, width, height } = event.nativeEvent.layout;
                tabX.current.set(category.id, x);
                setSizes((previous) => previous[category.id]?.width === width && previous[category.id]?.height === height
                  ? previous : { ...previous, [category.id]: { width, height } });
              }}
              className={`items-center pb-2 pt-2 ${tabWidth ? 'px-1' : 'min-w-[70px] px-3'}`}
              style={{
                width: tabWidth,
                zIndex: selected ? 1 : 0,
                borderTopLeftRadius: TAB_RADIUS,
                borderTopRightRadius: TAB_RADIUS,
                // The picked tab's white comes from its shape; before it is
                // measured it falls back to a plain white card.
                backgroundColor: selected ? (size ? 'transparent' : '#FFFFFF') : undefined,
                overflow: 'visible',
              }}
            >
              {!selected && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, SOFT_SHAPE, softStyle]} />}
              {selected && size && (
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, restShapeStyle]}>
                  <SelectedTabShape width={size.width} height={size.height} flushLeft={index === 0} />
                </Animated.View>
              )}
              {selected && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, SOFT_SHAPE, activeCardStyle]} />}
              {selected && <Animated.View pointerEvents="none" className="absolute bottom-0 left-3 right-3 h-[3px] rounded-t-full" style={accentStyle} />}
              <View className="h-[38px] w-[38px] items-center justify-center">
                {imageUrl ? (
                  <AppImage source={{ uri: imageUrl }} style={{ width: 38, height: 38 }} resizeMode="contain" accessible={false} />
                ) : (
                  <AppIcon icon={category.icon} size={26} color={colors.ink} />
                )}
              </View>
              <Animated.Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                // Same weight either way so the label never shifts width when picked.
                className={`mt-1 text-[13px] font-semibold leading-[17px] ${selected ? '' : 'text-ink/70'}`}
                style={selected ? activeLabelStyle : undefined}
              >
                {category.label}
              </Animated.Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}
