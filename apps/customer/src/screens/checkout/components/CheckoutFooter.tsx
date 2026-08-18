// Centered total + bonus-points line + full-width Pay button, per the
// reference. Points are a placeholder gamification touch (₹10 spent = 1
// point) — no loyalty backend exists to compute a real figure yet.
//
// Button text tracks the picked payment method — "Pay now" until one's
// selected, then "Pay with Google Pay" (etc.), same as the method itself
// driving whether the button is even enabled. One prop drives both, so
// they can't drift out of sync with each other.

import { Coins01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  totalPrice: number;
  onPay: () => void;
  paymentMethodLabel: string | null;
}

export function CheckoutFooter({ totalPrice, onPay, paymentMethodLabel }: Props) {
  const bonusPoints = Math.round(totalPrice / 10);
  const disabled = !paymentMethodLabel;

  return (
    <View className="gap-3 border-t border-mist px-5 pb-safe-offset-4 pt-4">
      <View className="items-center gap-1">
        <Text className="text-xl font-bold text-ink">Total: ₹{totalPrice}</Text>
        <View className="flex-row items-center gap-1.5">
          {/* <AppIcon icon={Coins01Icon} size={14} color={colors.gold} /> */}
          <Text className="text-sm font-semibold text-ink/60">You&apos;ll earn {bonusPoints} bonus points!</Text>
        </View>
      </View>

      <Pressable
        onPress={onPay}
        disabled={disabled}
        className={`items-center rounded-3xl py-4 ${disabled ? 'bg-black/30' : 'bg-black'}`}
      >
        <Text className="text-lg font-semibold text-white">
          {paymentMethodLabel ? `Pay with ${paymentMethodLabel}` : 'Pay now'}
        </Text>
      </Pressable>
    </View>
  );
}
