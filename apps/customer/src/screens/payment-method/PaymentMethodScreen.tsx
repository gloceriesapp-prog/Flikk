import { NetbankingBankPicker } from './components/NetbankingBankPicker';
import type { NetbankingBank } from '../../api/payments';
import { RecoveredPaymentMethods } from './RecoveredPaymentMethods';
import { fetchPaymentPreference, selectPaymentPreference } from '../../api/payments';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { usesDirectUpiIntent } from '../../payments/upiIntent';
import { detectInstalledUpiApps } from '../../payments/installedUpiApps';
import type { UpiApp } from '../../payments/upiApps';
import type { AppStackParamList } from '../../navigation/types';
import { PaymentMethodList } from './components/PaymentMethodList';
import type { PaymentMethod } from '../../payments/paymentMethod';
import { usePaymentAvailability } from '../../payments/usePaymentAvailability';
import { useAuthStore } from '../../store/useAuthStore';

type Props = NativeStackScreenProps<AppStackParamList, 'PaymentMethod'>;

function CartOrProfilePaymentMethodScreen({ route, navigation }: Props) {
  const fromProfile = route.params.source === 'profile';
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [bankPickerVisible, setBankPickerVisible] = useState(false);
  const [error, setError] = useState('');
  const customerId = useAuthStore(state => state.customerId);
  const { allowed, directUpiAvailable, loaded: paymentAvailabilityLoaded } = usePaymentAvailability();
  const [apps, setApps] = useState<UpiApp[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    detectInstalledUpiApps().then((result) => { if (alive) setApps(result); })
      .catch(() => { if (alive) setError('Could not check installed UPI apps. Reopen payment methods to try again.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
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
    navigation.popTo('Cart', { selectedPaymentMethod: method, selectedNetbankingBank: bank, selectedWallet: (method === 'wallet:mobikwik' || method === 'wallet:olamoney') && contact ? { method, contact } : undefined, startSelectedPayment: method === 'card' || method.startsWith('upi_app:') });
  }
  return (
    <View className="flex-1 bg-[#F2F2F7]">
      <View className="bg-[#F2F2F7] px-3 pb-1 pt-safe-offset-2">
        <View className="relative flex-row items-center justify-between">
          <Pressable onPress={() => navigation.goBack()} accessibilityLabel={fromProfile ? "Back to profile" : "Back to cart"} accessibilityRole="button"
            className="h-11 w-11 items-center justify-center rounded-full bg-white">
            <AppIcon icon={ArrowLeft01Icon} size={22} color="#111111" />
          </Pressable>
          <View className="h-11 w-11" />
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <Text className="text-[18px] font-semibold text-ink">Choose how to pay</Text>
          </View>
        </View>
      </View>
      <KeyboardAwareScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pb-8 pt-4" bottomOffset={40}>
        {!fromProfile && Platform.OS === 'android' && paymentAvailabilityLoaded && !directUpiAvailable && allowed.online && <Text className="text-sm text-ink/60">UPI app payments are unavailable in this test environment. Choose another payment method.</Text>}
        {!!error && <Text className="text-red-600">{error}</Text>}
        {saving && <Text className="text-ink/60">Saving your preference…</Text>}
        <View pointerEvents={saving ? "none" : "auto"}>
        {loading ? <ActivityIndicator color={colors.limeDeep} /> :
          <PaymentMethodList method={fromProfile ? preference.data?.method ?? null : route.params.selectedMethod} upiApps={apps} onSelect={select} onWalletSelect={(method, contact) => void select(method, undefined, contact)} allowed={allowed} />}
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
        <AppIcon icon={ArrowLeft01Icon} size={22} color="#111111" />
      </Pressable>
      <Text className="text-[18px] font-semibold text-ink">Choose how to pay</Text>
    </View>
    <RecoveredPaymentMethods target={target} navigation={props.navigation} />
  </View>;
}
