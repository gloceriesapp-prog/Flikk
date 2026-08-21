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

import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
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

export function CatalogScreen({ navigation }: Props) {
  const products = useCatalogStore((state) => state.products);
  const [stockFilter, setStockFilter] = useState<InventoryStatusFilterValue>('all');

  const inStockCount = products.filter((product) => product.isInStock).length;
  const visibleProducts = products.filter((product) => {
    if (stockFilter === 'in_stock') return product.isInStock;
    if (stockFilter === 'out_of_stock') return !product.isInStock;
    return true;
  });

  return (
    <View className="flex-1 bg-white pt-safe">
      <InventoryHeader onPressSearch={() => {}} />

      <InventorySummaryCard
        listedCount={products.length}
        lastUpdatedLabel={CATALOG_LAST_UPDATED_LABEL}
        onPressManageStocks={() => {}}
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

      <ScrollView className="flex-1" contentContainerClassName="pb-28">
        {visibleProducts.length > 0 ? (
          <InventoryProductListCard
            products={visibleProducts}
            onPressView={(productId) => navigation.navigate('ProductDetail', { productId })}
          />
        ) : (
          <View className="items-center gap-1 px-10 pt-16">
            <Text className="text-base font-semibold text-ink">No items here</Text>
            <Text className="text-center text-sm text-ink/50">
              {stockFilter === 'out_of_stock' ? 'Nothing is marked out of stock right now.' : 'Nothing is in stock right now.'}
            </Text>
          </View>
        )}
      </ScrollView>

      <BottomNavBar />
    </View>
  );
}
