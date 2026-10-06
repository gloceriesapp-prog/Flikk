import { Text, View } from 'react-native';

interface Props {
  label: string;
  value: string;
  bold?: boolean;
}

export function OrderSummaryBillRow({ label, value, bold = false }: Props) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className={bold ? 'text-[15px] font-bold text-ink' : 'text-[13px] text-ink/60'}>{label}</Text>
      <Text className={bold ? 'text-[15px] font-bold text-ink' : 'text-[13px] font-semibold text-ink'}>{value}</Text>
    </View>
  );
}
