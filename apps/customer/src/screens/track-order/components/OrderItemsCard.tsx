// Real item list for this order — photo/name/weight/qty, straight off
// order.order_items (product name/image/unit joined server-side,
// GET /orders and GET /trips both select products(name, image_url, unit) —
// api/orders.ts's own note: no field here is invented). No price shown —
// explicit ask. Lives here now, not inline on PurchaseScreen's own
// OrderRow card — moved off the compact list card onto this detail
// screen, live order or already-finished one.

import { Text, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import type { ApiOrder } from '../../../api/orders';

interface Props {
  order: ApiOrder;
}

export function OrderItemsCard({ order }: Props) {
  return (
    <View className="w-full gap-3 rounded-3xl bg-white p-5">
      <Text className="text-base font-medium tracking-wide text-ink">
        {order.order_items.length} item{order.order_items.length === 1 ? '' : 's'}
      </Text>

      <View className="gap-4">
        {order.order_items.map((item) => (
          <View key={item.id} className="flex-row items-center gap-3.5">
            <View className="h-16 w-16 overflow-hidden rounded-2xl bg-gray-100">
              <Image source={{ uri: item.products?.image_url ?? PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
            </View>
            <View className="flex-1">
              <Text className="text-[15.5px] font-medium text-ink/80" numberOfLines={1}>
                {item.products?.name ?? 'Item'}
              </Text>
              {item.products?.unit ? (
                <Text className="mt-1 text-[13px] font-medium text-ink/45" numberOfLines={1}>
                  {item.products.unit}
                </Text>
              ) : null}
            </View>
            <Text className="text-[14px] font-semibold text-ink/50">x{item.quantity}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
