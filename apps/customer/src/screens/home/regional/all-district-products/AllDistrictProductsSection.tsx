import { View } from 'react-native';
import { mapApiProduct } from '../../../../api/products';
import { SectionTitle } from '../../components/SectionTitle';
import { GroceryProductTile } from '../../groceries/components/GroceryProductTile';
import { DISTRICT_CATALOGUE_PREVIEWS } from './data';
import { RegionalPreviewNotice } from '../preview/RegionalPreviewNotice';
import { useDistrictCatalogue } from './useDistrictCatalogue';

export function AllDistrictProductsSection() {
  const { catalogue } = useDistrictCatalogue();
  const previewOnly = __DEV__ && process.env.EXPO_PUBLIC_ENABLE_DESIGN_PREVIEWS === 'true' && catalogue.length === 0;
  const products = previewOnly ? DISTRICT_CATALOGUE_PREVIEWS : catalogue.slice(0, 9).map(mapApiProduct);
  return (
    <View className="pt-8">
      <SectionTitle>All District Products</SectionTitle>
      {previewOnly && <RegionalPreviewNotice />}
      <View className="px-5">
        <View className="-mx-1.5 flex-row flex-wrap items-start gap-y-5">
          {products.map((product) => (
            <View key={product.id} className="px-1.5" style={{ width: '33.333333%' }}>
              <GroceryProductTile product={product} previewOnly={previewOnly} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
