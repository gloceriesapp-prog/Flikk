import { useHeaderDeliveryStatus } from './headerDeliveryStatus';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
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
  const status = useHeaderDeliveryStatus();
  const condition = isClosed || status !== 'normal' ? '' : rain && highDemand ? combinedText : rain ? rainText : highDemand ? demandText : '';
  const [dismissedCondition, setDismissedCondition] = useState('');
  useEffect(() => {
    setDismissedCondition('');
    if (!condition) return;
    const timeout = setTimeout(() => setDismissedCondition(condition), HOLD_MS);
    return () => clearTimeout(timeout);
  }, [condition]);
  const message = visible || condition !== dismissedCondition ? condition : '';
  // Keep the last message mounted while its measured height collapses. Animating
  // layout height moves the estimate and the rest of the screen together.
  const lastMessage = useRef('');
  useEffect(() => { if (message) lastMessage.current = message; }, [message]);
  const [noticeHeight, setNoticeHeight] = useState(60);
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(message ? 1 : 0, {
      duration: 260, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System,
    });
  }, [message, progress]);
  const animatedStyle = useAnimatedStyle(() => ({
    height: (noticeHeight + 10) * progress.value,
    opacity: progress.value,
  }));

  return (
    <Animated.View pointerEvents="none" accessibilityElementsHidden={!message}
      importantForAccessibility={message ? 'auto' : 'no-hide-descendants'}
      style={[{ width: '100%', overflow: 'hidden' }, animatedStyle]}>
      <View accessibilityLiveRegion="polite" accessibilityRole="text" onLayout={event => {
        const height = event.nativeEvent?.layout?.height;
        if (height != null && Number.isFinite(height) && height > 0) {
          setNoticeHeight(previous => Math.abs(previous - height) < 0.5 ? previous : height);
        }
      }} style={{ position: 'absolute', top: 6, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EAF2FF', paddingHorizontal: 16, paddingVertical: 10 }}>
        <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#D7E5FF', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#155DFC', alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={21} height={21} viewBox="0 0 24 24" fill="none" accessible={false}>
              <Path d={rain ? 'M6 15a4 4 0 0 1-.6-7.95A6 6 0 0 1 17 6a4.5 4.5 0 0 1 1 8.9M8 17l-1 3m6-3-1 3m6-3-1 3' : 'M4 17l6-6 4 4 6-9m-6 0h6v6'} stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
        </View>
        <Text style={{ flex: 1, fontFamily: 'Gilroy-Medium', fontSize: 13, lineHeight: 18, color: '#234B83' }}>{message || lastMessage.current}</Text>
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
