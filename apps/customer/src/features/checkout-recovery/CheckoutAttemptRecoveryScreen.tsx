import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createOrder, type CreateOrderInput } from '../../api/orders';
import { createTrip, type CreateTripInput } from '../../api/trips';
import { readAttempt, findAttempt, attemptTarget, closeSavedAttempt, clearAttempt } from './attemptStorage';
import type { AppStackParamList } from '../../navigation/types';
import { keepsCheckoutAttempt } from '../../screens/cart/payment/attemptPolicy';

type Props = NativeStackScreenProps<AppStackParamList, 'CheckoutAttemptRecovery'>;
export function CheckoutAttemptRecoveryScreen({ navigation }: Props) {
  const [busy, setBusy] = useState(false);
  async function check(close: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      const saved = await readAttempt();
      if (!saved) { navigation.replace('Cart'); return; }
      if (close) {
        const resolved = await closeSavedAttempt(saved);
        if (resolved.result) navigation.replace('PaymentRecovery', { target: attemptTarget({ ...resolved, result: resolved.result }) });
        else { await clearAttempt(saved.id); navigation.replace('Cart'); }
        return;
      }
      const resolved = await findAttempt(saved.id);
      if (resolved?.result) { navigation.replace('PaymentRecovery', { target: attemptTarget({ ...resolved, result: resolved.result }) }); return; }
      if (resolved?.abandoned) { await clearAttempt(saved.id); navigation.replace('Cart'); return; }
      const record = saved.kind === 'trip' ? await createTrip(saved.input as CreateTripInput) : await createOrder(saved.input as CreateOrderInput);
      navigation.replace('PaymentRecovery', { target: saved.kind === 'trip' ? { tripId: record.id } : { orderId: record.id } });
    } catch (error) {
      if (!close && !keepsCheckoutAttempt(error)) {
        // Definitive rejection (stock/price/promo changed): nothing committed,
        // so drop the key instead of replaying this cart forever.
        try {
          const saved = await readAttempt();
          if (saved) {
            const closed = await closeSavedAttempt(saved).catch((e: unknown) => { if (keepsCheckoutAttempt(e)) throw e; return { result: null }; });
            if (closed.result) { navigation.replace('PaymentRecovery', { target: attemptTarget({ kind: saved.kind, result: closed.result }) }); return; }
            await clearAttempt(saved.id);
          }
          Alert.alert('Review your cart', error instanceof Error ? error.message : 'Your cart changed.');
          navigation.replace('Cart');
          return;
        } catch { /* fall through: keep the attempt and let the customer retry */ }
      }
      Alert.alert('Checkout is saved', error instanceof Error ? error.message : 'Try checking again when you are connected.');
    }
    finally { setBusy(false); }
  }
  return <View className="flex-1 justify-center bg-[#F7F8FA] px-6"><View className="rounded-3xl bg-white p-6">
    <Text className="text-2xl font-bold">Let’s check your last checkout</Text>
    <Text className="mt-3 text-base text-black/55">The app closed before we received its result. We’ll check the same attempt so your order isn’t placed twice.</Text>
    <Pressable disabled={busy} onPress={() => void check(false)} className="mt-6 rounded-2xl bg-coral py-4"><Text className="text-center font-bold text-ink">{busy ? 'Checking…' : 'Check saved checkout'}</Text></Pressable>
    <Pressable disabled={busy} onPress={() => void check(true)} className="mt-4 py-3"><Text className="text-center font-semibold text-black/55">Review cart instead</Text></Pressable>
  </View></View>;
}
