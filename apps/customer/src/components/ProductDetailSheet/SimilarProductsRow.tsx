import { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { IconlyArrowLeft } from '../icons/iconly';
import { GILROY } from '../../theme/fonts';
import { SelfServiceProductCardView } from '../../screens/home/products/ProductCardView';
import type { Product } from '../../screens/home/products/types';
import { useSimilarProducts } from './useSimilarProducts';

interface Props {
  product: Product;
  onSelect?: (product: Product) => void;
}

// One recommendation source for the six-card preview and the full paged list.
export function SimilarProductsRow({ product, onSelect }: Props) {
  const query = useSimilarProducts(product.categoryLabel, product.id, product.storeId, !product.relatedProducts);
  const candidates = product.relatedProducts ?? query.data?.pages.flatMap((page) => page.products) ?? [];
  const products = [...new Map(candidates.filter((item) => item.id !== product.id).map((item) => [item.id, item])).values()];
  const [showAll, setShowAll] = useState(false);
  const insets = useSafeAreaInsets();
  const open = (item: Product) => { setShowAll(false); onSelect?.(item); };
  if (!products.length && !query.isFetching && !query.isError) return null;
  return (
    <View className="bg-white px-4 pb-4 pt-5">
      <Text className="mb-4 text-[18px] leading-[24px] text-ink" style={{ fontFamily: GILROY.bold }}>Similar products</Text>
      <View className="-mx-1 flex-row flex-wrap">
        {products.slice(0, 6).map((item) => (
          <View key={item.id} style={{ width: '33.333333%', paddingHorizontal: 4, marginBottom: 16 }}>
            <SelfServiceProductCardView product={item} widthClassName="w-full" onPress={() => open(item)} />
          </View>
        ))}
      </View>
      {query.isFetching && !products.length ? <ActivityIndicator accessibilityLabel="Loading similar products" /> : null}
      {query.isError && !products.length ? (
        <Pressable accessibilityRole="button" onPress={() => { void query.refetch(); }} className="py-3">
          <Text className="text-center text-[13px] text-ink/60">Couldn’t load recommendations. Tap to retry.</Text>
        </Pressable>
      ) : null}
      {products.length > 6 || query.hasNextPage ? (
        <Pressable accessibilityRole="button" onPress={() => setShowAll(true)} className="items-center rounded-xl bg-[#F3F4F5] px-4 py-3">
          <Text className="text-[14px] text-ink" style={{ fontFamily: GILROY.bold }}>See all similar products</Text>
        </Pressable>
      ) : null}
      <Modal visible={showAll} animationType="slide" onRequestClose={() => setShowAll(false)}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: insets.top }}>
          <View className="flex-row items-center border-b border-[#ECECEC] px-4 py-3">
            <Pressable accessibilityRole="button" accessibilityLabel="Back to product" onPress={() => setShowAll(false)} className="h-10 w-10 items-center justify-center rounded-full bg-white">
              <IconlyArrowLeft size={24} />
            </Pressable>
            <Text className="ml-2 flex-1 text-[18px] text-ink" style={{ fontFamily: GILROY.bold }}>Similar products</Text>
          </View>
          <FlatList
            data={products}
            numColumns={3}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 16, paddingBottom: insets.bottom + 24 }}
            renderItem={({ item }) => (
              <View style={{ width: '33.333333%', paddingHorizontal: 4, marginBottom: 16 }}>
                <SelfServiceProductCardView product={item} widthClassName="w-full" onPress={() => open(item)} />
              </View>
            )}
            onEndReachedThreshold={0.4}
            onEndReached={() => { if (query.hasNextPage && !query.isFetchingNextPage && !query.isFetchNextPageError) void query.fetchNextPage(); }}
            ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator accessibilityLabel="Loading more products" /> : query.isFetchNextPageError ? (
              <Pressable accessibilityRole="button" onPress={() => { void query.fetchNextPage(); }} className="py-4"><Text className="text-center text-ink">Retry loading more products</Text></Pressable>
            ) : null}
          />
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}
