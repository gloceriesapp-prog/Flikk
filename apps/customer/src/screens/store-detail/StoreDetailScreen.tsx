// Reached from a StoreCard's "Shop now" button. Same "sidebar + product
// grid" UI as screens/category-detail/CategoryDetailScreen.tsx — this
// screen reuses that screen's header/sidebar components directly rather
// than a copy, so a layout fix in one place fixes both.
//
// Real catalog (useStoreProducts.ts -> GET /stores/:id/products) — a
// product only ever belongs to the one store it was added under in admin's
// Inventory screen, so this screen only ever shows that store's own items,
// never another store's or Home's own tab data. Sidebar categories are
// whatever categories this store's own products actually use, "All" first.
//
// Product cards are the real, shared ProductCard (home/products/) — same
// card every other product grid in the app uses.

import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProductCard } from '../home/products/ProductCard';
import { CategoryDetailHeader } from '../category-detail/components/CategoryDetailHeader';
import { SubCategorySidebar } from '../category-detail/components/SubCategorySidebar';
import { useStoreProducts } from './useStoreProducts';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'StoreDetail'>;

export function StoreDetailScreen({ navigation, route }: Props) {
  const { storeId, storeName } = route.params;
  const { data } = useStoreProducts(storeId);
  const categories = data?.categories ?? [];
  const products = data?.products ?? [];

  const [selectedId, setSelectedId] = useState('all');
  useEffect(() => {
    setSelectedId('all');
  }, [storeId]);

  const visibleProducts = selectedId === 'all' ? products : products.filter((p) => p.categoryLabel === selectedId);

  return (
    <View className="flex-1 bg-white pt-safe">
      {/* This screen is reached straight from StoreListScreen, which sets
          the global StatusBar to "light" for its own dark photo banner —
          that doesn't reset on navigation (same fix class as Categories/
          Purchase/StoreListScreen's own notes) and left invisible white
          icons against this screen's white header. */}
      <StatusBar style="dark" />
      <CategoryDetailHeader
        title={storeName}
        onBack={() => navigation.goBack()}
        onSearch={() => navigation.navigate('Search')}
      />

      <View className="flex-1 flex-row">
        <SubCategorySidebar items={categories} selectedId={selectedId} onSelect={setSelectedId} />

        <ScrollView
          className="flex-1 bg-mist/30"
          contentContainerClassName="flex-row flex-wrap gap-x-3 gap-y-6 p-3 pb-16"
          showsVerticalScrollIndicator={false}
        >
          {visibleProducts.length === 0 && (
            <View className="w-full items-center py-16">
              <Text className="text-sm text-ink/50">No items here yet.</Text>
            </View>
          )}
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} widthClassName="w-[47%]" showDiscountBadge />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
