import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fetchAvailableWallets, fetchNetbankingBanks, type NetbankingBank, abandonCheckout, createPaymentOrder, recoverPayment, verifyPayment, type PaymentTarget } from '../../api/payments';
import { useAuthStore } from '../../store/useAuthStore';
import { usePaymentReceiptEmail } from '../../payments/usePaymentReceiptEmail';
import { openRazorpayCheckout } from '../../payments/openRazorpayCheckout';
import { prepareUpiIntent, usesDirectUpiIntent } from '../../payments/upiIntent';
import type { PaymentMethod } from '../../payments/paymentMethod';
import { beginCheckoutFlow } from '../../features/checkout-recovery/checkoutActivity';
import type { AppStackParamList } from '../../navigation/types';

export function useRecoveredPayment(target: PaymentTarget, navigation: NativeStackNavigationProp<AppStackParamList, 'PaymentMethod'>) {
  const receiptEmail = usePaymentReceiptEmail();
  const customerId = useAuthStore(state => state.customerId);
  const [epoch] = useState(() => useAuthStore.getState().sessionEpoch);
  const lock = useRef(false);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const stillOwner = () => mounted.current && useAuthStore.getState().sessionEpoch === epoch;
  useEffect(() => {
    mounted.current = true;
    const listener = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => { mounted.current = false; listener.remove(); };
  }, []);
  const query = useQuery({
    queryKey: ['payment-recovery', target, customerId], queryFn: () => recoverPayment(target),
    enabled: !!customerId && focused && foreground && !busy,
    refetchOnMount: 'always', staleTime: 0,
    refetchInterval: focused && foreground && !busy ? 8_000 : false,
    refetchIntervalInBackground: false,
  });
  const state = query.data?.state;
  const canResumeUpi = Platform.OS === 'android' && state === 'pending' && query.data?.canResumeUpiIntent === true;
  // A periodic refresh must not swallow a bank selection or disable the
  // chooser every eight seconds. The initial mount check is still required;
  // act() reconciles again before creating or resuming any payment.
  const canPay = query.isFetchedAfterMount && !query.isError && (state === 'unpaid' || canResumeUpi) && !busy;
  useEffect(() => {
    if (focused && !busy && query.isFetchedAfterMount && !query.isFetching && !query.isError
      && (state === 'paid' || state === 'cancelled' || state === 'expired')) {
      navigation.replace('PaymentRecovery', { target });
    }
  }, [busy, focused, navigation, query.isError, query.isFetchedAfterMount, query.isFetching, state, target]);

  async function act(action: PaymentMethod | 'cancel', bank?: NetbankingBank, contact?: string) {
    if (lock.current || !stillOwner()) return;
    lock.current = true; setBusy(true); setError('');
    const endFlow = beginCheckoutFlow();
    try {
      // Always reconcile again at the action boundary. The visible state may
      // have changed while an external UPI app was open or a webhook arrived.
      const latest = await recoverPayment(target);
      if (!stillOwner()) return;
      if (latest.state === 'paid' || latest.state === 'cancelled' || latest.state === 'expired') {
        navigation.replace('PaymentRecovery', { target }); return;
      }
      if (action === 'cod' || action === 'cancel') {
        await abandonCheckout(target, action === 'cod' ? 'cod' : 'cancel');
        if (stillOwner()) navigation.replace('PaymentRecovery', { target });
        return;
      }
      const resumingExistingUpi = usesDirectUpiIntent(action) && latest.state === 'pending' && latest.canResumeUpiIntent === true;
      if (latest.state !== 'unpaid' && !resumingExistingUpi) throw new Error('Your last payment is still being checked. Wait for its result before paying again.');
      if (action.startsWith('upi_app:')) {
        const email = await receiptEmail.requestEmail();
        if (!stillOwner() || !email) return;
      }
      if (usesDirectUpiIntent(action)) {
        const session = await prepareUpiIntent(target, action);
        if (session.amountPaise !== Math.round(Number(latest.record.total) * 100)) {
          throw new Error('The payment amount changed. Check your order before paying.');
        }
        if (stillOwner()) navigation.replace('PaymentProcessing', {
          target, appName: 'your UPI app', paymentMethod: action,
          amount: session.amountPaise / 100, expiresAt: session.expiresAt, upiIntent: session, recovered: true,
        });
        return;
      }
      if (action.startsWith('wallet:')) {
        if (contact !== undefined && !/^\+91[6-9]\d{9}$/.test(contact)) throw new Error('Enter a valid wallet mobile number.');
        const { wallets } = await fetchAvailableWallets();
        if (!stillOwner()) return;
        if (!wallets.some(wallet => `wallet:${wallet.code}` === action)) throw new Error('This wallet is unavailable. Choose another payment method.');
      }
      if (action === 'netbanking' && bank) {
        const { banks } = await fetchNetbankingBanks();
        if (!stillOwner()) return;
        if (!banks.some(entry => entry.code === bank.code)) throw new Error('This bank is no longer available. Choose another bank.');
      }
      const order = await createPaymentOrder(target);
      if (!stillOwner()) return;
      const result = await openRazorpayCheckout(order, action, bank, contact);
      if (!stillOwner()) return;
      await verifyPayment(target, result).catch(() => ({ ok: false }));
      if (stillOwner()) navigation.replace('PaymentRecovery', { target });
    } catch (cause) {
      if (stillOwner()) {
        setError(cause instanceof Error ? cause.message : 'Could not continue payment. Check the status and try again.');
        await query.refetch();
      }
    } finally {
      endFlow(); lock.current = false;
      if (stillOwner()) setBusy(false);
    }
  }
  return { receiptEmailForm: receiptEmail.emailForm, query, busy, error, canPay, canResumeUpi, select: (method: PaymentMethod, bank?: NetbankingBank, contact?: string) => act(method, bank, contact), cancel: () => act('cancel') };
}
