// Payment failures return to the cart for retry; no intermediate checkout page.
import { useEffect } from 'react';
import { BackHandler, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'PaymentStatus'>;


export function PaymentStatusScreen({ navigation }: Props) {
  function retryPayment() {
    navigation.reset({ index: 0, routes: [{ name: 'Cart' }] });
  }

  function backToCart() {
    navigation.reset({ index: 0, routes: [{ name: 'Cart' }] });
  }

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      backToCart();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View className="flex-1 items-center justify-center gap-3 bg-white px-8">
      <View className=" items-center justify-center">
        <View className="h-14 w-14 items-center justify-center">
          <AppIcon icon={Cancel01Icon} size={28} color={colors.danger} />
        </View>
      </View>

      <Text className="mt-2 text-[18px] font-semibold tracking-tight text-ink">Payment Not Confirmed</Text>
      <Text className="max-w-[300px] text-center text-[13.5px] font-medium leading-5 text-ink/55">
        Payment wasn’t confirmed. If charged, your money will be refunded within 2 hours. Check Orders before paying again.
      </Text>

      <View className="mt-8 w-full gap-3">
        <Pressable onPress={retryPayment} accessibilityRole="button" className="items-center rounded-2xl bg-primary py-4">
          <Text className="text-[13.5px] font-semibold text-white">Retry Payment</Text>
        </Pressable>
        <Pressable onPress={backToCart} className="items-center rounded-2xl py-4 bg-[#F1F2F4]">
          <Text className="text-[13.5px] font-semibold text-ink/70">Back to Cart</Text>
        </Pressable>
      </View>
    </View>
  );
}
