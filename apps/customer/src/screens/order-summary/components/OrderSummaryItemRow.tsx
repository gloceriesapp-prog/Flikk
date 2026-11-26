import { CUT_SIZE_LABEL, SERVING_LABEL } from '../../../store/cartIdentity';
import { Text, View } from 'react-native';
import { AppImage } from '../../../components/AppImage';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import type { SummaryItem } from '../data';
import { formatOrderPrice } from '../utils/formatOrderPrice';

// A divider sits above every row but the first, so the last row has no
// bottom line; the last row also carries the card's rounded bottom corners.
export function OrderSummaryItemRow({ item, first, last }: { item: SummaryItem; first: boolean; last: boolean }) {
  return (
    <View className={`mx-5 bg-white px-4 ${last ? 'rounded-b-3xl pb-1' : ''}`}>
      <View className={`flex-row items-center gap-3 py-4 ${first ? '' : 'border-t border-ink/5'}`}>
        {/* Same photo frame as the product cards: the photo fills a
            rounded tile with a hairline border on the light card surface. */}
        <View className="overflow-hidden border border-[#E3E6EE] bg-[#F8F9FC]"
          style={{ width: 76, height: 76, borderRadius: 16, borderCurve: 'continuous' }}>
          <AppImage source={{ uri: item.products?.image_url || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[14px] font-semibold leading-5 text-ink" numberOfLines={3}>{item.products?.name ?? 'Item'}</Text>
          <Text className="mt-1 text-[12px] text-ink/50" numberOfLines={1}>{[item.unit_at_order ?? item.products?.unit, item.cut_size ? CUT_SIZE_LABEL[item.cut_size] : null, item.option_name_at_order, item.serving ? SERVING_LABEL[item.serving] : null, `Qty ${item.quantity}`].filter(Boolean).join(' · ')}</Text>
          {/* Price on the left; the shop on the right, cut short with … */}
          <View className="mt-2 flex-row items-center justify-between gap-4">
            <Text className="text-[14px] font-bold text-ink">{formatOrderPrice(item.unit_price_at_order * item.quantity)}</Text>
            <Text className="min-w-0 shrink text-right text-[12px] font-medium text-ink/45" numberOfLines={1} ellipsizeMode="tail"
              style={{ maxWidth: '60%' }}>{item.storeName}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
