import { useAuthStore } from '../../store/useAuthStore';
import { cartPurchaseSignature } from '../../store/cartIdentity';
import { clearCommittedAttempt } from '../../features/checkout-recovery/attemptStorage';
// UPI wait screen: success clears the saved checkout; timeout or a network
// error opens backend recovery. Navigation snapshots only support the first
// receipt display; restart recovery reads backend amounts and status.
import { useEffect, useRef, useState } from 'react';
import { launchUpiIntent } from '../../payments/upiIntent';
import { Animated, AppState, BackHandler, Easing, Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { pollOrderPaid, paymentCheckDeadline } from '../../payments/pollOrderPaid';
import { minTouchTarget } from '../../theme/tokens';
import { useCartStore } from '../../store/useCartStore';
import { rememberPaymentMethod, verifyPayment } from '../../api/payments';
import { openRazorpayCheckout } from '../../payments/openRazorpayCheckout';
import { dismissIosUpiCheckout } from '../../payments/iosUpiCheckout';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'PaymentProcessing'>;

export function PaymentProcessingScreen({ route, navigation }: Props) {
  const { target, amount, order, items, deliveryAddress, isTrip, paymentMethod, expiresAt } = route.params;
  const launched = useRef(false);
  const [launchError, setLaunchError] = useState('');
  useEffect(() => {
    if ((!route.params.upiIntent && !route.params.iosUpiOrder) || launched.current) return;
    launched.current = true;
    let stopped = false;
    const controller = new AbortController();
    const epoch = useAuthStore.getState().sessionEpoch;
    const launch = route.params.iosUpiOrder
      ? openRazorpayCheckout(route.params.iosUpiOrder, paymentMethod, undefined, undefined, controller.signal).then(async result => {
          if (!stopped && useAuthStore.getState().sessionEpoch === epoch) await verifyPayment(target, result);
        })
      : launchUpiIntent(route.params.upiIntent!, paymentMethod);
    void launch.catch(() => {
      // Cancellation and delayed success can race. Keep checking this same
      // order; an SDK error is never proof of payment failure or permission to pay twice.
      if (!stopped) setLaunchError('We’re checking your payment status. Please don’t pay again.');
    });
    return () => { stopped = true; controller.abort(); if (route.params.iosUpiOrder) dismissIosUpiCheckout(); };
  }, [route.params.upiIntent, route.params.iosUpiOrder, paymentMethod, target]);
  const [deadline] = useState(() => paymentCheckDeadline(expiresAt));
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
  useEffect(() => {
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    const timer = setInterval(tick, 1000);
    const activity = AppState.addEventListener('change', state => { if (state === 'active') tick(); });
    return () => { clearInterval(timer); activity.remove(); };
  }, [deadline]);
  const clearCart = useCartStore((state) => state.clear);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const epoch = useAuthStore.getState().sessionEpoch;

    pollOrderPaid(target, deadline, controller.signal).then(async (paid) => {
      if (cancelled || useAuthStore.getState().sessionEpoch !== epoch) return;

      if (!paid) {
        navigation.replace('PaymentRecovery', { target });
        return;
      }

      if (route.params.recovered || !order || !items || !deliveryAddress) {
        navigation.replace('PaymentRecovery', { target });
        return;
      }

      // Real order confirmed paid — safe to clear the cart now, same
      // moment every other payment path in CheckoutScreen.tsx's own
      // goToOrderPlaced already does it. Held off until now (not when this
      // screen first opened) so a failure leaves the cart exactly as the
      // customer left it, ready to retry.
      await clearCommittedAttempt(target);
      if (cancelled || useAuthStore.getState().sessionEpoch !== epoch) return;
      // Read before the cart is cleared: the booked day and slot, if any.
      const preorderLabel = useCartStore.getState().preorder?.label ?? null;
      if (cartPurchaseSignature(useCartStore.getState().items) === cartPurchaseSignature(items)) clearCart();
      void rememberPaymentMethod(paymentMethod, target).catch(() => {});
      navigation.replace('OrderPlaced', {
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        amount,
        paymentMethodLabel: 'Online payment',
        paid: true,
        isTrip,
        estimatedDeliveryMinutes: order.estimatedDeliveryMinutes,
        estimatedDeliveryAt: order.estimatedDeliveryAt,
        preorderLabel,
      });
    }).catch(() => { if (!cancelled && useAuthStore.getState().sessionEpoch === epoch) navigation.replace('PaymentRecovery', { target }); });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // Runs exactly once per mount — target/order/items/etc are a single
    // frozen snapshot for the one payment attempt this screen exists for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <PaymentProcessingView secondsLeft={secondsLeft} launchError={launchError} amount={amount} appName={route.params.appName}
    onNotCompleted={() => navigation.replace('PaymentRecovery', { target })} />;
}

// The wait screen's look, shared by the real screen and the dev preview
// (PaymentProcessingPreviewScreen), so UI work needs no live payment.
export function PaymentProcessingView({ secondsLeft, launchError, amount, appName, onNotCompleted }: {
  secondsLeft: number; launchError: string; amount: number; appName: string; onNotCompleted: () => void;
}) {
  const timeLeft = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;
  return (
    <View className="flex-1 bg-white px-8 pb-safe-offset-6 pt-safe">
      <View className="flex-1 items-center justify-center">
        <PaymentSpinner label={timeLeft} />
        <Text className="mt-10 text-center text-[28px] font-bold text-ink">Hold on!</Text>
        {launchError
          ? <Text accessibilityRole="alert" className="mt-2 text-center text-[15px] font-medium text-[#B45309]">{launchError}</Text>
          : <Text className="mt-2 text-center text-[15px] font-medium text-ink/50">We are verifying your payment status.</Text>}
        <Text className="mt-1 text-center text-[13.5px] font-medium text-ink/40">
          {`Paying ₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })} via ${appName}`}
        </Text>
      </View>
      <View className="items-center gap-4">
        {/* Backed out of the UPI app? Recovery offers cancel / cash on delivery. */}
        <Pressable onPress={onNotCompleted} hitSlop={8} accessibilityRole="button"
          accessibilityLabel="Didn’t complete the payment? See other options" className="justify-center px-2" style={{ minHeight: minTouchTarget }}>
          <Text className="text-[14px] font-semibold" style={{ color: BLUE }}>Didn’t complete the payment?</Text>
        </Pressable>
        <Text className="text-center text-[13.5px] font-medium leading-5 text-ink/45">
          <Text className="font-bold text-ink">Note: </Text>
          Do not press back or close this screen until the payment is complete. Your order goes to the store only after it’s paid.
        </Text>
      </View>
    </View>
  );
}

const BLUE = '#2457F5';
const SPINNER = 132;
const STROKE = 14;

// Thick blue arc on a pale ring, turning steadily; the time left to confirm
// the payment sits in the middle.
function PaymentSpinner({ label }: { label: string }) {
  const [spin] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const radius = (SPINNER - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={{ width: SPINNER, height: SPINNER }} className="items-center justify-center">
      <Animated.View style={{ position: 'absolute', transform: [{ rotate }] }}>
        <Svg width={SPINNER} height={SPINNER}>
          <Circle cx={SPINNER / 2} cy={SPINNER / 2} r={radius} stroke="#EAF0FF" strokeWidth={STROKE} fill="none" />
          <Circle cx={SPINNER / 2} cy={SPINNER / 2} r={radius} stroke={BLUE} strokeWidth={STROKE} fill="none" strokeLinecap="round"
            strokeDasharray={`${circumference * 0.72} ${circumference}`} />
        </Svg>
      </Animated.View>
      <Text accessibilityLiveRegion="polite" accessibilityLabel={`Checking for ${label}`} className="text-[20px] font-bold text-ink">{label}</Text>
    </View>
  );
}
