import { ScrollView, View } from 'react-native';
import { SectionTitle } from '../../components/SectionTitle';
import { GroceryProductTile } from '../../groceries/components/GroceryProductTile';
import { RegionalSectionState } from '../components/RegionalSectionState';
import { REGIONAL_PREVIEW_PRODUCTS } from '../preview/data';
import { RegionalPreviewNotice } from '../preview/RegionalPreviewNotice';
import { useDistrictFavourites } from './useDistrictFavourites';

export function DistrictFavouritesSection() {
  const inventory = useDistrictFavourites();
  const previewOnly = __DEV__ && process.env.EXPO_PUBLIC_ENABLE_DESIGN_PREVIEWS === 'true' && inventory.products.length === 0;
  const products = previewOnly ? REGIONAL_PREVIEW_PRODUCTS : inventory.products;
  return (
    <View className="pt-8">
      <SectionTitle>Your District’s Favourites</SectionTitle>
      {previewOnly && <RegionalPreviewNotice />}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-start gap-3 px-5" snapToInterval={140} snapToAlignment="start" decelerationRate="fast">
        {products.map((product) => <View key={product.id} className="w-32"><GroceryProductTile product={product} previewOnly={previewOnly} /></View>)}
      </ScrollView>
      {previewOnly && (!inventory.hasLocation || inventory.isError) && <View className="mt-4"><RegionalSectionState {...inventory} loadingLabel="Loading district favourites" emptyMessage="No picks available nearby yet." /></View>}
    </View>
  );
}
