import { Text, View } from 'react-native';

export function OrderTotalCard({ total }: { total: number }) {
  return (
    <View className="flex-row items-center justify-between gap-3 rounded-3xl bg-white p-4">
      <Text className="text-[15px] font-medium text-ink">Order total</Text>
      <Text className="text-[18px] font-semibold text-ink">
        ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </Text>
    </View>
  );
}
