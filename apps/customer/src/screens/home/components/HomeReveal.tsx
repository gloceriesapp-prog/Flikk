import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { selectCartTotalQuantity, useCartStore } from '../../../store/useCartStore';

const HOLD_MS = 3000;
const HomeRevealContext = createContext({ reveal: () => {}, visible: false });
export const useHomeReveal = () => useContext(HomeRevealContext).reveal;

/** A text-only summary below the shared header; never moves the screen surface. */
export function HomeCartNotice() {
  const { visible } = useContext(HomeRevealContext);
  const items = useCartStore(state => state.items);
  const lastAddedItemId = useCartStore(state => state.lastAddedItemId);
  const count = useCartStore(selectCartTotalQuantity);
  const last = items.find(item => item.id === lastAddedItemId) ?? items[items.length - 1];
  if (!visible) return null;

  return (
    <Animated.View entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}
      exiting={FadeOut.duration(140).reduceMotion(ReduceMotion.System)} className="bg-white px-4 pb-2 pt-1">
      <View accessibilityLiveRegion="polite" className="rounded-2xl bg-[#EEF4FF] px-4 py-3">
        <Text className="text-[15px] font-semibold leading-5 text-[#155DFC]">
          {count > 0 ? `${count} ${count === 1 ? 'item' : 'items'} in your cart` : 'Your cart is empty'}
        </Text>
        <Text className="mt-1 text-[13px] leading-[18px] text-[#526581]" numberOfLines={2}>
          {count > 0 && last ? `Last added: ${last.name}` : 'Add items to get started.'}
        </Text>
      </View>
    </Animated.View>
  );
}

export function HomeRevealSurface({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const reveal = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setVisible(true);
    timer.current = setTimeout(() => { setVisible(false); timer.current = null; }, HOLD_MS);
  }, []);

  return (
    <HomeRevealContext.Provider value={{ reveal, visible }}>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>{children}</View>
    </HomeRevealContext.Provider>
  );
}
