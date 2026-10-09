import { useAuthStore } from '../../store/useAuthStore';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Pressable, ScrollView, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { abandonCheckout, createPaymentOrder, recoverPayment, verifyPayment, rememberPaymentMethod } from '../../api/payments';
import { ApiError } from '../../api/client';
import { openCashfreeCheckout } from '../../payments/openCashfreeCheckout';
import { useCartStore } from '../../store/useCartStore';
import { checkoutItems } from '../../store/cartIdentity';
import { clearAttempt, readAttempt } from './attemptStorage';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'PaymentRecovery'>;
export function PaymentRecoveryScreen({ route, navigation }: Props) {
  const customerId = useAuthStore(state => state.customerId);
  const { target } = route.params;
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => listener.remove();
  }, []);
  const query = useQuery({ queryKey: ['payment-recovery', target, customerId], queryFn: () => recoverPayment(target),
    enabled: focused && foreground, refetchInterval: focused && foreground ? 8_000 : false,
    refetchIntervalInBackground: false });
  const state = query.data?.state;
  async function finish() {
    const saved = await readAttempt();
    if (saved) {
      const cart = useCartStore.getState();
      const key = JSON.stringify({ items: checkoutItems(cart.items), promo: cart.appliedPromo?.code ?? null });
      // A recovered payment must not erase a different, newly built cart.
      const resolvedId = 'tripId' in target ? target.tripId : target.orderId;
      const { findAttempt } = await import('./attemptStorage');
      const resolved = await findAttempt(saved.id);
      if (resolved?.result?.id === resolvedId) {
        if (state === 'paid' && saved.cartKey === key) cart.clear();
        await clearAttempt(saved.id);
      }
    }
    if (state === 'paid') navigation.replace('OrderSummary', { orderId: 'tripId' in target ? target.tripId : target.orderId, isTrip: 'tripId' in target });
    else navigation.replace('Cart');
  }
  async function continuePayment() {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      // Endpoint reconciles provider state before returning the SAME order.
      const order = await createPaymentOrder(target);
      await openCashfreeCheckout(order);
      // Not settled yet is fine: the polling query below keeps checking.
      if ((await verifyPayment(target)).ok) void rememberPaymentMethod('online', target);
    } catch (error) {
      Alert.alert('Checking your payment', error instanceof Error ? error.message : 'Your order is saved. Check its payment status before trying again.');
    } finally { await query.refetch(); lock.current = false; setBusy(false); }
  }
  // Server-side atomic: re-reads Cashfree, settles a capture instead, and
  // refunds any capture that lands afterwards. Works from 'pending' too, so a
  // customer who backed out of the UPI app is never stuck waiting.
  async function abandon(action: 'cancel' | 'cod') {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      await abandonCheckout(target, action);
      if (action === 'cod') void rememberPaymentMethod('cod', target);
    } catch (error) {
      if (!(error instanceof ApiError && error.code === 'PAYMENT_CAPTURED'))
        Alert.alert(action === 'cod' ? 'Could not switch to cash' : 'Could not cancel', error instanceof Error ? error.message : 'Check your order status.');
    } finally { await query.refetch(); lock.current = false; setBusy(false); }
  }
  const awaitingPayment = state === 'unpaid' || state === 'pending' || state === 'reconciling';
  const heading = state === 'paid' ? 'Payment confirmed' : state === 'cancelled' || state === 'expired'
    ? 'This checkout has closed' : state === 'unpaid' ? 'Your order is saved' : 'Checking your payment';
  return <ScrollView className="flex-1 bg-[#F7F8FA]" contentContainerStyle={{ padding: 24, paddingTop: 80 }}>
    <Pressable onPress={() => navigation.navigate('Home')} className="mb-8"><Text className="text-base font-semibold">‹ Back to home</Text></Pressable>
    <View className="rounded-3xl bg-white p-6">
      <Text className="text-2xl font-bold text-[#111111]">{heading}</Text>
      <Text className="mt-3 text-base text-black/55">{state === 'unpaid' ? 'Continue paying for this order. We’ll use the same order so it isn’t placed twice.'
        : state === 'paid' ? 'Your payment has been confirmed. View your order for delivery updates.'
        : state === 'cancelled' || state === 'expired' ? 'You can review your cart. Any delayed payment will be checked against this order.'
        : 'Please wait while we confirm the result. Avoid paying again until this check finishes.'}</Text>
      {query.data && <Text className="mt-6 text-xl font-bold">₹{Number(query.data.record.total).toFixed(2)}</Text>}
      {query.isError && <Text className="mt-4 text-red-600">We couldn’t check your payment. Your order is still saved.</Text>}
      {(state === 'paid' || state === 'cancelled' || state === 'expired') && <Pressable disabled={busy} onPress={() => void finish().catch(() => Alert.alert('Please try again', 'Your saved checkout could not be updated.'))} className="mt-6 rounded-2xl bg-primary py-4"><Text className="text-center font-bold text-white">{state === 'paid' ? 'View order' : 'Review cart'}</Text></Pressable>}
      {state === 'unpaid' && <><Pressable disabled={busy} onPress={() => void continuePayment()} className="mt-6 rounded-2xl bg-primary py-4"><Text className="text-center font-bold text-white">{busy ? 'Checking…' : 'Continue payment'}</Text></Pressable></>}
      {(query.isError || state === 'pending' || state === 'reconciling') && <Pressable disabled={busy || query.isFetching} onPress={() => void query.refetch()} className="mt-6 rounded-2xl bg-[#F0F1F3] py-4"><Text className="text-center font-semibold">Check payment status</Text></Pressable>}
      {awaitingPayment && <>
        <Pressable disabled={busy} onPress={() => Alert.alert('Pay cash on delivery?', `Pay ₹${Number(query.data?.record.total ?? 0).toFixed(2)} in cash to the rider. If your UPI payment still goes through, it will be refunded automatically.`, [{ text: 'Not now', style: 'cancel' }, { text: 'Switch to cash', onPress: () => void abandon('cod') }])} className="mt-4 rounded-2xl border border-[#155DFC] py-4"><Text className="text-center font-bold text-[#155DFC]">Switch to cash on delivery</Text></Pressable>
        <Pressable disabled={busy} onPress={() => Alert.alert('Cancel this order?', 'Your items will stay in your cart. If a payment still goes through, it will be refunded automatically.', [{ text: 'Keep order', style: 'cancel' }, { text: 'Cancel order', style: 'destructive', onPress: () => void abandon('cancel') }])} className="mt-2 py-3"><Text className="text-center font-semibold text-black/55">Cancel order</Text></Pressable>
      </>}
    </View>
  </ScrollView>;
}
