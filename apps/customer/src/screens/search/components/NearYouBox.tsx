// Search screen "Available near you": one outlined box, as wide as the search
// bar (16px gutter, SearchHeader px-4), with a banner on top
// and the products as a rail inside it (the Instamart collection layout).
// The banner is the coastal Udupi sunrise artwork unless admin App content
// sets another (search.nearYou.imageUrl). The title sits bottom-left on a
// soft white backing so the title stays readable over the darker foreground.
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCopy, useCopyImage } from '../../../api/appConfig';
import { AppImage as Image } from '../../../components/AppImage';
import { ProductCard } from '../../home/products/ProductCard';
import type { Product } from '../../home/products/types';

const BANNER_HEIGHT = 150;
const CARD_WIDTH = 'w-32';
const CARD_SNAP_INTERVAL = 128 + 10;
export const NEAR_YOU_BANNER = 'https://images.gloceries.com/appsui/Coastal%20Udupi%20Grocery%20Sunrise.png';

export function NearYouBox({ products }: { products: Product[] }) {
  const title = useCopy('search.nearYou.title');
  const banner = useCopyImage('search.nearYou.imageUrl', NEAR_YOU_BANNER);
  return (
    <View className="overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white" style={{ marginHorizontal: 13 }}>
      <View style={{ height: BANNER_HEIGHT, backgroundColor: '#FBE9D7' }}>
        <Image source={{ uri: banner || NEAR_YOU_BANNER }} accessible={false} className="h-full w-full" resizeMode="cover" contentPosition="bottom center" />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
          locations={[0, 0.38, 0.62]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.titleBacking}
        />
        <View pointerEvents="none" className="absolute bottom-0 left-0 px-5 pb-4" style={{ maxWidth: '62%' }}>
          <Text accessibilityRole="header" className={`${Platform.OS === 'ios' ? 'text-[24px] leading-[29px]' : 'text-[22px] leading-[27px]'} font-bold tracking-tight text-ink`}>{title}</Text>
        </View>
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

const styles = StyleSheet.create({
  titleBacking: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 90 },
});
