import { Text, View } from 'react-native';

export function StoreClosedNotice() {
  return (
    <View accessibilityRole="summary" className="gap-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3.5">
      <Text className="text-[14px] font-semibold text-[#171717]">Ordering is paused</Text>
      <Text className="text-[13px] leading-[19px] text-[#737373]">A store in your cart is closed. Keep adding items and place your order when it reopens.</Text>
    </View>
  );
}
