import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/useAuthStore';
import { fetchPendingPayments } from '../../api/payments';
import { readAttempt, findAttempt, attemptTarget, clearAttempt } from './attemptStorage';
import type { AppStackParamList } from '../../navigation/types';

// Discover from the backend even if local storage was lost. Pending payment
// screens use only a target ID and load all amounts/status from the API.
export function useCheckoutRecovery() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const token = useAuthStore((state) => state.accessToken);
  useEffect(() => {
    if (!token) return;
    const epoch = useAuthStore.getState().sessionEpoch;
    let stopped = false, running = false;
    const seen = new Set<string>();
    async function check() {
      if (running || stopped || AppState.currentState !== 'active') return;
      running = true;
      try {
        const saved = await readAttempt();
        if (stopped || useAuthStore.getState().sessionEpoch !== epoch) return;
        const resolved = saved ? await findAttempt(saved.id) : null;
        if (stopped || useAuthStore.getState().sessionEpoch !== epoch) return;
        if (resolved?.abandoned && saved) { await clearAttempt(saved.id); }
        if (saved && !resolved && !stopped) {
          const state = navigation.getState();
          const active = state?.routes[state.index]?.name;
          if (!seen.has(saved.id) && active !== 'CheckoutAttemptRecovery' && active !== 'PaymentRecovery' && active !== 'PaymentProcessing' && active !== 'Receipt') {
            seen.add(saved.id); navigation.navigate('CheckoutAttemptRecovery');
          }
          return;
        }
        const target = resolved?.result ? attemptTarget({ ...resolved, result: resolved.result }) : (await fetchPendingPayments())[0];
        if (!target || stopped) return;
        const key = JSON.stringify(target);
        if (seen.has(key)) return;
        const state = navigation.getState();
        const active = state?.routes[state.index]?.name;
        if (active === 'PaymentRecovery' || active === 'PaymentProcessing' || active === 'Receipt') return;
        seen.add(key);
        navigation.navigate('PaymentRecovery', { target });
      } catch { /* Offline discovery is retried on foreground; checkout remains guarded. */ }
      finally { running = false; }
    }
    void check();
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') void check(); });
    return () => { stopped = true; listener.remove(); };
  }, [token, navigation]);
}
