import { Text, View } from 'react-native';
import { RupeePrice } from '../../../components/RupeePrice';
import { GILROY } from '../../../theme/fonts';

// Same type scale as the cart's Bill details (BillDetailsCard): 15 px grey
// label, 14 px semibold amount.
const PRICE_STYLE = { fontFamily: GILROY.semibold };

interface Props {
  label: string;
  // A number is drawn as a rupee amount; text (e.g. "Not recorded") as is.
  value: number | string;
  discount?: boolean;
  showFree?: boolean;
}

export function OrderSummaryBillRow({ label, value, discount = false, showFree = false }: Props) {
  const green = discount || (showFree && value === 0);
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className={`flex-1 text-[15px] font-medium ${discount ? 'text-success' : 'text-[#737579]'}`}>{label}</Text>
      {typeof value === 'string' ? (
        <Text className="text-[14px] text-[#505257]" style={PRICE_STYLE}>{value}</Text>
      ) : showFree && value === 0 ? (
        <Text className="text-[14px] text-success" style={PRICE_STYLE}>FREE</Text>
      ) : (
        <RupeePrice amount={value.toFixed(2)} size={14} prefix={discount ? '-' : undefined} style={PRICE_STYLE} color={green ? '#2E9E77' : '#505257'} />
      )}
    </View>
  );
}
