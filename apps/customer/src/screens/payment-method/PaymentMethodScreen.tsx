import { PAGE_TITLE_CLASS_NAME } from '../../theme/typography';
import { NetbankingBankPicker } from './components/NetbankingBankPicker';
import type { NetbankingBank } from '../../api/payments';
import { RecoveredPaymentMethods } from './RecoveredPaymentMethods';
import { fetchPaymentPreference, selectPaymentPreference } from '../../api/payments';
import { useEffect, useState } from 'react';
import { CommonActions } from '@react-navigation/native';
import { useCheckoutFlowActive } from '../../features/checkout-recovery/checkoutActivity';
import { Platform, Pressable, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usesDirectUpiIntent } from '../../payments/upiIntent';
import { useInstalledUpiApps } from '../../payments/useInstalledUpiApps';
import { UpiDiscoveryStatus } from '../../payments/UpiDiscoveryStatus';
import type { AppStackParamList } from '../../navigation/types';
import { PaymentMethodList } from './components/PaymentMethodList';
import { PaymentConfirmContext } from './components/paymentChoice';
import type { PaymentMethod, WalletSelection } from '../../payments/paymentMethod';
import { usePaymentAvailability } from '../../payments/usePaymentAvailability';
import { useAuthStore } from '../../store/useAuthStore';
import { AccountPageHeader } from '../../components/AccountPageHeader';
import { IconlyArrowLeft } from '../../components/icons/iconly';

type Props = NativeStackScreenProps<AppStackParamList, 'PaymentMethod'>;

function CartOrProfilePaymentMethodScreen({ route, navigation }: Props) {
  const fromProfile = route.params.source === 'profile';
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [bankPickerVisible, setBankPickerVisible] = useState(false);
  const [error, setError] = useState('');
  // Checkout: the tapped method is only selected; Pay now / Place order confirms it.
  const [choice, setChoice] = useState<{ method: PaymentMethod; bank?: NetbankingBank; wallet?: WalletSelection } | null>(
    !fromProfile && route.params.selectedMethod
      ? { method: route.params.selectedMethod, bank: route.params.selectedMethod === 'netbanking' ? route.params.selectedNetbankingBank : undefined }
      : null);
  const customerId = useAuthStore(state => state.customerId);
  const { allowed, directUpiAvailable, loaded: paymentAvailabilityLoaded } = usePaymentAvailability();
  const { apps, loading, error: discoveryError, retry: retryDiscovery } = useInstalledUpiApps();
  const preference = useQuery({ queryKey: ['payment-preference', customerId], queryFn: fetchPaymentPreference, enabled: fromProfile && !!customerId });
  async function select(method: PaymentMethod, bank?: NetbankingBank, contact?: string) {
    if (method === 'netbanking' && !bank) { setBankPickerVisible(true); return; }
    if (saving) return;
    if (fromProfile) {
      setSaving(true);
      setError('');
      try {
        const result = await selectPaymentPreference(method);
        queryClient.setQueryData(['payment-preference', customerId], result);
        navigation.goBack();
      } catch { setError('Could not save your payment method. Try again.'); }
      finally { setSaving(false); }
      return;
    }
    if (usesDirectUpiIntent(method) && paymentAvailabilityLoaded && !directUpiAvailable) {
      setError('UPI app payments are unavailable in this test environment. Choose another payment method.');
      return;
    }
    setError('');
    setChoice({ method, bank, wallet: (method === 'wallet:mobikwik' || method === 'wallet:olamoney') && contact ? { method, contact } : undefined });
  }
  // Confirm: the cart (still mounted under this screen) places the order
  // through its guarded flow (single-tap lock, fresh quote, hours, address)
  // and opens the payment from here, without going back to the cart first.
  // "Pay ₹638" for every method; "Pay now" if the cart total is unknown.
  const amount = route.params.amount;
  const checkoutActive = useCheckoutFlowActive();
  const [requested, setRequested] = useState(false);
  // The cart picks the request up within moments; its flow then owns the busy state.
  useEffect(() => {
    if (!requested) return;
    const timer = setTimeout(() => setRequested(false), checkoutActive ? 0 : 15_000);
    return () => clearTimeout(timer);
  }, [requested, checkoutActive]);
  const busy = requested || checkoutActive;
  const payLabel = busy ? 'Opening payment…' : amount != null ? `Pay ₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : 'Pay now';
  function payNow() {
    if (!choice || busy) return;
    const params = { selectedPaymentMethod: choice.method, selectedNetbankingBank: choice.bank, selectedWallet: choice.wallet, placeOrderRequest: Date.now() };
    const cart = navigation.getState().routes.find(r => r.name === 'Cart');
    if (!cart) { navigation.popTo('Cart', params); return; }
    setRequested(true);
    navigation.dispatch({ ...CommonActions.setParams(params), source: cart.key });
  }
  return (
    <View className="flex-1 bg-[#F2F2F7]">
      {fromProfile ? (
        <View className="pt-safe">
          <AccountPageHeader title="Payment methods" backLabel="Back to profile" onBack={() => navigation.goBack()} />
        </View>
      ) : (
        <View className="bg-[#F2F2F7] px-3 pb-1 pt-safe-offset-2">
          <View className="relative flex-row items-center justify-between">
            <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Back to cart" accessibilityRole="button"
              className="h-11 w-11 items-center justify-center rounded-full bg-white">
              <IconlyArrowLeft size={22} color="#111111" />
            </Pressable>
            <View className="h-11 w-11" />
            <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
              <Text className={`${PAGE_TITLE_CLASS_NAME} text-ink`}>Choose how to pay</Text>
            </View>
          </View>
        </View>
      )}
      <KeyboardAwareScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pb-8 pt-4" bottomOffset={40}>
        {!fromProfile && Platform.OS === 'android' && paymentAvailabilityLoaded && !directUpiAvailable && allowed.online && <Text className="text-sm text-ink/60">UPI app payments are unavailable in this test environment. Choose another payment method.</Text>}
        {!!error && <Text className="text-red-600">{error}</Text>}
        {saving && <Text className="text-ink/60">Saving your preference…</Text>}
        <View pointerEvents={saving || busy ? "none" : "auto"}>
        {allowed.online && <UpiDiscoveryStatus loading={loading} error={discoveryError} count={apps.length} onRetry={() => void retryDiscovery()} />}
          <PaymentConfirmContext.Provider value={fromProfile ? null : { label: payLabel, onConfirm: payNow }}>
            <PaymentMethodList method={fromProfile ? preference.data?.method ?? null : choice?.method ?? null} upiApps={apps} onSelect={select} onWalletSelect={(method, contact) => void select(method, undefined, contact)} allowed={allowed} />
          </PaymentConfirmContext.Provider>
        </View>
      </KeyboardAwareScrollView>
      <NetbankingBankPicker visible={bankPickerVisible} selectedCode={route.params.selectedNetbankingBank?.code}
        onClose={() => setBankPickerVisible(false)} onSelect={bank => {
          setBankPickerVisible(false);
          void select('netbanking', bank);
        }} />
    </View>
  );
}

export function PaymentMethodScreen(props: Props) {
  const target = props.route.params.recoveryTarget;
  if (!target) return <CartOrProfilePaymentMethodScreen {...props} />;
  return <View className="flex-1 bg-[#F2F2F7]">
    <View className="flex-row items-center gap-3 px-5 pb-3 pt-safe-offset-2">
      <Pressable accessibilityRole="button" accessibilityLabel="Back to home" onPress={() => props.navigation.navigate('Home')}
        className="h-11 w-11 items-center justify-center rounded-full bg-white">
        <IconlyArrowLeft size={22} color="#111111" />
      </Pressable>
      <Text className={`${PAGE_TITLE_CLASS_NAME} text-ink`}>Choose how to pay</Text>
    </View>
    <RecoveredPaymentMethods target={target} navigation={props.navigation} />
  </View>;
}
