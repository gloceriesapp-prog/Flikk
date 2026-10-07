import { useAuthStore } from '../../store/useAuthStore';
import { cartPurchaseSignature } from '../../store/cartIdentity';
import { clearCommittedAttempt } from '../../features/checkout-recovery/attemptStorage';
// UPI wait screen: success clears the saved checkout; timeout or a network
// error opens backend recovery. Navigation snapshots only support the first
// receipt display; restart recovery reads backend amounts and status.
import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { pollOrderPaid, POLL_TIMEOUT_SECONDS } from '../../payments/pollOrderPaid';
import { colors, minTouchTarget } from '../../theme/tokens';
import { useCartStore } from '../../store/useCartStore';
import { rememberPaymentMethod } from '../../api/payments';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'PaymentProcessing'>;

export function PaymentProcessingScreen({ route, navigation }: Props) {
  const { target, amount, order, items, deliveryAddress, isTrip, appName, paymentMethod, collect } = route.params;
  // Collect requests wait until their own expiry; intents use the poll budget.
  const [deadline] = useState(() => {
    const expiry = collect?.expiresAt ? Date.parse(collect.expiresAt) : NaN;
    return Number.isFinite(expiry) ? expiry : Date.now() + POLL_TIMEOUT_SECONDS * 1000;
  });
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  const clearCart = useCartStore((state) => state.clear);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const epoch = useAuthStore.getState().sessionEpoch;

    pollOrderPaid(target, collect ? deadline : undefined).then(async (paid) => {
      if (cancelled || useAuthStore.getState().sessionEpoch !== epoch) return;

      if (!paid) {
        navigation.replace('PaymentRecovery', { target });
        return;
      }

      // Real order confirmed paid — safe to clear the cart now, same
      // moment every other payment path in CheckoutScreen.tsx's own
      // goToReceipt already does it. Held off until now (not when this
      // screen first opened) so a failure leaves the cart exactly as the
      // customer left it, ready to retry.
      await clearCommittedAttempt(target);
      if (cancelled || useAuthStore.getState().sessionEpoch !== epoch) return;
      if (cartPurchaseSignature(useCartStore.getState().items) === cartPurchaseSignature(items)) clearCart();
      void rememberPaymentMethod(paymentMethod, target).catch(() => {});
      navigation.replace('Receipt', {
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        amount,
        items,
        paymentMethodLabel: appName,
        placedAt: order.placedAt,
        avgPrepMinutes: order.avgPrepMinutes,
        estimatedDeliveryMinutes: order.estimatedDeliveryMinutes,
        estimatedDeliveryAt: order.estimatedDeliveryAt,
        isTrip,
        deliveryAddress,
      });
    }).catch(() => { if (!cancelled && useAuthStore.getState().sessionEpoch === epoch) navigation.replace('PaymentRecovery', { target }); });

    return () => {
      cancelled = true;
    };
    // Runs exactly once per mount — target/order/items/etc are a single
    // frozen snapshot for the one payment attempt this screen exists for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white px-10">
      <Text className="text-lg font-semibold text-ink">{collect ? 'Approve the payment in your UPI app' : 'Payment Processing'}</Text>
      <Text className="text-center text-[13.5px] font-medium text-ink/55">
        {collect
          ? `We sent a payment request of ₹${amount.toFixed(2)} to ${collect.vpa}. Open your UPI app, check pending requests and approve it.`
          : `Please wait while we confirm your payment with ${appName}. This will only take a moment.`}
      </Text>
      <ActivityIndicator size="large" color={colors.limeDeep} />
      <Text accessibilityLiveRegion="polite" className="text-[13.5px] font-semibold text-ink/70">
        {collect ? 'Request expires in ' : 'Checking for '}{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
      </Text>
      {/* Backed out of the UPI app? Recovery offers cancel / cash on delivery. */}
      <Pressable onPress={() => navigation.replace('PaymentRecovery', { target })} hitSlop={8} accessibilityRole="button"
        accessibilityLabel="Didn’t complete the payment? See other options" className="mt-4 justify-center px-2" style={{ minHeight: minTouchTarget }}>
        <Text className="text-[13.5px] font-semibold text-ink underline">Didn’t complete the payment?</Text>
      </Pressable>
    </View>
  );
}
