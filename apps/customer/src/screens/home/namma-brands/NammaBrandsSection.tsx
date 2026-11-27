// Namma Brands (Home, All tab, above the welcome card): a light-blue rounded
// card, inset 10 pt from the screen edges, with the admin's header image and up to six local-brand cards
// (3 per row). Each card shows the brand name and 1-2 product photos.
// Each white card leads with its offer pill ("Up to | 20% OFF"), then the
// brand name, then the photos sitting on the card's foot.
// Tapping a card opens that brand's page. Hidden when switched off or under MIN_CARDS cards.
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
const MARGIN = 10;
const SIDE = 10;
const GAP = 8;
const RADIUS = 20;
const COLUMNS = 3;
const DEFAULT_HEADER = 'https://images.gloceries.com/appsui/Namma.png';
// Title: 2 lines of 14 px (fixed so every card in a row lines up).
const TITLE_HEIGHT = 36;
// Photo area height as a share of the card width.
const PHOTO_AREA = 0.62;
const PILL_HEIGHT = 20;

// Every title on two lines, like the reference: split at the space that
// leaves the two lines closest in length ("Shetty Masala" -> "Shetty" /
// "Masala"). One-word names, and titles with their own line break, stay as is.
export function twoLineTitle(title: string): string {
  const text = title.trim().replace(/\s+/g, ' ');
  if (text.includes('\n')) return text;
  const spaces = [...text.matchAll(/ /g)].map((match) => match.index!);
  if (!spaces.length) return text;
  const split = spaces.reduce((best, at) => (Math.abs(text.length - 2 * at) < Math.abs(text.length - 2 * best) ? at : best));
  return `${text.slice(0, split)}\n${text.slice(split + 1)}`;
}

// Splits the API's pill ("Upto 20% Off", "Starting from ₹35") into a quiet
// lead and a bold value for the two-tone pill. Anything else is all value.
export function pillParts(pill: string | null | undefined): { lead: string; value: string } | null {
  const text = pill?.trim();
  if (!text) return null;
  const off = /^up\s*to\s+(.+)$/i.exec(text);
  if (off) return { lead: 'Up to', value: off[1].toUpperCase() };
  const from = /^starting\s+(?:from|at)\s+(.+)$/i.exec(text);
  if (from) return { lead: 'Starting at', value: from[1] };
  return { lead: '', value: text };
}

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

// ponytail: temporary preview — shows the 5-card dummy bento instead of live
// cards. Flip to false (or delete DEMO_*) once the admin cards are ready.
export const NAMMA_DEMO = true;

// enabled: the home_sections row is live (from useHomeSections), so a
// switched-off block never even shows its loading skeleton.
export function NammaBrandsSection({ enabled, demo = NAMMA_DEMO }: { enabled: boolean; demo?: boolean }) {
  const query = useNammaBrands(enabled && !demo);
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  if (!enabled) return null;
  if (demo) return <NammaBrandsBento headerImageUrl={DEFAULT_HEADER} hero={DEMO_HERO} cards={DEMO_CARDS} />;
  const data = query.data;
  if (!query.isPending && (!data?.enabled || data.cards.length < MIN_CARDS)) return null;
  if (query.isPending || !data) return <NammaBrandsSkeleton />;
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
            accessibilityLabel={card.pill ? `${card.title}, ${card.pill}` : card.title} testID={`namma-card-${card.brand.id}`}
            className="items-center overflow-hidden rounded-[18px] border border-[#E6ECF7] bg-white active:opacity-90" style={{ width: cardWidth }}>
            <OfferPill pill={card.pill} />
            <Text numberOfLines={2} className="px-1.5 pt-1.5 text-center text-[14px] font-extrabold leading-[17px] tracking-[-0.2px] text-ink"
              style={{ height: TITLE_HEIGHT + 4 }}>{twoLineTitle(card.title)}</Text>
            <CardPhotos urls={card.imageUrls} width={cardWidth} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const IMG = (id: string) => `https://images.gloceries.com/products/${id}.webp`;
export interface NammaHeroCard { title: string; name: string; price: number; originalPrice: number; imageUrl: string }
export interface NammaDemoCard { id: string; title: string; pill: string; imageUrls: string[] }
const DEMO_HERO: NammaHeroCard = {
  title: 'Oils &\nGhee', name: 'Coconut Oil', price: 180, originalPrice: 260,
  imageUrl: IMG('9da2eadc-3110-4c61-959b-2b36bda175ac'),
};
const DEMO_CARDS: NammaDemoCard[] = [
  { id: 'beauty', title: 'Beauty &\nPersonal Care', pill: 'Upto 15% Off', imageUrls: [IMG('9848aeaa-51e0-4982-937e-8f3ce0799b03'), IMG('c52e9e8a-262f-4cbe-ae51-9fb34b8b5a4c')] },
  { id: 'snacks', title: 'Snacks &\nBakery', pill: 'Starting from ₹60', imageUrls: [IMG('433025b2-66c4-42b7-a194-0510abc87113'), IMG('098919e6-348d-4ced-81c6-ff6e81d80c34')] },
  { id: 'staples', title: 'Rice, Atta\n& Dal', pill: 'Upto 12% Off', imageUrls: [IMG('87b2e4d4-b080-4e6c-8216-8486aada4d67')] },
  { id: 'health', title: 'Health &\nWellness', pill: 'Upto 10% Off', imageUrls: [IMG('f13cd75e-d20a-4813-aa28-909882bd94cc'), IMG('59080a64-95cc-4e6b-9e05-060a247793a7')] },
];

// Bento: one tall deal card on the left (a single product's price drop)
// beside a 2x2 grid of offer cards, all three columns the same width.
export function NammaBrandsBento({ headerImageUrl, hero, cards }: { headerImageUrl: string; hero: NammaHeroCard; cards: NammaDemoCard[] }) {
  const [blockWidth, setBlockWidth] = useState<number | null>(null);
  const cardWidth = useCardWidth(blockWidth);
  // Reference proportions: near-square small cards, one tall card spanning both rows.
  const cardHeight = Math.round(cardWidth * 0.97);
  const titleSize = Math.max(11, Math.round(cardWidth * 0.11));
  const titleLineHeight = Math.ceil(titleSize * 1.1);
  const titleHeight = titleLineHeight * 2 + 8;
  const pillHeight = Math.max(15, Math.round(cardWidth * 0.15));
  const photoHeight = Math.max(1, cardHeight - titleHeight - pillHeight - 8);
  return (
    <View onLayout={(event) => setBlockWidth(event.nativeEvent.layout.width)} style={BLOCK_STYLE}>
      <AppImage source={{ uri: headerImageUrl }} style={{ width: '100%', aspectRatio: 3 }} resizeMode="contain" accessibilityLabel="Namma Brands" />
      <View className="mt-2 flex-row" style={{ gap: GAP, paddingHorizontal: SIDE }}>
        <HeroCard hero={hero} width={cardWidth} height={cardHeight * 2 + GAP} />
        <View className="flex-row flex-wrap" style={{ width: cardWidth * 2 + GAP, gap: GAP }}>
          {cards.slice(0, 4).map((card) => (
            <View key={card.id} accessibilityLabel={`${card.title.replace('\n', ' ')}, ${card.pill}`} testID={`namma-demo-${card.id}`}
              className="items-center overflow-hidden rounded-[18px] border border-[#E6ECF7] bg-white" style={{ width: cardWidth, height: cardHeight }}>
              <OfferPill pill={card.pill} height={pillHeight} />
              <Text numberOfLines={2} className="px-1.5 pt-1.5 text-center font-extrabold tracking-[-0.2px] text-ink"
                style={{ height: titleHeight, fontSize: titleSize, lineHeight: titleLineHeight }}>{card.title}</Text>
              <CardPhotos urls={card.imageUrls} width={cardWidth} photoHeight={photoHeight} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// Tall deal card: category title, the old price struck through on a soft
// chip, the new price big on a brand-blue chip, the product name, and its
// photo filling the foot.
function HeroCard({ hero, width, height }: { hero: NammaHeroCard; width: number; height: number }) {
  return (
    <View accessibilityLabel={`${hero.name}, now ₹${hero.price}, was ₹${hero.originalPrice}`}
      className="items-center overflow-hidden rounded-[18px] border border-[#E6ECF7] bg-white px-1.5 pt-3" style={{ width, height }}>
      <Text numberOfLines={2} className="text-center text-[15px] font-black leading-[18px] tracking-[-0.3px] text-ink">{hero.title}</Text>
      <View className="mt-3 rounded-md bg-[#F1F3F6] px-1.5 py-0.5">
        <Text className="text-[12px] font-semibold text-[#6B7280] line-through">₹{hero.originalPrice.toLocaleString('en-IN')}</Text>
      </View>
      <View className="mt-1 rounded-[10px] bg-[#155DFC] px-2.5 py-1">
        <Text className="text-[20px] font-black tracking-[-0.4px] text-white">₹{hero.price.toLocaleString('en-IN')}</Text>
      </View>
      <Text numberOfLines={2} className="mt-1.5 text-center text-[13px] font-bold leading-[16px] text-ink">{hero.name}</Text>
      <View className="w-full flex-1 justify-end pb-2">
        <AppImage source={{ uri: hero.imageUrl }} resizeMode="contain" accessible={false} style={{ width: '100%', height: '100%', flex: 1 }} />
      </View>
    </View>
  );
}

// Two-tone pill hanging from the card's top edge: a soft blue lead and a
// solid brand-blue value. Keeps its height without a pill so titles line up.
function OfferPill({ pill, height = PILL_HEIGHT }: { pill: string; height?: number }) {
  const parts = pillParts(pill);
  if (!parts) return <View style={{ height }} />;
  const textStyle = height === PILL_HEIGHT ? undefined : { fontSize: Math.min(10.5, height * 0.525), lineHeight: height };
  return (
    <View className="flex-row items-center overflow-hidden rounded-b-[10px]" style={{ height }}>
      {parts.lead ? <Text numberOfLines={1} className="h-full bg-[#EAF1FF] pl-2 pr-1.5 text-[10px] font-bold leading-[20px] text-[#155DFC]" style={textStyle}>{parts.lead}</Text> : null}
      <Text numberOfLines={1} className="h-full bg-[#155DFC] px-2 text-[10.5px] font-black leading-[20px] text-white" style={textStyle}>{parts.value}</Text>
    </View>
  );
}

// Product photos (720x810), contained and bottom-aligned at one height so
// every card matches; two photos overlap slightly side by side.
function CardPhotos({ urls, width, photoHeight: suppliedHeight }: { urls: string[]; width: number; photoHeight?: number }) {
  const height = suppliedHeight ?? Math.round(width * PHOTO_AREA);
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
          <View key={i} className="items-stretch overflow-hidden rounded-[18px] bg-white" style={{ width: cardWidth }}>
            <View className="w-16 self-center rounded-b-[10px] bg-[#EAF1FF]" style={{ height: PILL_HEIGHT }} />
            <View className="mx-3 mt-2 h-3.5 rounded bg-[#E6EAF0]" />
            <View className="mx-5 mt-1.5 h-3.5 rounded bg-[#E6EAF0]" />
            <View className="mx-4 mb-2 mt-3 rounded-xl bg-[#EEF1F5]" style={{ height: Math.round(cardWidth * PHOTO_AREA) - 16 }} />
          </View>
        ))}
      </View>
    </View>
  );
}
