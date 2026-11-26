// Namma Brands (Home, All tab, above the welcome card): a light-blue rounded
// card, inset 16 pt from the screen edges, with the admin's header image and up to six local-brand cards
// (3 per row). Each card shows the brand name and 1-2 product photos.
// Tapping a card opens that brand's page. Hidden when switched off or under MIN_CARDS cards.
// (The API still returns each card's price pill; the card doesn't show it.)
import { useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fetchNammaBrands, type NammaBrandCard } from '../../../api/brands';
import { AppImage } from '../../../components/AppImage';
import { useLocationStore } from '../../../store/useLocationStore';
import type { AppStackParamList } from '../../../navigation/types';
import { welcomeBannerRatio } from '../welcome-banner/HomeWelcomeBanner';

// Same light blue as the default header image's own background, so the
// header blends into the card.
export const NAMMA_BG = '#D0E0FD';
export const MIN_CARDS = 3;
// Inset from the screen edges, and the block's own inner padding.
const MARGIN = 16;
const SIDE = 12;
const GAP = 10;
const RADIUS = 20;
const COLUMNS = 3;
const DEFAULT_HEADER = 'https://images.gloceries.com/appsui/Namma.png';
// Title: 2 lines of 14 px (fixed so every card in a row lines up).
const TITLE_HEIGHT = 36;
// Photo area height as a share of the card width.
const PHOTO_AREA = 0.62;

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
    <View onLayout={(event) => setBlockWidth(event.nativeEvent.layout.width)} style={BLOCK_STYLE}>
      <AppImage source={{ uri: headerImageUrl }} style={{ width: '100%', aspectRatio: ratio }} resizeMode="contain"
        accessibilityLabel="Namma Brands" onLoad={(event) => {
          const next = welcomeBannerRatio(event.source.width, event.source.height);
          if (next && next !== ratio) setRatio(next);
        }} />
      <View className="mt-2 flex-row flex-wrap" style={{ gap: GAP, paddingHorizontal: SIDE }}>
        {cards.slice(0, 6).map((card) => (
          <Pressable key={card.brand.id} onPress={() => onOpen(card)} accessibilityRole="button"
            accessibilityLabel={card.title} testID={`namma-card-${card.brand.id}`}
            className="overflow-hidden rounded-2xl bg-white active:opacity-90" style={{ width: cardWidth }}>
            <Text numberOfLines={2} className="px-2 pt-2 text-center text-[14px] font-semibold leading-[18px] text-ink"
              style={{ height: TITLE_HEIGHT + 8 }}>{card.title}</Text>
            <CardPhotos urls={card.imageUrls} width={cardWidth} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// Product photos (720x810), contained and bottom-aligned at one height so
// every card matches; two photos overlap slightly side by side.
function CardPhotos({ urls, width }: { urls: string[]; width: number }) {
  const height = Math.round(width * PHOTO_AREA);
  const photoWidth = urls.length > 1 ? Math.round(width * 0.5) : Math.round(width * 0.62);
  const photoHeight = Math.round(photoWidth * 810 / 720);
  return (
    <View className="flex-row items-end justify-center overflow-hidden pb-2" style={{ height: height + 8 }}>
      {urls.slice(0, 2).map((uri, index) => (
        <AppImage key={uri} source={{ uri }} resizeMode="contain" accessible={false}
          style={{ width: photoWidth, height: Math.min(photoHeight, height), marginLeft: index ? -photoWidth * 0.18 : 0 }} />
      ))}
    </View>
  );
}

// Three cards across the block's own width (screen minus its margins until
// measured).
function useCardWidth(blockWidth: number | null = null) {
  const { width } = useWindowDimensions();
  return Math.floor(((blockWidth ?? width - MARGIN * 2) - SIDE * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
}

// The header image runs edge to edge across the card, flush with its top;
// only the brand cards below it are padded.
const BLOCK_STYLE = {
  backgroundColor: NAMMA_BG, marginHorizontal: MARGIN, marginTop: 12, borderRadius: RADIUS, overflow: 'hidden' as const,
  paddingBottom: SIDE,
};

// Same layout in grey while the block loads.
export function NammaBrandsSkeleton() {
  const cardWidth = useCardWidth();
  return (
    <View accessibilityLabel="Loading Namma Brands" style={BLOCK_STYLE}>
      <View className="bg-white/60" style={{ width: '100%', aspectRatio: 3 }} />
      <View className="mt-2 flex-row flex-wrap" style={{ gap: GAP, paddingHorizontal: SIDE }}>
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} className="overflow-hidden rounded-2xl bg-white" style={{ width: cardWidth }}>
            <View className="mx-3 mt-3 h-3.5 rounded bg-[#E6EAF0]" />
            <View className="mx-5 mt-1.5 h-3.5 rounded bg-[#E6EAF0]" />
            <View className="mx-4 mb-2 mt-3 rounded-xl bg-[#EEF1F5]" style={{ height: Math.round(cardWidth * PHOTO_AREA) - 16 }} />
          </View>
        ))}
      </View>
    </View>
  );
}
