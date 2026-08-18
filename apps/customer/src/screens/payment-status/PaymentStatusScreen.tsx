// Failure screen — a successful payment goes straight to
// screens/receipt/ReceiptScreen.tsx instead (see PaymentProcessingSheet.tsx).
// Nothing navigates here yet; kept ready for when a real Razorpay failure
// needs somewhere to land.

import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'PaymentStatus'>;

export function PaymentStatusScreen({ navigation }: Props) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white px-8">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-danger/15">
        <AppIcon icon={Cancel01Icon} size={36} color={colors.danger} />
      </View>
      <Text className="text-xl font-extrabold text-ink">Payment Failed</Text>
      <Text className="text-center text-sm text-ink/60">Your cart is still saved — nothing was charged.</Text>

      <View className="mt-6 w-full gap-3">
        <Pressable onPress={() => navigation.goBack()} className="items-center rounded-2xl bg-black py-4">
          <Text className="text-base font-bold text-white">Retry Payment</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Cart')} className="items-center rounded-2xl border border-mist py-4">
          <Text className="text-base font-bold text-ink">Back to Cart</Text>
        </Pressable>
      </View>
    </View>
  );
}
