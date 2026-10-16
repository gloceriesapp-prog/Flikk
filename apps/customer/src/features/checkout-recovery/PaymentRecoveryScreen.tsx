import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { recoverPayment } from '../../api/payments';
import { useAuthStore } from '../../store/useAuthStore';
import { useCartStore } from '../../store/useCartStore';
import { checkoutItems } from '../../store/cartIdentity';
import { clearAttempt, findAttempt, readAttempt } from './attemptStorage';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'PaymentRecovery'>;

// Recovery is a reconciliation gate, not a second checkout page. Never launch
// a payment on mount: the customer chooses a method on the normal payment UI.
export function PaymentRecoveryScreen({ route, navigation }: Props) {
  const customerId = useAuthStore(state => state.customerId);
  const [ownerEpoch] = useState(() => useAuthStore.getState().sessionEpoch);
  const { target } = route.params;
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [transitionError, setTransitionError] = useState(false);
  const transitioned = useRef(false);
  const mounted = useRef(true);
  const active = useRef(false);
  useEffect(() => { active.current = focused && foreground; }, [focused, foreground]);

  useEffect(() => {
    const listener = AppState.addEventListener('change', state => setForeground(state === 'active'));
    mounted.current = true;
    return () => { mounted.current = false; listener.remove(); };
  }, []);

  const query = useQuery({
    queryKey: ['payment-recovery', target, customerId],
    queryFn: () => recoverPayment(target),
    enabled: !!customerId && focused && foreground,
    // Cached state must never authorize a retry after a delayed capture.
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: focused && foreground ? 8_000 : false,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    const state = query.data?.state;
    if (!state || !query.isFetchedAfterMount || query.isFetching || query.isError
      || !focused || !foreground || transitioned.current) return;
    transitioned.current = true;
    const stillOwner = () => mounted.current && active.current && useAuthStore.getState().sessionEpoch === ownerEpoch;
    async function transition() {
      if (state === 'unpaid' || state === 'pending' || state === 'reconciling') {
        if (stillOwner()) navigation.replace('PaymentMethod', { selectedMethod: null, recoveryTarget: target });
        return;
      }
      const saved = await readAttempt();
      if (!stillOwner()) return;
      if (saved) {
        const committed = await findAttempt(saved.id);
        if (!stillOwner()) return;
        const targetId = 'tripId' in target ? target.tripId : target.orderId;
        if (committed?.result?.id === targetId) {
          const cart = useCartStore.getState();
          const cartKey = JSON.stringify({ items: checkoutItems(cart.items), promo: cart.appliedPromo?.code ?? null });
          // Paid recovery cannot erase a different cart built after checkout.
          if (state === 'paid' && saved.cartKey === cartKey) cart.clear();
          await clearAttempt(saved.id);
        }
      }
      if (!stillOwner()) return;
      if (state === 'paid') navigation.replace('OrderSummary', {
        orderId: 'tripId' in target ? target.tripId : target.orderId,
        isTrip: 'tripId' in target,
      });
      else navigation.replace('Cart');
    }
    void transition().catch(() => {
      if (!stillOwner()) return;
      transitioned.current = false;
      setTransitionError(true);
    }).finally(() => { transitioned.current = false; });
  }, [focused, foreground, navigation, ownerEpoch, query.data, query.isError, query.isFetchedAfterMount, query.isFetching, target]);

  const failed = query.isError || transitionError;
  return <View className="flex-1 items-center justify-center gap-4 bg-white px-8">
    <Text accessibilityLiveRegion="polite" className="text-lg font-semibold text-ink">
      {failed ? 'Couldn’t check your payment' : 'Checking your payment'}
    </Text>
    <Text className="text-center text-sm text-ink/60">
      {failed ? 'Reconnect and try again. We’ll keep the same order.' : 'Confirming the result securely…'}
    </Text>
    {(failed || query.data?.state === 'pending' || query.data?.state === 'reconciling') &&
      <Pressable accessibilityRole="button" disabled={query.isFetching} className="rounded-2xl bg-primary px-6 py-4"
        onPress={() => { setTransitionError(false); void query.refetch(); }}>
        <Text className="font-semibold text-white">Check payment status</Text>
      </Pressable>}
    <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Home')} className="px-6 py-3">
      <Text className="font-semibold text-ink/65">Back to home</Text>
    </Pressable>
  </View>;
}
