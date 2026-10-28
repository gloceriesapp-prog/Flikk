import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NetbankingBank, PaymentTarget } from '../../api/payments';
import { detectInstalledUpiApps } from '../../payments/installedUpiApps';
import type { UpiApp } from '../../payments/upiApps';
import { usePaymentAvailability } from '../../payments/usePaymentAvailability';
import type { PaymentMethod } from '../../payments/paymentMethod';
import type { AppStackParamList } from '../../navigation/types';
import { RupeePrice } from '../../components/RupeePrice';
import { NetbankingBankPicker } from './components/NetbankingBankPicker';
import { PaymentMethodList } from './components/PaymentMethodList';
import { useRecoveredPayment } from './useRecoveredPayment';

type Props = {
  target: PaymentTarget;
  navigation: NativeStackNavigationProp<AppStackParamList, 'PaymentMethod'>;
};

// Reuses the normal chooser, but its amount/target come exclusively from the
// saved backend checkout. A changed cart must never alter this payment.
export function RecoveredPaymentMethods({ target, navigation }: Props) {
  const [bankPickerVisible, setBankPickerVisible] = useState(false);
  const recovery = useRecoveredPayment(target, navigation);
  const { allowed, directUpiAvailable, loaded: paymentAvailabilityLoaded } = usePaymentAvailability();
  const [apps, setApps] = useState<UpiApp[]>([]);
  const [appsReady, setAppsReady] = useState(false);
  useEffect(() => {
    let active = true;
    detectInstalledUpiApps().then(result => { if (active) setApps(result); }).catch(() => {})
      .finally(() => { if (active) setAppsReady(true); });
    return () => { active = false; };
  }, []);
  const total = Number(recovery.query.data?.record.total);
  const state = recovery.query.data?.state;
  const checking = state === 'pending' || state === 'reconciling';
  async function select(method: PaymentMethod, bank?: NetbankingBank, contact?: string) {
    if (!recovery.canPay) return;
    if (method === 'netbanking' && !bank) { setBankPickerVisible(true); return; }
    if (method === 'cod') {
      Alert.alert('Pay cash on delivery?', `Pay ₹${total.toFixed(2)} to the rider. Any delayed online payment will be checked and refunded when required.`, [
        { text: 'Not now', style: 'cancel' }, { text: 'Pay cash', onPress: () => void recovery.select(method) },
      ]);
    } else void recovery.select(method, bank, contact);
  }
  return <KeyboardAwareScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pb-8 pt-4" bottomOffset={40}>
    <View className="gap-3 rounded-3xl bg-white px-5 py-5">
      <Text className="text-base font-semibold text-ink">Total payable</Text>
      {Number.isFinite(total) ? <RupeePrice amount={total.toFixed(2)} size={28} /> : <Text className="text-ink/60">Checking your bill…</Text>}
      <Text className="text-sm text-ink/60">{recovery.canResumeUpi ? 'Choose your UPI app to finish the existing payment.' : checking ? 'Confirming your last payment before another attempt.' : 'Choose a method to complete this order.'}</Text>
    </View>
    {Platform.OS === 'android' && paymentAvailabilityLoaded && !directUpiAvailable && allowed.online && <Text className="text-sm text-ink/60">UPI app payments are unavailable in this test environment. Choose another payment method.</Text>}
    {!!recovery.error && <Text accessibilityLiveRegion="polite" className="text-sm text-red-600">{recovery.error}</Text>}
    {recovery.query.isError && <Text className="text-sm text-red-600">Couldn’t check your payment. Reconnect and retry.</Text>}
    {recovery.busy && <Text accessibilityLiveRegion="polite" className="text-sm text-ink/60">Opening your payment…</Text>}
    {checking || recovery.query.isError ? <Pressable accessibilityRole="button" disabled={recovery.busy || recovery.query.isFetching}
      onPress={() => void recovery.query.refetch()} className="rounded-2xl bg-white px-5 py-4">
      <Text className="text-center font-semibold text-primary">Check payment status</Text>
    </Pressable> : null}
    {appsReady ? <View pointerEvents={recovery.canPay ? 'auto' : 'none'} accessibilityElementsHidden={!recovery.canPay}
      importantForAccessibility={recovery.canPay ? 'auto' : 'no-hide-descendants'} style={{ opacity: recovery.canPay ? 1 : 0.45 }}>
      <PaymentMethodList method={null} upiApps={apps} onSelect={select} onWalletSelect={(method, contact) => void select(method, undefined, contact)} allowed={allowed} upiOnly={recovery.canResumeUpi} />
    </View> : <Text className="text-sm text-ink/60">Finding your payment apps…</Text>}
    {checking && allowed.cod && <Pressable disabled={recovery.busy} accessibilityRole="button"
      onPress={() => Alert.alert('Pay cash on delivery?', 'We’ll check the online payment first. Any delayed charge will be refunded when required.', [
        { text: 'Not now', style: 'cancel' }, { text: 'Switch to cash', onPress: () => void recovery.select('cod') },
      ])} className="rounded-2xl border border-primary px-5 py-4">
      <Text className="text-center font-semibold text-primary">Switch to cash on delivery</Text>
    </Pressable>}
    <Pressable disabled={recovery.busy} accessibilityRole="button" onPress={() => Alert.alert('Cancel this order?',
      'Your items stay in your cart. Any delayed payment will be checked and refunded when required.', [
        { text: 'Keep order', style: 'cancel' }, { text: 'Cancel order', style: 'destructive', onPress: () => void recovery.cancel() },
      ])} className="px-5 py-4">
      <Text className="text-center font-semibold text-ink/60">Cancel order</Text>
    </Pressable>
    {recovery.receiptEmailForm}
    <NetbankingBankPicker visible={bankPickerVisible} onClose={() => setBankPickerVisible(false)}
      onSelect={bank => { setBankPickerVisible(false); void select('netbanking', bank); }} />
  </KeyboardAwareScrollView>;
}
