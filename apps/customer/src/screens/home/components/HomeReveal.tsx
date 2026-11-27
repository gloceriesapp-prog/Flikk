import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { useCopy } from '../../../api/appConfig';

const HOLD_MS = 4000;
const HomeRevealContext = createContext({ reveal: () => {}, visible: false });
export const useHomeReveal = () => useContext(HomeRevealContext).reveal;

/** Full-width delivery notice above the estimate, driven by real condition flags. */
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
  const message = visible || condition !== dismissedCondition ? condition : '';
  if (!message) return null;

  return (
    <Animated.View entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}
      exiting={FadeOut.duration(140).reduceMotion(ReduceMotion.System)} style={{ width: '100%', marginTop: 6, marginBottom: 4 }}>
      <View accessibilityLiveRegion="polite" accessibilityRole="text" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EAF2FF', paddingHorizontal: 16, paddingVertical: 10 }}>
        <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#D7E5FF', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#155DFC', alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={21} height={21} viewBox="0 0 24 24" fill="none" accessible={false}>
              <Path d={rain ? 'M6 15a4 4 0 0 1-.6-7.95A6 6 0 0 1 17 6a4.5 4.5 0 0 1 1 8.9M8 17l-1 3m6-3-1 3m6-3-1 3' : 'M4 17l6-6 4 4 6-9m-6 0h6v6'} stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
        </View>
        <Text style={{ flex: 1, fontFamily: 'Gilroy-Medium', fontSize: 13, lineHeight: 18, color: '#234B83' }}>{message}</Text>
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
