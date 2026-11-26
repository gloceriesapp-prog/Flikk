import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { useCopy } from '../../../api/appConfig';
import { selectCartTotalQuantity, useCartStore } from '../../../store/useCartStore';

const HOLD_MS = 4000;
const HomeRevealContext = createContext({ reveal: () => {}, visible: false });
export const useHomeReveal = () => useContext(HomeRevealContext).reveal;

/** One text-only notice above the delivery estimate. Real condition flags only. */
export function HomeHeaderNotice({ isClosed = false }: { isClosed?: boolean }) {
  const { visible } = useContext(HomeRevealContext);
  const highDemand = useCopy('home.highDemand.enabled') === 'true';
  const rain = useCopy('home.rain.enabled') === 'true';
  const demandText = useCopy('home.deliveryNotice.highDemand');
  const rainText = useCopy('home.deliveryNotice.rain');
  const combinedText = useCopy('home.deliveryNotice.rainAndDemand');
  const condition = isClosed ? '' : rain && highDemand ? combinedText : rain ? rainText : highDemand ? demandText : '';
  const [dismissedCondition, setDismissedCondition] = useState('');
  useEffect(() => {
    setDismissedCondition('');
    if (!condition) return;
    const timeout = setTimeout(() => setDismissedCondition(condition), HOLD_MS);
    return () => clearTimeout(timeout);
  }, [condition]);
  const count = useCartStore(selectCartTotalQuantity);
  const message = visible
    ? count > 0 ? `${count} ${count === 1 ? 'item' : 'items'} in your cart. Ready when you are.` : 'Your cart is empty. Add your favourites to get started.'
    : condition !== dismissedCondition ? condition : '';
  if (!message) return null;

  return (
    <Animated.View entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}
      exiting={FadeOut.duration(140).reduceMotion(ReduceMotion.System)} style={{ marginHorizontal: 16, marginTop: 6, marginBottom: 4 }}>
      <View accessibilityLiveRegion="polite" accessibilityRole="text" style={{ borderRadius: 12, backgroundColor: '#EAF2FF', paddingHorizontal: 12, paddingVertical: 10 }}>
        <Text style={{ fontFamily: 'Gilroy-Medium', fontSize: 13, lineHeight: 18, color: '#234B83' }}>{message}</Text>
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
