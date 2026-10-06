// Centre selections within the natural scroll bounds. Edge categories stay
// anchored to the screen edges without blank space before or after the row.
import { useCallback, useEffect, useRef, useState } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type AnimatedStyle,
} from 'react-native-reanimated';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { CategoryTabItem } from './CategoryTabItem';
import { buildHomeCategories } from '../data/categoryTabs';
import { useHomeTabs } from '../data/useHomeTabs';
import { CATEGORY_TAB_GAP, centeredCategoryOffset } from '../data/categoryTabLayout';

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
  activeBackgroundColor: string;
  inactiveBackgroundStyle: AnimatedStyle<{ backgroundColor: string }>;
}

export function CategoryTabs({ selectedId, onSelect, activeBackgroundColor, inactiveBackgroundStyle }: Props) {
  const { data: realTabs = [] } = useHomeTabs();
  const tabs = buildHomeCategories(realTabs);
  const scrollRef = useAnimatedRef<ScrollView>();
  const layoutsRef = useRef<Record<string, { x: number; width: number }>>({});
  const contentWidthRef = useRef(0);
  const lastRequestRef = useRef<{ id: string; viewportWidth: number } | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const reduceMotion = useReducedMotion();
  const scrollX = useSharedValue(0);
  const animatedOffset = useSharedValue(0);
  const autoScrolling = useSharedValue(false);

  useDerivedValue(() => {
    if (autoScrolling.get()) scrollTo(scrollRef, animatedOffset.get(), 0, false);
  });

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => { scrollX.set(event.contentOffset.x); },
    onBeginDrag: () => {
      cancelAnimation(animatedOffset);
      autoScrolling.set(false);
    },
  });

  const centreCategory = useCallback((id: string, animated: boolean) => {
    const item = layoutsRef.current[id];
    if (!item || !viewportWidth || !contentWidthRef.current) return;
    const target = centeredCategoryOffset(item, viewportWidth, contentWidthRef.current);
    lastRequestRef.current = { id, viewportWidth };
    cancelAnimation(animatedOffset);
    autoScrolling.set(false);
    if (!animated || reduceMotion) {
      scrollRef.current?.scrollTo({ x: target, animated: false });
      return;
    }
    // Begin before mounting the selected feed. Native UI-thread animation
    // remains responsive while React prepares products and section layouts.
    animatedOffset.set(scrollX.get());
    autoScrolling.set(true);
    animatedOffset.set(withTiming(target, {
      duration: 120,
      easing: Easing.out(Easing.cubic),
    }, (finished) => {
      'worklet';
      if (finished) {
        scrollTo(scrollRef, target, 0, false);
        autoScrolling.set(false);
      }
    }));
  }, [viewportWidth, reduceMotion, scrollRef, animatedOffset, autoScrolling, scrollX]);

  // Also follows selections made elsewhere on Home, not only direct taps.
  useEffect(() => {
    if (lastRequestRef.current?.id !== selectedId || lastRequestRef.current.viewportWidth !== viewportWidth)
      centreCategory(selectedId, false);
  }, [selectedId, viewportWidth, centreCategory]);

  useEffect(() => () => {
    cancelAnimation(animatedOffset);
    autoScrolling.set(false);
  }, [animatedOffset, autoScrolling]);

  function handleContainerLayout(event: LayoutChangeEvent) {
    setViewportWidth(event.nativeEvent.layout.width);
  }

  return (
    <View className="mt-2" onLayout={handleContainerLayout}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ gap: CATEGORY_TAB_GAP, minWidth: '100%' }}
        onContentSizeChange={(width) => {
          if (width === contentWidthRef.current) return;
          contentWidthRef.current = width;
          centreCategory(selectedId, false);
        }}
      >
        {tabs.map((category) => (
          <View
            key={category.id}
            style={{ zIndex: category.id === selectedId ? 1 : 0 }}
            onLayout={(event) => {
              layoutsRef.current[category.id] = {
                x: event.nativeEvent.layout.x,
                width: event.nativeEvent.layout.width,
              };
              if (category.id === selectedId) centreCategory(selectedId, false);
            }}
          >
            <CategoryTabItem
              category={category}
              isSelected={category.id === selectedId}
              activeBackgroundColor={activeBackgroundColor}
              inactiveBackgroundStyle={inactiveBackgroundStyle}
              onPress={() => {
                centreCategory(category.id, true);
                onSelect(category.id);
              }}
            />
          </View>
        ))}
      </Animated.ScrollView>
    </View>
  );
}
