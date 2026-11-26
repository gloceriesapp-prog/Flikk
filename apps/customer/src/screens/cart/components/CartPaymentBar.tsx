import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useCopy } from '../../../api/appConfig';
import { IconlyShoppingCart } from '../../../components/icons/IconlyShoppingCart';
import { TotalSkeleton } from './CheckoutSkeleton';

interface Props {
  total: number | null;
  busy: boolean;
  // Total is being priced: a skeleton instead of a placeholder word.
  loading?: boolean;
  disabled: boolean;
  storeClosed?: boolean;
  onProceed: () => void;
}

// Total on the left (on white), one green action on the right. The payment
// method is chosen on the next screen (Choose how to pay), and picking one
// there places the order.
export function CartPaymentBar({ total, busy, loading = false, disabled, storeClosed = false, onProceed }: Props) {
  const amount = total == null ? null : `₹${total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const blocked = busy || disabled || storeClosed;
  // Admin App content: checkout.placeOrder.cta (default "Proceed to Payment").
  const ctaLabel = useCopy('checkout.placeOrder.cta');

  return (
    <View className="flex-row items-center gap-4 bg-white px-4 pb-safe-offset-3 pt-2">
      <View className="min-w-0 flex-1" accessible accessibilityLabel={amount ? `Total amount ${amount}` : 'Checking total'}>
        <Text className="text-[12px] font-medium text-[#717986]">Total amount</Text>
        {amount == null && loading ? <TotalSkeleton /> : (
          <Text numberOfLines={1} className="mt-0.5 text-[20px] font-bold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
            {amount ?? '—'}
          </Text>
        )}
      </View>

      <View className="min-w-0 flex-[1.4]" style={{ opacity: disabled && !storeClosed ? 0.5 : 1 }}>
        <Pressable onPress={onProceed} disabled={blocked}
          accessibilityRole="button" accessibilityState={{ disabled: blocked, busy }}
          accessibilityLabel={storeClosed ? 'Store closed' : ctaLabel}
          className={`min-h-[54px] flex-row items-center justify-center gap-2 rounded-2xl px-3 ${storeClosed ? 'bg-[#E7E7EA]' : 'bg-[#155DFC]'}`}
          style={({ pressed }) => ({ opacity: !disabled && !storeClosed && pressed ? 0.85 : 1 })}>
          {busy ? <ActivityIndicator color="#FFFFFF" /> : (
            <>
              {!storeClosed && <IconlyShoppingCart size={22} color="#FFFFFF" />}
              <Text numberOfLines={1} className={`min-w-0 shrink text-[16px] font-semibold ${storeClosed ? 'text-[#737373]' : 'text-white'}`}>
                {storeClosed ? 'Store closed' : ctaLabel}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
