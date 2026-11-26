// Namma Brands (Home, All tab, above the welcome card): a light-blue block
// edge to edge with the admin's header image and up to six local-brand cards
// (3 per row). Each card shows the brand, 1-2 product photos and a pill whose
// text the server computes from live prices near the customer. Tapping a card
// opens that brand's page. Hidden when switched off or under MIN_CARDS cards.
import { useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fetchNammaBrands, type NammaBrandCard } from '../../../api/brands';
import { AppImage } from '../../../components/AppImage';
import { useLocationStore } from '../../../store/useLocationStore';
import { actionColors } from '../../../theme/tokens';
import type { AppStackParamList } from '../../../navigation/types';
import { welcomeBannerRatio } from '../welcome-banner/HomeWelcomeBanner';

export const NAMMA_BG = '#DCE8FF';
export const MIN_CARDS = 3;
const SIDE = 16;
const GAP = 10;
const COLUMNS = 3;
const DEFAULT_HEADER = 'https://images.gloceries.com/appsui/Namma.png';
// Title: 2 lines of 15 px (fixed so every card in a row lines up).
const TITLE_HEIGHT = 38;

export function useNammaBrands(enabled: boolean) {
  const location = useLocationStore((s) => s.location);
  return useQuery({
    queryKey: ['home', 'namma-brands', location?.latitude, location?.longitude],
    queryFn: ({ signal }) => fetchNammaBrands(signal),
    enabled: enabled && !!location,
    staleTime: 60_000,
    gcTime: 30 * 60_000,
  });
}

// enabled: the home_sections row is live (from useHomeSections), so a
// switched-off block never even shows its loading skeleton.
export function NammaBrandsSection({ enabled }: { enabled: boolean }) {
  const query = useNammaBrands(enabled);
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  if (!enabled) return null;
  if (query.isPending) return <NammaBrandsSkeleton />;
  const data = query.data;
  if (!data?.enabled || data.cards.length < MIN_CARDS) return null;
  return (
    <NammaBrandsBlock headerImageUrl={data.headerImageUrl ?? DEFAULT_HEADER} cards={data.cards}
      onOpen={(card) => navigation.navigate('BrandProducts', { brand: card.brand })} />
  );
}

export function NammaBrandsBlock({ headerImageUrl, cards, onOpen }: { headerImageUrl: string; cards: NammaBrandCard[]; onOpen: (card: NammaBrandCard) => void }) {
  const [blockWidth, setBlockWidth] = useState<number | null>(null);
  const cardWidth = useCardWidth(blockWidth);
  const [ratio, setRatio] = useState(3);
  return (
    <View onLayout={(event) => setBlockWidth(event.nativeEvent.layout.width)}
      style={{ backgroundColor: NAMMA_BG, paddingVertical: 16, paddingHorizontal: SIDE }}>
      <AppImage source={{ uri: headerImageUrl }} style={{ width: '100%', aspectRatio: ratio }} resizeMode="contain"
        accessibilityLabel="Namma Brands" onLoad={(event) => {
          const next = welcomeBannerRatio(event.source.width, event.source.height);
          if (next && next !== ratio) setRatio(next);
        }} />
      <View className="mt-3 flex-row flex-wrap" style={{ gap: GAP }}>
        {cards.slice(0, 6).map((card) => (
          <Pressable key={card.brand.id} onPress={() => onOpen(card)} accessibilityRole="button"
            accessibilityLabel={`${card.title}, ${card.pill}`} testID={`namma-card-${card.brand.id}`}
            className="overflow-hidden rounded-2xl bg-white active:opacity-90" style={{ width: cardWidth }}>
            <Text numberOfLines={2} className="px-2 pt-2 text-center text-[15px] font-semibold leading-[19px] text-ink"
              style={{ height: TITLE_HEIGHT + 8 }}>{card.title}</Text>
            <CardPhotos urls={card.imageUrls} width={cardWidth} />
            <View className="items-center px-1.5 py-1.5" style={{ backgroundColor: actionColors.fill }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} className="text-[13px] font-semibold text-white">{card.pill}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// Product photos (720x810), contained and bottom-aligned at one height so
// every card matches; two photos overlap slightly side by side.
function CardPhotos({ urls, width }: { urls: string[]; width: number }) {
  const height = Math.round(width * 0.78);
  const photoWidth = urls.length > 1 ? Math.round(width * 0.56) : Math.round(width * 0.7);
  const photoHeight = Math.round(photoWidth * 810 / 720);
  return (
    <View className="flex-row items-end justify-center overflow-hidden" style={{ height }}>
      {urls.slice(0, 2).map((uri, index) => (
        <AppImage key={uri} source={{ uri }} resizeMode="contain" accessible={false}
          style={{ width: photoWidth, height: Math.min(photoHeight, height), marginLeft: index ? -photoWidth * 0.18 : 0 }} />
      ))}
    </View>
  );
}

// Three cards across the block's own width (the screen width until measured).
function useCardWidth(blockWidth: number | null = null) {
  const { width } = useWindowDimensions();
  return Math.floor(((blockWidth ?? width) - SIDE * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
}

// Same layout in grey while the block loads.
export function NammaBrandsSkeleton() {
  const cardWidth = useCardWidth();
  return (
    <View accessibilityLabel="Loading Namma Brands" style={{ backgroundColor: NAMMA_BG, paddingVertical: 16, paddingHorizontal: SIDE }}>
      <View className="rounded-2xl bg-white/60" style={{ width: '100%', aspectRatio: 3 }} />
      <View className="mt-3 flex-row flex-wrap" style={{ gap: GAP }}>
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} className="overflow-hidden rounded-2xl bg-white" style={{ width: cardWidth }}>
            <View className="mx-3 mt-3 h-3.5 rounded bg-[#E6EAF0]" />
            <View className="mx-5 mt-1.5 h-3.5 rounded bg-[#E6EAF0]" />
            <View className="mx-4 mb-2 mt-3 rounded-xl bg-[#EEF1F5]" style={{ height: Math.round(cardWidth * 0.78) - 16 }} />
            <View className="h-7 bg-[#D7E2F7]" />
          </View>
        ))}
      </View>
    </View>
  );
}
