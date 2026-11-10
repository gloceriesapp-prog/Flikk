import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { DEFAULT_PREORDER_BANNER } from '../../../../../../packages/home-content/sectionLayout.js';
import { AppImage } from '../../../components/AppImage';
import { bookingDates, dayOpen } from '../../../store/preorder';
import { HomeProductCollectionButton } from '../components/HomeSectionButton';
import { ProductCard } from '../products/ProductCard';
import { usePreorders } from './usePreorders';

const PREVIEW_LIMIT = 4;
const CARD_GAP = 10;
const WARM_BEIGE = '#F1E3D8';

export function PreorderSection({ title, bannerImageUrl }: { title: string; bannerImageUrl?: string | null }) {
  const { data } = usePreorders();
  const { width } = useWindowDimensions();
  const [failedBanner, setFailedBanner] = useState<string>();
  const banner = bannerImageUrl && bannerImageUrl !== failedBanner ? bannerImageUrl : DEFAULT_PREORDER_BANNER;
  const now = new Date();
  const dates = bookingDates(now);
  const slots = data?.slots ?? [];
  const products = (data?.products ?? []).filter((product) =>
    product.isAvailable !== false &&
    dates.some((date) => dayOpen(date, product.preorder?.leadDays ?? 0, slots, now)),
  );
  if (!products.length) return null;

  const preview = products.slice(0, PREVIEW_LIMIT);
  // The panel has 16pt outer margins and the rail has 12pt insets.
  const cardWidth = Math.max(92, Math.min(128, Math.floor((width - 56 - CARD_GAP * 2) / 3)));

  return (
    <View className="mx-4 mt-7 overflow-hidden rounded-[22px] pb-3" style={{ backgroundColor: WARM_BEIGE }}>
      <View className="relative">
        <AppImage
          source={{ uri: banner }}
          style={{ width: '100%', aspectRatio: 4 }}
          resizeMode="cover"
          accessibilityLabel={title || 'Pre-order now'}
          onError={() => { if (banner !== DEFAULT_PREORDER_BANNER) setFailedBanner(banner); }}
        />
        <LinearGradient
          pointerEvents="none"
          colors={[WARM_BEIGE + '00', WARM_BEIGE]}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 16 }}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'stretch', gap: CARD_GAP, paddingHorizontal: 12, paddingTop: 10 }}
        snapToInterval={cardWidth + CARD_GAP}
        snapToAlignment="start"
        decelerationRate="fast"
      >
        {preview.map((product) => (
          <View key={product.id} className="overflow-hidden rounded-2xl bg-white p-2" style={{ width: cardWidth }}>
            <ProductCard product={product} widthClassName="w-full" showDiscountBadge />
          </View>
        ))}
      </ScrollView>

      {products.length > PREVIEW_LIMIT && (
        <HomeProductCollectionButton
          label="See all"
          title={title || 'Pre-orders'}
          products={products}
          preview={preview}
          showDiscountBadge
          plain
        />
      )}
    </View>
  );
}
