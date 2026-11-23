import { useContext } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { Easing, useAnimatedScrollHandler, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { HomeNavigationProgressContext } from '../../../navigation/home/HomeNavigationProgressContext';

// Slide the bottom bar to `to` (0 shown, 1 hidden). Scroll events fire every
// frame; restarting the same 220ms timing each frame kept pushing the end
// back, so the bar crawled and the UI thread did extra work on every frame.
// Start it once per direction change; `last` is per screen, and the distance
// check re-arms it when another screen moved the shared bar meanwhile.
export function moveNavBar(nav: SharedValue<number>, last: SharedValue<number>, to: 0 | 1) {
  'worklet';
  if (to === last.value && Math.abs(nav.value - to) < 1) return;
  last.value = to;
  nav.value = withTiming(to, { duration: 220, easing: Easing.out(Easing.cubic) });
}

// Home and category pages share the same collapsing header and direction-
// based navigation motion. The cart remains visible through BottomNavBar.
export function useHomeBrowseScroll() {
  const isFocused = useIsFocused();
  const scrollY = useSharedValue(0);
  const previousY = useSharedValue(0);
  const localNavHidden = useSharedValue(0);
  const navHidden = useContext(HomeNavigationProgressContext) ?? localNavHidden;
  const hasDragged = useSharedValue(false);
  const navTarget = useSharedValue(0);
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
      if (y < 40 || delta < -6) moveNavBar(navHidden, navTarget, 0);
      else if (delta > 6) moveNavBar(navHidden, navTarget, 1);
    },
  });
  return { scrollY, navHidden, scrollHandler };
}
