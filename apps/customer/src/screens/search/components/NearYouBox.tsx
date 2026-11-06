// Search screen "Available near you": one outlined box with a banner on top
// and the products as a rail inside it (the Instamart collection layout).
// Banner art comes from admin App content (search.nearYou.imageUrl); until one
// is set, the same space shows a plain panel with the title.
import { ScrollView, Text, View } from 'react-native';
import { useCopy, useCopyImage } from '../../../api/appConfig';
import { AppImage as Image } from '../../../components/AppImage';
import { ProductCard } from '../../home/products/ProductCard';
import type { Product } from '../../home/products/types';

const BANNER_HEIGHT = 150;
const CARD_WIDTH = 'w-32';
const CARD_SNAP_INTERVAL = 128 + 10;

export function NearYouBox({ products }: { products: Product[] }) {
  const title = useCopy('search.nearYou.title');
  const banner = useCopyImage('search.nearYou.imageUrl', '');
  return (
    <View className="overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white" style={{ marginHorizontal: 20 }}>
      <View style={{ height: BANNER_HEIGHT, backgroundColor: '#EDF7FF' }}>
        {banner ? (
          <Image source={{ uri: banner }} accessibilityLabel={title} className="h-full w-full" resizeMode="cover" />
        ) : (
          <View className="flex-1 justify-end px-5 pb-4">
            <Text className="text-[22px] font-bold tracking-tight text-ink">{title}</Text>
          </View>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="items-start gap-2.5 px-4 pb-4 pt-4"
        snapToInterval={CARD_SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
      >
        {products.map((product) => (
          <ProductCard key={product.id} product={product} widthClassName={CARD_WIDTH} showDiscountBadge />
        ))}
      </ScrollView>
    </View>
  );
}
