import { useAuthStore } from '../../store/useAuthStore';
import { cartPurchaseSignature } from '../../store/cartIdentity';
import { clearCommittedAttempt } from '../../features/checkout-recovery/attemptStorage';
// UPI wait screen: success clears the saved checkout; timeout or a network
// error opens backend recovery. Navigation snapshots only support the first
// receipt display; restart recovery reads backend amounts and status.
import { useEffect, useRef, useState } from 'react';
import { launchUpiIntent } from '../../payments/upiIntent';
import { ActivityIndicator, AppState, BackHandler, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { pollOrderPaid, paymentCheckDeadline } from '../../payments/pollOrderPaid';
import { colors, minTouchTarget } from '../../theme/tokens';
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

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white px-10">
      <Text className="text-lg font-semibold text-ink">Confirming your payment</Text>
      {!!launchError && <Text accessibilityRole="alert" className="text-center text-red-600">{launchError}</Text>}
      <Text className="text-center text-[13.5px] font-medium text-ink/55">
        {`We’re checking the payment securely. Your order is saved.`}
      </Text>
      <ActivityIndicator size="large" color={colors.limeDeep} />
      <Text accessibilityLiveRegion="polite" className="text-[13.5px] font-semibold text-ink/70">
        Checking for {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
      </Text>
      {/* Backed out of the UPI app? Recovery offers cancel / cash on delivery. */}
      <Pressable onPress={() => navigation.replace('PaymentRecovery', { target })} hitSlop={8} accessibilityRole="button"
        accessibilityLabel="Didn’t complete the payment? See other options" className="mt-4 justify-center px-2" style={{ minHeight: minTouchTarget }}>
        <Text className="text-[13.5px] font-semibold text-ink underline">Didn’t complete the payment?</Text>
      </Pressable>
    </View>
  );
}
