// Home and Store share one top header, owned by HomeNavigationShell so it
// stays mounted across the tab switch. The focused screen mirrors its scroll
// offset into this value, which folds the header's location row.

import { createContext, useContext, useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useAnimatedReaction, type SharedValue } from 'react-native-reanimated';

export const TopHeaderScrollContext = createContext<SharedValue<number> | null>(null);

export function usePublishHeaderScroll(scrollY: SharedValue<number>) {
  const headerScroll = useContext(TopHeaderScrollContext);
  const isFocused = useIsFocused();
  // On focus, the header takes this screen's own position at once.
  useEffect(() => {
    if (isFocused) headerScroll?.set(scrollY.get());
  }, [isFocused, headerScroll, scrollY]);
  useAnimatedReaction(
    () => scrollY.get(),
    (y) => { if (isFocused) headerScroll?.set(y); },
    [isFocused, headerScroll],
  );
}
