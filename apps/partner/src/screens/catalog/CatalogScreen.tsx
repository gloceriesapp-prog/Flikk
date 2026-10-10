import { useFocusEffect } from '@react-navigation/native';
// Catalog management (P4). Add/edit-product forms are a later pass — this
// is the item list + stock/price triage, the core loop per
// specs/02-partner-app/flows.md. No `GET /partner/products` call yet, same
// no-auth caveat as ../orders/OrdersScreen.tsx.
//
// Product state lives in ../../store/useCatalogStore.ts now, not local
// useState — ProductDetailScreen needs to read and act on the same
// products (same reasoning as useOrdersStore for Orders/OrderDetail).
// "View" on a row pushes ProductDetailScreen rather than opening a sheet —
// see that screen's own note on why a sheet stopped fitting the job.

import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { useCatalogStore } from '../../store/useCatalogStore';
import { CATALOG_LAST_UPDATED_LABEL } from './data';
import { InventoryHeader } from './components/InventoryHeader';
import { InventoryProductListCard } from './components/InventoryProductListCard';
import { InventoryStatusFilter, type InventoryStatusFilterValue } from './components/InventoryStatusFilter';
import { InventorySummaryCard } from './components/InventorySummaryCard';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Catalog'>;

// Same flat gray Payouts/Orders already use (PayoutsScreen.tsx/
// OrdersScreen.tsx's own PAGE_BG, itself matching apps/customer's
// checkout flow, CheckoutScreen.tsx's `#F1F2F4`) — cards stay solid white
// on top of it, per an explicit ask to match it here too.
const PAGE_BG = '#F1F2F4';

export function CatalogScreen({ navigation }: Props) {
  const products = useCatalogStore((state) => state.products);
  const loadProducts = useCatalogStore((state) => state.loadProducts);
  const [stockFilter, setStockFilter] = useState<InventoryStatusFilterValue>('all');

  useFocusEffect(useCallback(() => {
    void loadProducts();
  }, [loadProducts]));

  const handlePressView = useCallback(
    (productId: string) => navigation.navigate('ProductDetail', { productId }),
    [navigation],
  );

  const inStockCount = products.filter((product) => product.isInStock).length;
  const visibleProducts = products.filter((product) => {
    if (stockFilter === 'in_stock') return product.isInStock;
    if (stockFilter === 'out_of_stock') return !product.isInStock;
    return true;
  });

  return (
    <View className="flex-1 pt-safe" style={{ backgroundColor: PAGE_BG }}>
      <InventoryHeader onPressSearch={() => {}} />

      <InventorySummaryCard
        listedCount={products.length}
        lastUpdatedLabel={CATALOG_LAST_UPDATED_LABEL}
        onPressAddProduct={() => navigation.navigate('AddProduct')}
      />

      <View className="py-3">
        <InventoryStatusFilter
          options={[
            { value: 'all', label: 'All Items', count: products.length },
            { value: 'in_stock', label: 'In Stock', count: inStockCount },
            { value: 'out_of_stock', label: 'Out of Stock', count: products.length - inStockCount },
          ]}
          selected={stockFilter}
          onSelect={setStockFilter}
        />
      </View>

      {/* FlatList is the scroller (not wrapped in a ScrollView — a
          VirtualizedList inside a ScrollView loses windowing). Empty state is
          a static view since there's nothing to scroll. */}
      {visibleProducts.length > 0 ? (
        <InventoryProductListCard products={visibleProducts} onPressView={handlePressView} />
      ) : (
        <View className="items-center gap-1 px-10 pt-16">
          <Text className="text-[15px] font-semibold text-ink">No items here</Text>
          <Text className="text-center text-[13px] text-ink/50 font-medium">
            {stockFilter === 'out_of_stock' ? 'Nothing is marked out of stock right now.' : 'Nothing is in stock right now.'}
          </Text>
        </View>
      )}

      <BottomNavBar />
    </View>
  );
}
