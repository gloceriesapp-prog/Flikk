import { HORIZONTAL_PRODUCT_CARD_GAP, horizontalProductCardWidth } from '../products/horizontalProductLayout';
import { useState } from 'react';
import { ScrollView, View , useWindowDimensions } from 'react-native';
import { DEFAULT_PREORDER_BANNER } from '../../../../../../packages/home-content/sectionLayout.js';
import { AppImage } from '../../../components/AppImage';
import { HomeProductCollectionButton } from '../components/HomeSectionButton';
import { ProductCard } from '../products/ProductCard';
import { usePreorders } from './usePreorders';
import { openPreorderProducts } from './openPreorders';

const PREVIEW_LIMIT = 4;
export const PREORDER_BACKGROUND = '#E7F2FC';

export function PreorderSection({ title, bannerImageUrl }: { title: string; bannerImageUrl?: string | null }) {
  const { width: viewportWidth } = useWindowDimensions();
  const cardWidth = horizontalProductCardWidth(viewportWidth);
  const { data } = usePreorders();
  const [failedBanner, setFailedBanner] = useState<string>();
  const banner = bannerImageUrl && bannerImageUrl !== failedBanner ? bannerImageUrl : DEFAULT_PREORDER_BANNER;
  const products = openPreorderProducts(data);
  if (!products.length) return null;

  const preview = products.slice(0, PREVIEW_LIMIT);

  return (
    <View className="mx-4 mt-7 overflow-hidden rounded-3xl pb-4" style={{ backgroundColor: PREORDER_BACKGROUND }}>
      <AppImage
        source={{ uri: banner }}
        style={{ width: '100%', aspectRatio: 3.4 }}
        resizeMode="cover"
        accessibilityLabel={title || 'Pre-order now'}
        onError={() => { if (banner !== DEFAULT_PREORDER_BANNER) setFailedBanner(banner); }}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="items-start px-4 pt-4"
        contentContainerStyle={{ gap: HORIZONTAL_PRODUCT_CARD_GAP }}
        snapToInterval={cardWidth + HORIZONTAL_PRODUCT_CARD_GAP}
        snapToAlignment="start"
        decelerationRate="fast"
      >
        {preview.map((product) => (
          <View key={product.id} style={{ width: cardWidth }}>
            <ProductCard product={product} widthClassName="w-full" />
          </View>
        ))}
      </ScrollView>

      {products.length > PREVIEW_LIMIT && (
        <HomeProductCollectionButton
          label="See all"
          title={title || 'Pre-orders'}
          products={products}
          preview={preview}
          plain
        />
      )}
    </View>
  );
}
