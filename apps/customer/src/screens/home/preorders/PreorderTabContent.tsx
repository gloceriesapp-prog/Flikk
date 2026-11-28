// Home's Pre-order tab: every pre-order product open for booking near the
// pin, three to a row under the pre-order banner.
import { Text, View } from 'react-native';
import { DEFAULT_PREORDER_BANNER } from '../../../../../../packages/home-content/sectionLayout.js';
import { AppImage } from '../../../components/AppImage';
import { ProductCard } from '../products/ProductCard';
import { SectionSkeleton } from '../loading/SectionSkeleton';
import { usePreorders } from './usePreorders';
import { openPreorderProducts } from './openPreorders';
import { PREORDER_BACKGROUND } from './PreorderSection';

export function PreorderTabContent() {
  const { data, isPending } = usePreorders();
  const products = openPreorderProducts(data);
  return (
    <View className="pb-6 pt-4">
      <View className="mx-4 overflow-hidden rounded-3xl" style={{ backgroundColor: PREORDER_BACKGROUND }}>
        <AppImage source={{ uri: DEFAULT_PREORDER_BANNER }} style={{ width: '100%', aspectRatio: 3.4 }} resizeMode="cover" accessibilityLabel="Pre-order now" />
      </View>
      {isPending ? <SectionSkeleton /> : products.length ? (
        <View className="mt-4 flex-row flex-wrap justify-between gap-y-5 px-4">
          {products.map((product) => <ProductCard key={product.id} product={product} widthClassName="w-[31.5%]" />)}
        </View>
      ) : (
        <View className="items-center px-8 py-12">
          <Text className="text-center text-[17px] font-bold text-ink">No pre-orders open right now</Text>
          <Text className="mt-1 text-center text-[14px] font-medium text-ink/55">Shops near you will list book-ahead items here.</Text>
        </View>
      )}
    </View>
  );
}
