import { FlashList } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { View, useWindowDimensions } from 'react-native';
import { ScreenStatusBar } from '../../../components/ScreenStatusBar';
import type { AppStackParamList } from '../../../navigation/types';
import { CategoryDetailHeader } from '../../category-detail/components/CategoryDetailHeader';
import { StoreTileCard } from '../components/StoreTileCard';
import { ProductCard } from '../products/ProductCard';

export function HomeSectionCollectionScreen({
  route, navigation,
}: NativeStackScreenProps<AppStackParamList, 'HomeSectionCollection'>) {
  const collection = route.params;
  const { width } = useWindowDimensions();

  return (
    <View className="flex-1 bg-white pt-safe">
      <ScreenStatusBar style="dark" />
      <CategoryDetailHeader
        title={collection.title.replace(/\s+/g, ' ')}
        onBack={() => navigation.goBack()}
        onSearch={() => navigation.navigate('Search')}
      />
      {'products' in collection ? (
        <FlashList
          data={collection.products}
          numColumns={3}
          keyExtractor={(product) => product.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 48 }}
          renderItem={({ item }) => (
            <View className="flex-1 px-1 pb-5">
              <ProductCard product={item} widthClassName="w-full" showDiscountBadge={collection.showDiscountBadge} />
            </View>
          )}
        />
      ) : (
        <FlashList
          data={collection.stores}
          keyExtractor={(store) => store.id}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 48 }}
          renderItem={({ item }) => (
            <View className="items-center pb-4">
              <StoreTileCard
                store={item}
                width={Math.min(width - 40, 420)}
                aspectRatio={16 / 10}
                onPress={() => navigation.navigate('StoreDetail', { storeId: item.id, storeName: item.name })}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}
