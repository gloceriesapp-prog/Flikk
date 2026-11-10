import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { DEFAULT_PREORDER_BANNER } from '../../../../../../packages/home-content/sectionLayout.js';
import { AppImage } from '../../../components/AppImage';
import { bookingDates, dayOpen } from '../../../store/preorder';
import { HomeProductCollectionButton } from '../components/HomeSectionButton';
import { ProductCard } from '../products/ProductCard';
import { usePreorders } from './usePreorders';

const PREVIEW_LIMIT = 4;
const CARD_WIDTH = 'w-32';
const CARD_SNAP_INTERVAL = 128 + 12;
const WARM_BEIGE = '#F1E3D8';

export function PreorderSection({ title, bannerImageUrl }: { title: string; bannerImageUrl?: string | null }) {
  const { data } = usePreorders();
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

  return (
    <View className="mx-4 mt-7 overflow-hidden rounded-[22px] pb-3" style={{ backgroundColor: WARM_BEIGE }}>
      <AppImage
        source={{ uri: banner }}
        style={{ width: '100%', aspectRatio: 4 }}
        resizeMode="cover"
        accessibilityLabel={title || 'Pre-order now'}
        onError={() => { if (banner !== DEFAULT_PREORDER_BANNER) setFailedBanner(banner); }}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="items-start gap-3 px-5 pt-3"
        snapToInterval={CARD_SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
      >
        {preview.map((product) => (
          <ProductCard key={product.id} product={product} widthClassName={CARD_WIDTH} />
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
