import { View } from 'react-native';
import { SectionTitle } from '../../components/SectionTitle';
import { GroceryProductTile } from '../../groceries/components/GroceryProductTile';
import { REGIONAL_PREVIEW_PRODUCTS } from '../preview/data';
import { RegionalPreviewNotice } from '../preview/RegionalPreviewNotice';
import { RegionalSectionState } from '../components/RegionalSectionState';
import { useLocalOffers } from './useLocalOffers';

export function LocalOffersSection() {
  const offers = useLocalOffers();
  const previewOnly = __DEV__ && process.env.EXPO_PUBLIC_ENABLE_DESIGN_PREVIEWS === 'true' && offers.products.length === 0;
  const products = (previewOnly ? REGIONAL_PREVIEW_PRODUCTS : offers.products).slice(0, 6);
  return (
    <View className="pt-8">
      <SectionTitle>Deals from Around Here</SectionTitle>
      {previewOnly && <RegionalPreviewNotice />}
      <View className="px-5">
        <View className="-mx-1.5 flex-row flex-wrap gap-y-5">
          {products.map((product) => (
            <View key={product.id} className="px-1.5" style={{ width: '33.333333%' }}>
              <GroceryProductTile product={product} previewOnly={previewOnly} />
            </View>
          ))}
        </View>
      </View>
      {previewOnly && (!offers.hasLocation || offers.isError) && <View className="mt-4"><RegionalSectionState {...offers} loadingLabel="Loading local offers" emptyMessage="No offers available yet." /></View>}
    </View>
  );
}
