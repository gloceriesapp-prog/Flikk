import { Pressable, Text, View } from 'react-native';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../../components/AppIcon';
import type { ApiOrderItem } from '../../../../api/orders';
import { colors } from '../../../../theme/tokens';
import { OrderSummaryProductCard } from './components/OrderSummaryProductCard';

interface Props {
  items: ApiOrderItem[];
  onViewSummary: () => void;
}

export function OrderSummarySection({ items, onViewSummary }: Props) {
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const previewItems = items.slice(0, 2);

  return (
    <View className="w-full rounded-3xl bg-white p-5">
      <View className="flex-row items-center justify-between gap-3">
        <Text accessibilityRole="header" className="text-[18px] font-bold text-ink">Order summary</Text>
        <Text className="text-[12px] font-medium text-ink/50">{quantity} item{quantity === 1 ? '' : 's'}</Text>
      </View>
      {previewItems.length > 0 ? (
        <View className="mt-4 flex-row gap-3">
          {previewItems.map((item) => (
            <OrderSummaryProductCard key={item.id} item={item} />
          ))}
          {previewItems.length === 1 && <View className="flex-1" />}
        </View>
      ) : <Text className="mt-3 text-[13px] text-ink/50">Item details unavailable.</Text>}
      {items.length > 2 && <Text className="mt-2 text-[12px] text-ink/50">+{items.length - 2} more product{items.length - 2 === 1 ? '' : 's'} in your order</Text>}

      <Pressable
        onPress={onViewSummary}
        accessibilityRole="button"
        className="mt-4 flex-row items-center justify-between rounded-xl bg-[#F1F2F4] px-4 py-3"
      >
        <Text className="text-[13px] font-semibold text-ink">View order summary</Text>
        <AppIcon icon={ArrowRight01Icon} size={16} color={colors.ink} />
      </Pressable>
    </View>
  );
}
