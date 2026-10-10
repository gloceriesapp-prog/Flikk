// Header + virtualized list of product rows below the Inventory summary —
// each row is its own floating white card (ProductRow carries its own
// shadow), sitting directly on CatalogScreen's own gray page background
// (the shared PAGE_BG) rather than a second, separately-colored tray.
//
// #21: a kirana catalog runs to hundreds of SKUs. This used to be
// products.map(...) inside a plain ScrollView, so every row (and its
// expo-image thumbnail) mounted at once. It's a FlatList now — windowed, so
// only the visible rows plus a small buffer are mounted. The "Products / N
// items" strip is the ListHeaderComponent; the empty state stays in
// CatalogScreen (this only renders when there's at least one product).

import { useCallback } from 'react';
import { Package02Icon } from '@hugeicons/core-free-icons';
import { FlatList, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { ProductRow } from './ProductRow';
import type { PartnerProduct } from '../data';

interface Props {
  products: PartnerProduct[];
  onPressView: (productId: string) => void;
}

const keyExtractor = (item: PartnerProduct) => item.id;
// 10px gap — matches the old `gap-2.5` between the mapped rows.
const Separator = () => <View className="h-2.5" />;

function ListHeader({ count }: { count: number }) {
  return (
    <View className="flex-row items-center justify-between px-1 pb-2 pt-5">
      <View className="flex-row items-center gap-2">
        <AppIcon icon={Package02Icon} size={16} color={colors.ink} />
        <Text className="text-base font-medium text-ink/80">Products</Text>
      </View>
      <Text className="text-base font-medium text-ink/60">
        {count} {count === 1 ? 'item' : 'items'}
      </Text>
    </View>
  );
}

export function InventoryProductListCard({ products, onPressView }: Props) {
  const renderItem = useCallback(
    ({ item }: { item: PartnerProduct }) => <ProductRow product={item} onPressView={onPressView} />,
    [onPressView],
  );

  return (
    <FlatList
      className="flex-1"
      data={products}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListHeaderComponent={<ListHeader count={products.length} />}
      ItemSeparatorComponent={Separator}
      // mx-5 (horizontal) + the old pb-28 so the last row clears the BottomNavBar.
      contentContainerClassName="px-5 pb-28"
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={11}
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
    />
  );
}
