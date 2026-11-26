import { CUT_SIZE_LABEL, SERVING_LABEL } from '../../../../../store/cartIdentity';
import { Text, View } from 'react-native';
import { AppImage } from '../../../../../components/AppImage';
import type { ApiOrderItem } from '../../../../../api/orders';
import { PLACEHOLDER_IMAGE_URI } from '../../../../../theme/placeholderImage';
import { formatOrderPrice } from '../../../../order-summary/utils/formatOrderPrice';

const PHOTO = 64;

// One ordered item: photo on the left; name, pack details and quantity in
// the middle; the line price on the right.
export function OrderSummaryProductCard({ item }: { item: ApiOrderItem }) {
  const details = [item.unit_at_order ?? item.products?.unit, item.cut_size ? CUT_SIZE_LABEL[item.cut_size] : null, item.option_name_at_order, item.serving ? SERVING_LABEL[item.serving] : null].filter(Boolean).join(' · ');
  return (
    <View className="flex-row items-center gap-3.5">
      <View className="items-center justify-center overflow-hidden rounded-2xl border border-[#EEF0F3] bg-[#F7F8FA]"
        style={{ width: PHOTO, height: PHOTO }}>
        <AppImage source={{ uri: item.products?.image_url || PLACEHOLDER_IMAGE_URI }} style={{ width: PHOTO - 12, height: PHOTO - 12 }} resizeMode="contain" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[14.5px] font-semibold leading-5 text-ink" numberOfLines={2}>{item.products?.name ?? 'Item'}</Text>
        <View className="mt-1 flex-row items-center gap-2">
          {details ? <Text className="shrink text-[12.5px] font-medium text-ink/50" numberOfLines={1}>{details}</Text> : null}
          <View className="rounded-md bg-[#F1F3F6] px-1.5 py-0.5">
            <Text className="text-[11.5px] font-semibold text-ink/70">Qty {item.quantity}</Text>
          </View>
        </View>
      </View>
      <Text className="text-[15px] font-bold text-ink">{formatOrderPrice(item.unit_price_at_order * item.quantity)}</Text>
    </View>
  );
}
