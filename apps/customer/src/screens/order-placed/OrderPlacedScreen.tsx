// The moment after checkout succeeds (Blinkit/Instamart style): a full-screen
// "Order placed": a green verified badge whose tick draws itself, a success haptic and,
// for a confirmed online payment, the payment chime. After ORDER_PLACED_MS it
// moves on to Track Order by itself; a tap anywhere or Android back goes
// there at once. The stack is reset to Home → TrackOrder so back from
// tracking lands on Home, never on checkout. The bill lives in Track Order's
// "View order summary"; there is no separate receipt screen.
import { useCallback, useEffect, useRef } from 'react';
import { BackHandler, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { ScreenStatusBar as StatusBar } from '../../components/ScreenStatusBar';
import { loadPaymentChime } from '../../payments/paymentChime';
import type { AppStackParamList } from '../../navigation/types';
import { isPreviewing } from '../../dev/screenPreview';

type Props = NativeStackScreenProps<AppStackParamList, 'OrderPlaced'>;

export const ORDER_PLACED_MS = 2600;
const TICK_AT_MS = 320;
const SEAL = 132;
const TICK_PATH = 'M30 57 L48 74 L82 39';
const TICK_LENGTH = 74; // the two strokes of TICK_PATH, rounded up
const GREEN = '#34C759';

// The verified badge: a circle with 12 soft scallops (petal edge), drawn as
// one closed path on the 112x112 seal.
function scallopPath(size: number, bumps = 12, depth = 0.055): string {
  const c = size / 2;
  const radius = c * 0.94;
  const steps = 240;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r = radius * (1 - depth + depth * Math.cos(bumps * t));
    d += `${i === 0 ? 'M' : 'L'}${(c + r * Math.cos(t)).toFixed(2)} ${(c + r * Math.sin(t)).toFixed(2)}`;
  }
  return `${d}Z`;
}
const BADGE_PATH = scallopPath(112); // in the 112x112 viewBox, scaled to SEAL
const AnimatedPath = Animated.createAnimatedComponent(Path);

function Rise({ delay, reduceMotion, children }: { delay: number; reduceMotion: boolean; children: React.ReactNode }) {
  const shown = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion) shown.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
  }, [delay, reduceMotion, shown]);
  const style = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateY: (1 - shown.value) * 14 }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

export function OrderPlacedScreen({ navigation, route }: Props) {
  const { orderId, paymentMethodLabel, paid, isTrip } = route.params;
  const reduceMotion = useReducedMotion();
  const left = useRef(false);

  const seal = useSharedValue(reduceMotion ? 1 : 0);
  const tick = useSharedValue(reduceMotion ? 0 : TICK_LENGTH);

  // Dev preview: stay on this screen; a tap replays the animation instead of
  // leaving (see dev/screenPreview.ts).
  const preview = isPreviewing('OrderPlaced');

  const goToTracking = useCallback(() => {
    if (preview) {
      navigation.replace('OrderPlaced', route.params);
      return;
    }
    if (left.current) return;
    left.current = true;
    navigation.reset({
      index: 1,
      routes: [{ name: 'Home' }, { name: 'TrackOrder', params: { orderId, paymentMethodLabel, isTrip } }],
    });
  }, [isTrip, navigation, orderId, paymentMethodLabel, preview, route.params]);

  useEffect(() => {
    // Only a confirmed online payment gets the chime (cash is paid later).
    const chime = paid ? loadPaymentChime() : null;
    if (!reduceMotion) {
      seal.value = withSpring(1, { damping: 11, stiffness: 160 });
      tick.value = withDelay(TICK_AT_MS, withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) }));
    }
    const tickTimer = setTimeout(() => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      chime?.play();
    }, TICK_AT_MS);
    const leaveTimer = preview ? undefined : setTimeout(goToTracking, ORDER_PLACED_MS);
    const back = BackHandler.addEventListener('hardwareBackPress', () => { goToTracking(); return true; });
    return () => {
      clearTimeout(tickTimer);
      clearTimeout(leaveTimer);
      back.remove();
      // Let the chime finish if it is still playing as tracking opens.
      setTimeout(() => chime?.release(), 1500);
    };
  }, [goToTracking, paid, preview, reduceMotion, seal, tick]);

  const sealStyle = useAnimatedStyle(() => ({ transform: [{ scale: seal.value }] }));
  const tickProps = useAnimatedProps(() => ({ strokeDashoffset: tick.value }));

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Order placed. Open order tracking" onPress={goToTracking} style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View className="flex-1 items-center justify-center px-8">
          <View style={{ width: SEAL, height: SEAL }} className="items-center justify-center">
            <Animated.View style={[{ width: SEAL, height: SEAL, alignItems: 'center', justifyContent: 'center' }, sealStyle]}>
              <Svg width={SEAL} height={SEAL} viewBox="0 0 112 112">
                <Path d={BADGE_PATH} fill={GREEN} />
                <AnimatedPath d={TICK_PATH} stroke="#FFFFFF" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none"
                  strokeDasharray={TICK_LENGTH} animatedProps={tickProps} />
              </Svg>
            </Animated.View>
          </View>

          <View className="mt-9 items-center">
            <Rise delay={520} reduceMotion={reduceMotion}>
              <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}
                className="text-center text-[30px] font-bold leading-[38px] tracking-tight text-ink">
                {'Yay! Your Order Placed\nSuccessfully!'}
              </Text>
            </Rise>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
