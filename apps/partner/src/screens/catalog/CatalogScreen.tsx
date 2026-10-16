import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { useCatalogStore } from '../../store/useCatalogStore';
import { useFocusedPoll } from '../../features/foreground-refresh/useFocusedPoll';
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
  const { error, loading, loaded, nextCursor, lastUpdatedAt, loadMore, setFilters } = useCatalogStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<InventoryStatusFilterValue>('all');

  useEffect(() => {
    const timer = setTimeout(() => { void setFilters(search, stockFilter); }, 350);
    return () => clearTimeout(timer);
  }, [search, stockFilter, setFilters]);

  useFocusEffect(useCallback(() => {
    void loadProducts();
  }, [loadProducts]));

  // The store enforces a freshness window and capped exponential backoff.
  useFocusedPoll(loadProducts, 60_000);

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
      <InventoryHeader onPressSearch={() => setSearchOpen((open) => !open)} />
      {searchOpen && <TextInput accessibilityLabel="Search inventory" autoFocus value={search} onChangeText={setSearch} placeholder="Search products" maxLength={100} className="mx-5 mb-3 rounded-2xl bg-white px-4 py-3 text-base text-ink" />}
      {error && <View className="mx-5 mb-3 rounded-2xl bg-white p-3"><Text className="text-sm text-red-600">{error}</Text><Pressable onPress={() => void loadProducts(true)}><Text className="mt-2 font-semibold text-blue-600">Retry</Text></Pressable></View>}

      <InventorySummaryCard
        listedCount={products.length}
        lastUpdatedLabel={lastUpdatedAt ? `Updated ${new Date(lastUpdatedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} · loaded items` : 'Loading your inventory'}
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
        <InventoryProductListCard products={visibleProducts} onPressView={handlePressView} loading={loading} hasMore={!!nextCursor} onLoadMore={() => void loadMore()} onRefresh={() => void loadProducts(true)} />
      ) : (
        <View className="items-center gap-1 px-10 pt-16">
          <Text className="text-[15px] font-semibold text-ink">{!loaded ? (error ? 'Inventory unavailable' : 'Gathering your shelf essentials…') : 'No matching items'}</Text>
          <Text className="text-center text-[13px] text-ink/50 font-medium">
            {loaded ? 'Try another search or stock filter.' : 'Your products will appear here.'}
          </Text>
        </View>
      )}

      <BottomNavBar />
    </View>
  );
}
