import { ScrollView, View } from 'react-native';
import { SectionTitle } from '../../components/SectionTitle';
import { DISCOVERY_PREVIEW_PRODUCTS } from '../preview/data';
import { RegionalPreviewNotice } from '../preview/RegionalPreviewNotice';
import { RegionalSectionState } from '../components/RegionalSectionState';
import { DiscoveryProductCard } from './DiscoveryProductCard';
import { useSomethingNew } from './useSomethingNew';

export function SomethingNewSection() {
  const discovery = useSomethingNew();
  const previewOnly = __DEV__ && process.env.EXPO_PUBLIC_ENABLE_DESIGN_PREVIEWS === 'true' && discovery.products.length === 0;
  const products = previewOnly ? DISCOVERY_PREVIEW_PRODUCTS : discovery.products;
  return (
    <View className="pt-8">
      <SectionTitle>Something New to Try</SectionTitle>
      {previewOnly && <RegionalPreviewNotice />}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-start gap-3 px-5" snapToInterval={176} snapToAlignment="start" decelerationRate="fast">
        {products.map((product) => <DiscoveryProductCard key={product.id} product={product} previewOnly={previewOnly} />)}
      </ScrollView>
      {previewOnly && (!discovery.hasLocation || discovery.isError) && <View className="mt-4"><RegionalSectionState {...discovery} loadingLabel="Loading discovery products" emptyMessage="No discovery stock available yet." /></View>}
    </View>
  );
}
