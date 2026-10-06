import { useContext } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { Easing, useAnimatedScrollHandler, useSharedValue, withTiming } from 'react-native-reanimated';
import { HomeNavigationProgressContext } from '../../../navigation/home/HomeNavigationProgressContext';

// Home and category pages share the same collapsing header and direction-
// based navigation motion. The cart remains visible through BottomNavBar.
export function useHomeBrowseScroll() {
  const isFocused = useIsFocused();
  const scrollY = useSharedValue(0);
  const previousY = useSharedValue(0);
  const localNavHidden = useSharedValue(0);
  const navHidden = useContext(HomeNavigationProgressContext) ?? localNavHidden;
  const hasDragged = useSharedValue(false);
  const scrollHandler = useAnimatedScrollHandler({
    onBeginDrag: () => { hasDragged.value = true; },
    onScroll: (event) => {
      const y = event.contentOffset.y;
      scrollY.value = y;
      const delta = y - previousY.value;
      previousY.value = y;
      // Initial layout/restore events and background-screen momentum must
      // not reset the persistent bar. Only the focused user's scroll does.
      if (!isFocused || !hasDragged.value) return;
      if (y < 40 || delta < -6) {
        navHidden.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
      } else if (delta > 6) {
        navHidden.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
      }
    },
  });
  return { scrollY, navHidden, scrollHandler };
}
