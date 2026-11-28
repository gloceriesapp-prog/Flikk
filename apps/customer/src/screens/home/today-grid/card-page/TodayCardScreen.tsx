// A Today grid card's own page: same look as the Fresh category page
// (full-bleed banner, floating back button), then the card's title and its
// products. Banner = the card's page artwork from admin (Today grid > Cards >
// Page banner), else the grid's header artwork.
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCopyImage } from '../../../../api/appConfig';
import { ScreenStatusBar as StatusBar } from '../../../../components/ScreenStatusBar';
import { useCollectionBottomPadding } from '../../../../navigation/home/useCollectionBottomPadding';
import type { AppStackParamList } from '../../../../navigation/types';
import { useLocationStore } from '../../../../store/useLocationStore';
import { FloatingBackButton } from '../../category-page/components/FloatingBackButton';
import { HomeCategoryBanner } from '../../category-page/components/HomeCategoryBanner';
import { BrowseLoadingText, BROWSE_LOADING_COPY } from '../../loading/BrowseLoadingText';
import { ProductCard } from '../../products/ProductCard';
import { DEFAULT_HEADER_IMAGE, HEADER_IMAGE_KEY } from '../TodayGridSection';
import { loadCardPageProducts } from './cardProducts';

const SIDE = 12;
const COLUMNS = 3;

export function TodayCardScreen({ route, navigation }: NativeStackScreenProps<AppStackParamList, 'TodayCard'>) {
  const { card } = route.params;
  const isFocused = useIsFocused();
  const { width } = useWindowDimensions();
  const paddingBottom = useCollectionBottomPadding(112);
  const location = useLocationStore((s) => s.location);
  const headerImage = useCopyImage(HEADER_IMAGE_KEY, DEFAULT_HEADER_IMAGE);
  const products = useQuery({
    queryKey: ['home', 'today-grid', 'card-page', card.id, location?.latitude, location?.longitude],
    queryFn: ({ signal }) => loadCardPageProducts(card, signal),
    staleTime: 60_000,
  });
  const tile = Math.floor((width - SIDE * 2) / COLUMNS);

  return (
    <View className="flex-1 bg-white">
      {isFocused && <StatusBar style="dark" />}
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom }} bounces={false} overScrollMode="never" contentInsetAdjustmentBehavior="never">
        <HomeCategoryBanner imageUri={card.bannerUrl ?? headerImage} bottomEdge="straight" />
        <Text accessibilityRole="header" className="px-4 pb-3 text-[22px] font-semibold tracking-[-0.4px] text-ink">{card.title}</Text>
        {products.isPending ? (
          <View className="py-16"><BrowseLoadingText message={BROWSE_LOADING_COPY.all} /></View>
        ) : products.isError || !products.data?.length ? (
          <View className="items-center gap-4 px-6 py-16">
            <Text className="text-center text-sm text-ink/60">{products.isError ? 'We couldn’t load these items.' : 'These items just sold out. Check back soon.'}</Text>
            <Pressable accessibilityRole="button" onPress={products.isError ? () => void products.refetch() : () => navigation.goBack()} className="min-h-11 justify-center rounded-2xl bg-[#F3F4F6] px-5">
              <Text className="font-semibold text-ink">{products.isError ? 'Try again' : 'Back to Home'}</Text>
            </Pressable>
          </View>
        ) : (
          <View className="flex-row flex-wrap" style={{ paddingHorizontal: SIDE }} testID="today-card-products">
            {products.data.map((product) => (
              <View key={product.id} className="px-1 pb-5" style={{ width: tile }}>
                <ProductCard product={product} widthClassName="w-full" showDiscountBadge={card.target.type === 'action' && card.target.id === 'offers'} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <FloatingBackButton onPress={() => navigation.goBack()} />
    </View>
  );
}
