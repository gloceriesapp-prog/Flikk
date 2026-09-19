// The real waiting room for the UPI Intent flow (CheckoutScreen.tsx's own
// handlePay opens this right after launching the tapped UPI app, WITHOUT
// awaiting that launch — see that file's own note on why awaiting it used
// to block navigation here until the customer cancelled). A launched app
// returning control to us only means the customer finished interacting
// with it, never that the payment settled — payments/pollOrderPaid.ts
// watches the real order/trip row for the webhook (backend/src/payments/
// webhook.ts, the only real source of truth) to mark it paid, racing each
// wait against the app returning to the foreground so a confirm-or-cancel
// in GPay/PhonePe/etc updates this immediately instead of a stale tick.
//
// Deliberately minimal — per an explicit ask, just "Payment Processing"
// and a loader, nothing else layered on top (no icon, no video, no
// countdown, no amount). The instant pollOrderPaid resolves, this screen
// replaces itself with Receipt (paid) or PaymentStatus (not confirmed in
// time) — no intermediate success/failure moment shown here at all.
//
// Hardware back is blocked the whole time this is showing (AppNavigator.
// tsx's own gestureEnabled: false on this route covers iOS swipe-back) —
// leaving mid-poll would strand the customer back on Checkout with an
// order that already exists (unpaid) and no visible indication whether
// it's about to confirm. The order itself is untouched either way
// (jobs/expireUnpaidOrders.ts cleans up a truly abandoned one after
// 20 min) — this is purely about not confusing the customer mid-wait.

import { useEffect } from 'react';
import { ActivityIndicator, BackHandler, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { pollOrderPaid } from '../../payments/pollOrderPaid';
import { useCartStore } from '../../store/useCartStore';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'PaymentProcessing'>;

export function PaymentProcessingScreen({ route, navigation }: Props) {
  const { target, amount, order, items, deliveryAddress, isTrip, appName } = route.params;
  const clearCart = useCartStore((state) => state.clear);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;

    pollOrderPaid(target).then((paid) => {
      if (cancelled) return;

      if (!paid) {
        navigation.replace('PaymentStatus', { amount });
        return;
      }

      // Real order confirmed paid — safe to clear the cart now, same
      // moment every other payment path in CheckoutScreen.tsx's own
      // goToReceipt already does it. Held off until now (not when this
      // screen first opened) so a failure leaves the cart exactly as the
      // customer left it, ready to retry.
      clearCart();
      navigation.replace('Receipt', {
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        amount,
        items,
        paymentMethodLabel: appName,
        placedAt: order.placedAt,
        avgPrepMinutes: order.avgPrepMinutes,
        isTrip,
        deliveryAddress,
      });
    });

    return () => {
      cancelled = true;
    };
    // Runs exactly once per mount — target/order/items/etc are a single
    // frozen snapshot for the one payment attempt this screen exists for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white px-10">
      <Text className="text-lg font-semibold text-ink">Payment Processing</Text>
      <Text className="text-center text-[13.5px] font-medium text-ink/55">
        Please wait while we confirm your payment with {appName}. This will only take a moment.
      </Text>
      <ActivityIndicator size="large" color="#155dfc" />
    </View>
  );
}
