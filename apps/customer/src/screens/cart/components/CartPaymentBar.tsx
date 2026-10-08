import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import type { UpiApp } from '../../../payments/upiApps';
import { paymentMethodLabel, type PaymentMethod } from '../../../payments/paymentMethod';
import { useCopy } from '../../../api/appConfig';

interface Props {
  method: PaymentMethod | null;
  apps: UpiApp[];
  total: number | null;
  busy: boolean;
  disabled: boolean;
  onChoose: () => void;
  onPlaceOrder: () => void;
}

// One row, two actions: change payment on the left, place order on the right.
export function CartPaymentBar({ method, apps, total, busy, disabled, onChoose, onPlaceOrder }: Props) {
  const label = method ? paymentMethodLabel(method, apps) : 'Select payment method';
  const amount = total == null ? 'Checking total…' : `₹${total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const blocked = busy || disabled;
  const placeOrderLabel = useCopy('checkout.placeOrder.cta');

  return (
    <View className="flex-row items-center gap-3 bg-white px-4 pb-safe-offset-3 pt-2">
      <Pressable onPress={onChoose} disabled={busy} accessibilityRole="button"
        accessibilityLabel={method ? `Change payment method, ${label}` : label}
        accessibilityState={{ disabled: busy }}
        className="min-h-[52px] min-w-0 flex-1 flex-row items-center gap-2 py-2">
        <View className="min-w-0 flex-1">
          <Text className="text-[11px] font-medium text-[#717986]">Payment method</Text>
          <Text numberOfLines={1} className="mt-1 text-[13px] font-semibold text-[#18243B]">
            {method ? label : 'Choose method'}
          </Text>
        </View>
        <AppIcon icon={ArrowDown01Icon} size={15} color="#536176" />
      </Pressable>

      <Pressable onPress={method ? onPlaceOrder : onChoose} disabled={blocked}
        accessibilityRole="button" accessibilityState={{ disabled: blocked, busy }}
        accessibilityLabel={method ? `${placeOrderLabel}, total ${amount}` : `Select payment method, total ${amount}`}
        className="min-h-[52px] min-w-0 flex-1 items-center justify-center rounded-2xl bg-coral px-3 py-2.5"
        style={({ pressed }) => ({ opacity: disabled ? 0.5 : pressed ? 0.85 : 1 })}>
        {busy ? <ActivityIndicator color="#101C10" /> : (
          <>
            <Text numberOfLines={1} className="text-[14px] font-semibold text-ink">
              {method ? placeOrderLabel : 'Select payment'}
            </Text>
            <Text numberOfLines={1} className="mt-0.5 text-[13px] font-semibold text-ink/80 tracking-tight"
              style={{ fontVariant: ['tabular-nums'] }}>{amount}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
