// Optional tip for the rider. Sets the cart's tipAmount; the server quote
// adds it to the bill and the rider is paid all of it once the order is
// delivered (backend migration 20261115090000). Tap the selected amount again
// to remove it.

import { Pressable, Text, View } from 'react-native';
import { colors } from '../../../theme/tokens';
import { useCartStore } from '../../../store/useCartStore';

const TIP_OPTIONS = [10, 20, 30, 50] as const;

export function RiderTipCard() {
  const tip = useCartStore((state) => state.tipAmount);
  const setTip = useCartStore((state) => state.setTipAmount);
  return (
    <View className="gap-3 rounded-2xl bg-white px-4 py-4">
      <View className="gap-1">
        <Text className="text-[15px] font-semibold text-ink">Tip your delivery partner</Text>
        <Text className="text-[12.5px] text-ink/60">100% of the tip goes to your rider.</Text>
      </View>
      <View className="flex-row gap-2">
        {TIP_OPTIONS.map((amount) => {
          const selected = tip === amount;
          return (
            <Pressable
              key={amount}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={selected ? `Remove ₹${amount} tip` : `Tip ₹${amount}`}
              onPress={() => setTip(selected ? 0 : amount)}
              className="flex-1 items-center rounded-xl border py-2.5"
              style={{ borderColor: selected ? colors.primary : '#E5E7EB', backgroundColor: selected ? '#EEF3FF' : '#FFFFFF' }}
            >
              <Text className="text-[14px] font-semibold" style={{ color: selected ? colors.primary : colors.ink }}>₹{amount}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
