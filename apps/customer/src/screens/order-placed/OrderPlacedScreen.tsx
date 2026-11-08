// The moment after checkout succeeds (Blinkit/Instamart style): a full-screen
// "Order placed" with a tick that draws itself, ripples, a success haptic and,
// for a confirmed online payment, the payment chime. After ORDER_PLACED_MS it
// moves on to Track Order by itself; a tap anywhere or Android back goes
// there at once. The stack is reset to Home → TrackOrder so back from
// tracking lands on Home, never on checkout. The bill lives in Track Order's
// "View order summary"; there is no separate receipt screen.
import { useCallback, useEffect, useRef } from 'react';
import { BackHandler, Pressable, Text, View, useWindowDimensions } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
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
import { arrivalLine, paymentLine } from './orderPlacedText';

type Props = NativeStackScreenProps<AppStackParamList, 'OrderPlaced'>;

export const ORDER_PLACED_MS = 2600;
const TICK_AT_MS = 320;
const SEAL = 112;
const TICK_PATH = 'M30 57 L48 74 L82 39';
const TICK_LENGTH = 74; // the two strokes of TICK_PATH, rounded up
const AnimatedPath = Animated.createAnimatedComponent(Path);

function Ripple({ delay, reduceMotion }: { delay: number; reduceMotion: boolean }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    if (!reduceMotion) progress.value = withDelay(delay, withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }));
  }, [delay, progress, reduceMotion]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - progress.value),
    transform: [{ scale: 1 + progress.value * 1.6 }],
  }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: SEAL, height: SEAL, borderRadius: SEAL / 2, borderWidth: 2, borderColor: '#FFFFFF' }, style]} />;
}

function Rise({ delay, reduceMotion, children }: { delay: number; reduceMotion: boolean; children: React.ReactNode }) {
  const shown = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion) shown.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
  }, [delay, reduceMotion, shown]);
  const style = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateY: (1 - shown.value) * 14 }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

export function OrderPlacedScreen({ navigation, route }: Props) {
  const { orderId, orderNumber, amount, paymentMethodLabel, paid, isTrip, estimatedDeliveryMinutes, estimatedDeliveryAt, preorderLabel } = route.params;
  const reduceMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const left = useRef(false);

  const seal = useSharedValue(reduceMotion ? 1 : 0);
  const tick = useSharedValue(reduceMotion ? 0 : TICK_LENGTH);
  const bar = useSharedValue(0);

  const goToTracking = useCallback(() => {
    if (left.current) return;
    left.current = true;
    navigation.reset({
      index: 1,
      routes: [{ name: 'Home' }, { name: 'TrackOrder', params: { orderId, paymentMethodLabel, isTrip } }],
    });
  }, [isTrip, navigation, orderId, paymentMethodLabel]);

  useEffect(() => {
    // Only a confirmed online payment gets the chime (cash is paid later).
    const chime = paid ? loadPaymentChime() : null;
    if (!reduceMotion) {
      seal.value = withSpring(1, { damping: 11, stiffness: 160 });
      tick.value = withDelay(TICK_AT_MS, withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) }));
    }
    bar.value = withTiming(1, { duration: ORDER_PLACED_MS, easing: Easing.linear });
    const tickTimer = setTimeout(() => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      chime?.play();
    }, TICK_AT_MS);
    const leaveTimer = setTimeout(goToTracking, ORDER_PLACED_MS);
    const back = BackHandler.addEventListener('hardwareBackPress', () => { goToTracking(); return true; });
    return () => {
      clearTimeout(tickTimer);
      clearTimeout(leaveTimer);
      back.remove();
      // Let the chime finish if it is still playing as tracking opens.
      setTimeout(() => chime?.release(), 1500);
    };
  }, [bar, goToTracking, paid, reduceMotion, seal, tick]);

  const sealStyle = useAnimatedStyle(() => ({ transform: [{ scale: seal.value }] }));
  const tickProps = useAnimatedProps(() => ({ strokeDashoffset: tick.value }));
  const barStyle = useAnimatedStyle(() => ({ width: bar.value * (width - 96) }));

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Order placed. Open order tracking" onPress={goToTracking} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0A2E9E', '#1248E0', '#155DFC']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center px-8">
          <View style={{ width: SEAL, height: SEAL }} className="items-center justify-center">
            <Ripple delay={TICK_AT_MS} reduceMotion={reduceMotion} />
            <Ripple delay={TICK_AT_MS + 260} reduceMotion={reduceMotion} />
            <Animated.View style={[{ width: SEAL, height: SEAL, borderRadius: SEAL / 2, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, sealStyle]}>
              <Svg width={SEAL} height={SEAL} viewBox="0 0 112 112">
                <AnimatedPath d={TICK_PATH} stroke="#155DFC" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none"
                  strokeDasharray={TICK_LENGTH} animatedProps={tickProps} />
              </Svg>
            </Animated.View>
          </View>

          <View className="mt-9 items-center">
            <Rise delay={520} reduceMotion={reduceMotion}>
              <Text className="text-center text-[30px] font-bold tracking-tight text-white">
                {preorderLabel ? 'Pre-order placed!' : 'Order placed!'}
              </Text>
            </Rise>
            <Rise delay={620} reduceMotion={reduceMotion}>
              <Text className="mt-2 text-center text-[16px] font-medium text-white/80">{paymentLine(amount, paid, paymentMethodLabel)}</Text>
            </Rise>
            <Rise delay={720} reduceMotion={reduceMotion}>
              <View className="mt-6 rounded-full bg-white/15 px-5 py-2.5">
                <Text className="text-center text-[15px] font-semibold text-white">
                  {arrivalLine({ preorderLabel, estimatedDeliveryMinutes, estimatedDeliveryAt })}
                </Text>
              </View>
            </Rise>
            {preorderLabel ? (
              <Rise delay={800} reduceMotion={reduceMotion}>
                <Text className="mt-3 text-center text-[13px] text-white/70">Waiting for the shop to confirm</Text>
              </Rise>
            ) : null}
          </View>
        </View>

        <View className="items-center px-12 pb-safe-offset-8">
          <Text className="mb-3 text-[12px] font-medium text-white/60">Order {orderNumber} · Opening tracking…</Text>
          <View className="h-1 w-full overflow-hidden rounded-full bg-white/20">
            <Animated.View style={[{ height: 4, borderRadius: 2, backgroundColor: '#FFFFFF' }, barStyle]} />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
