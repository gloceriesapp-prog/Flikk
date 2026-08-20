// Catalog management (P4). Add/edit-product forms are a later pass — this
// is the item list + stock toggle, the core loop per
// specs/02-partner-app/flows.md. No `GET /partner/products` call yet, same
// no-auth caveat as ../orders/OrdersScreen.tsx.

import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { PLACEHOLDER_PRODUCTS, type PartnerProduct } from './data';
import { ProductRow } from './components/ProductRow';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Catalog'>;

export function CatalogScreen(_props: Props) {
  const [products, setProducts] = useState<PartnerProduct[]>(PLACEHOLDER_PRODUCTS);

  function toggleStock(productId: string) {
    setProducts((prev) =>
      prev.map((product) => (product.id === productId ? { ...product, isInStock: !product.isInStock } : product))
    );
  }

  return (
    <View className="flex-1 bg-white pt-safe">
      <View className="px-5 pb-4 pt-3">
        <Text className="text-xs font-semibold text-ink/50">Catalog</Text>
        <Text className="text-lg font-extrabold text-ink">{products.length} products</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pb-28">
        {products.map((product) => (
          <ProductRow key={product.id} product={product} onToggleStock={toggleStock} />
        ))}
      </ScrollView>

      <BottomNavBar />
    </View>
  );
}
