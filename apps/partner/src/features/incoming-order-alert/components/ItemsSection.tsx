// Items line — first three names, "& N more" if there are more than
// that, matching the reference's truncated list + link-style tail. Still
// no price anywhere (see IncomingOrderAlert.tsx's own note) — this is
// what's in the order, not what it costs.

import { Text, View } from 'react-native';
import { ShoppingBasket01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { OrderLineItem } from '../../../screens/orders/data';

const VISIBLE_ITEM_COUNT = 3;

interface Props {
  items: OrderLineItem[];
}

export function ItemsSection({ items }: Props) {
  const visible = items.slice(0, VISIBLE_ITEM_COUNT);
  const remaining = items.length - visible.length;

  return (
    <View className="flex-row items-start gap-3">
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-200">
        <AppIcon icon={ShoppingBasket01Icon} size={20} color={colors.ink} />
      </View>

      <View className="flex-1">
        <Text className="text-sm font-medium text-ink/40">Items ({items.length})</Text>
        <Text className="mt-0.5 text-base font-medium leading-5 text-ink">
          {visible.map((item) => item.name).join(', ')}
          {remaining > 0 && <Text className="font-medium text-lime-deep"> &amp; {remaining} more</Text>}
        </Text>
      </View>
    </View>
  );
}
