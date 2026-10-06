import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../../navigation/types';
import { CategoryDetailHeader } from '../../../category-detail/components/CategoryDetailHeader';
import { ContentState } from '../../content/ContentState';
import { GroceryProductTile } from '../../groceries/components/GroceryProductTile';
import { useFestivalCollection } from './useFestivalCollection';
import { FestivalProductDetails } from '../components/FestivalProductDetails';

export function FestivalCollectionScreen({ route, navigation }: NativeStackScreenProps<AppStackParamList, 'FestivalCollection'>) {
  const { title, products, previewOnly, hasLocation, isLoading, isError, retry } = useFestivalCollection(route.params.collection);
  return (
    <View className="flex-1 bg-white pt-safe">
      <StatusBar style="dark" />
      <CategoryDetailHeader title={title} onBack={() => navigation.goBack()} onSearch={() => navigation.navigate('Search')} />
      {products.length > 0 ? (
        <FlashList
          data={products}
          numColumns={2}
          keyExtractor={(product) => product.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <View className="flex-1 px-1 pb-6">
              <GroceryProductTile product={item} previewOnly={previewOnly} />
              <FestivalProductDetails product={item} showAssortment={route.params.collection === 'festival-fruits'} showBoxOptions={route.params.collection === 'sweets-to-share'} />
            </View>
          )}
        />
      ) : (
        <ContentState hasLocation={hasLocation} isLoading={isLoading} isError={isError} retry={retry} emptyMessage="Not listed nearby yet." />
      )}
    </View>
  );
}
