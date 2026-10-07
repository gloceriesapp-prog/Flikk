import { fetchPaymentPreference, selectPaymentPreference } from '../../api/payments';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { detectInstalledUpiApps } from '../../payments/upiIntent';
import type { UpiApp } from '../../payments/upiApps';
import type { AppStackParamList } from '../../navigation/types';
import { PaymentMethodList } from './components/PaymentMethodList';
import type { PaymentMethod } from '../../payments/paymentMethod';
import { loadRememberedVpa, saveRememberedVpa } from '../../payments/vpa';
import { fetchAddresses } from '../../api/addresses';
import { useCheckoutQuote } from '../cart/quote/useCheckoutQuote';
import { quotedCartItems } from '../cart/quote/quoteItems';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { DeliveryAddressCard } from '../checkout/components/DeliveryAddressCard';
import { TotalAmountCard } from '../checkout/components/TotalAmountCard';

type Props = NativeStackScreenProps<AppStackParamList, 'PaymentMethod'>;

export function PaymentMethodScreen({ route, navigation }: Props) {
  const fromProfile = route.params.source === 'profile';
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const customerId = useAuthStore(state => state.customerId);
  const items = useCartStore((state) => state.items);
  const accessToken = useAuthStore((state) => state.accessToken);
  const { data: addresses } = useQuery({ queryKey: ['addresses', customerId], queryFn: fetchAddresses, enabled: !!accessToken && !fromProfile });
  const address = addresses?.find((item) => item.is_default) ?? addresses?.[0] ?? null;
  const quoteQuery = useCheckoutQuote(fromProfile ? undefined : address?.id);
  const [apps, setApps] = useState<UpiApp[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    detectInstalledUpiApps().then((result) => { if (alive) setApps(result); })
      .catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  // undefined = still loading; the UPI ID form mounts only once this resolves.
  const [rememberedVpa, setRememberedVpa] = useState<string | null | undefined>(fromProfile ? null : undefined);
  useEffect(() => {
    let alive = true;
    if (!fromProfile) void loadRememberedVpa(customerId).then((vpa) => { if (alive) setRememberedVpa(vpa); });
    return () => { alive = false; };
  }, [customerId, fromProfile]);
  async function chooseUpiId(vpa: string, remember: boolean) {
    await saveRememberedVpa(customerId, remember ? vpa : null);
    navigation.popTo('Cart', { selectedPaymentMethod: 'upi_id', upiVpa: vpa });
  }
  const preference = useQuery({ queryKey: ['payment-preference', customerId], queryFn: fetchPaymentPreference, enabled: fromProfile && !!customerId });
  async function select(method: PaymentMethod) {
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
    navigation.popTo('Cart', { selectedPaymentMethod: method });
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
        {!fromProfile && <>
        <DeliveryAddressCard address={address} onChange={() => navigation.navigate('LocationSearch', { intent: 'address-book' })} />
        {quoteQuery.data && !quoteQuery.isError ? <TotalAmountCard items={quotedCartItems(items, quoteQuery.data)} totalPrice={quoteQuery.data.bill.total} />
          : <Text className="text-ink/60">{quoteQuery.isError ? 'Could not check the bill. Return to your cart to retry.' : 'Checking your bill…'}</Text>}
        </>}
        {!!error && <Text className="text-red-600">{error}</Text>}
        {saving && <Text className="text-ink/60">Saving your preference…</Text>}
        <View pointerEvents={saving ? "none" : "auto"}>
        {loading || rememberedVpa === undefined ? <ActivityIndicator color={colors.limeDeep} /> :
          <PaymentMethodList method={fromProfile ? preference.data?.method ?? null : route.params.selectedMethod} upiApps={apps} onSelect={select}
            upiId={fromProfile ? undefined : { initialVpa: route.params.upiVpa ?? rememberedVpa ?? undefined, remembered: !!rememberedVpa, onUse: (vpa, remember) => void chooseUpiId(vpa, remember) }} />}
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
