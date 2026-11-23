import { PAGE_TITLE_CLASS_NAME } from '../../theme/typography';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { IconlyDiscountTag } from '../../components/icons/IconlyDiscountTag';
import { validatePromoCode } from '../../api/promos';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'ApplyCoupon'>;

export function ApplyCouponScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const items = useCartStore((state) => state.items);
  const appliedPromo = useCartStore((state) => state.appliedPromo);
  const [code, setCode] = useState(appliedPromo?.code ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const disabled = !code.trim() || items.length === 0 || busy;

  async function applyCoupon() {
    const normalized = code.trim().toUpperCase();
    if (!normalized || !items.length || inFlight.current) return;
    const cart = useCartStore.getState();
    const customerId = useAuthStore.getState().customerId;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await validatePromoCode(normalized, route.params.itemTotal);
      if (!mounted.current) return;
      if (cart.items !== useCartStore.getState().items || customerId !== useAuthStore.getState().customerId) {
        setError('Your cart changed. Return to Checkout and try again.');
        return;
      }
      if ('error' in result) {
        setError(result.error);
        return;
      }
      useCartStore.getState().setAppliedPromo({ code: normalized, discountAmount: result.discountAmount });
      navigation.goBack();
    } catch {
      if (mounted.current) setError('Could not apply this coupon. Please try again.');
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F0F0F2]" style={{ paddingBottom: insets.bottom }}>
      <View className="bg-white" style={{ paddingTop: insets.top }}>
        <View className="min-h-[66px] flex-row items-center gap-4 px-4 py-2">
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()}
            className="h-11 w-11 items-center justify-center">
            <AppIcon icon={ArrowLeft01Icon} size={26} color="#171717" />
          </Pressable>
          <Text accessibilityRole="header" className={`${PAGE_TITLE_CLASS_NAME} text-ink`}>Apply Coupon</Text>
        </View>
      </View>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
          <View className="gap-4 rounded-3xl bg-white p-4">
            <Text className="text-[18px] font-semibold text-[#171717]">Enter Coupon</Text>
            <View className="flex-row items-center gap-3">
              <TextInput accessibilityLabel="Coupon code" placeholder="Enter Coupon Code" placeholderTextColor="#96979C"
                value={code} onChangeText={(value) => { setCode(value); setError(''); }} editable={!busy}
                autoCapitalize="characters" autoCorrect={false} maxLength={100} returnKeyType="done"
                onSubmitEditing={() => void applyCoupon()}
                className="min-h-[48px] min-w-0 flex-1 rounded-xl border border-[#D9DADD] px-3 py-3 text-[15px] font-medium text-[#505257]" />
              <Pressable accessibilityRole="button" accessibilityLabel="Apply coupon"
                accessibilityState={{ disabled, busy }} disabled={disabled} onPress={() => void applyCoupon()}
                className="min-h-[48px] min-w-[90px] items-center justify-center rounded-xl px-4 py-3"
                style={{ backgroundColor: disabled ? '#9AC6AF' : '#00864A' }}>
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-[15px] font-semibold text-white">APPLY</Text>}
              </Pressable>
            </View>
            {error ? <Text accessibilityRole="alert" className="text-[13px] leading-5 font-medium text-danger">{error}</Text> : null}
          </View>
          <View className="min-h-[260px] flex-1 items-center justify-center px-4 py-10">
            <IconlyDiscountTag size={96} color="#C8C8CE" />
            <Text accessibilityRole="header" className="mt-5 text-center text-[21px] font-bold text-[#171717]">No Coupons Available</Text>
            <Text className="mt-2 max-w-[310px] text-center text-[15px] leading-[23px] font-medium text-[#737579]">
              Please come back later to view more offers or apply a custom coupon above.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
